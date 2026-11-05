/**
 * @OnlyCurrentDoc
 *
 * The family's wedding Google Sheet <-> nyimul.com/hridee.
 *
 * Paste this whole file into the sheet's Extensions > Apps Script editor (replacing what's
 * there), save, reload the sheet, then use the new "Website" menu > "Set up". WEDDING.md,
 * section 7, has the step-by-step.
 *
 * What it does, every 10 minutes (and when you pick Website > Publish now):
 *   1. Reads the "Guest List" tab and gives each new row a Website ID.
 *   2. Sends the rows to https://<your site>/hridee/sync with the shared secret.
 *   3. Writes the website's answer back: a note per row ("Website notes" column) and the
 *      Summary, RSVPs and Messages tabs.
 * Only the columns below are sent. Anything else you add (phone, address...) never leaves the sheet.
 *
 * The 10-minute trigger runs as whoever ran Set up. The rest of the family never needs the menu.
 */

var TAB = { readMe: "Read me", guests: "Guest List", summary: "Summary", rsvps: "RSVPs", messages: "Messages" };

// Guest List columns. Matched by header text (any order, any case). The event columns must match
// SEAT_COLUMN in app/(wedding)/_lib/sheet/rows.ts.
var COL = {
  name: "Name on invite",
  guests: "Guests",
  nikkah: "Nikkah",
  holud: "Holud",
  reception: "Reception",
  notes: "Website notes",
  id: "Website ID",
};
var EVENTS = ["nikkah", "holud", "reception"];

var HEADER_NOTES = {
  name: "How the invitation is addressed, e.g. The Karim Family. One row = one invitation.",
  guests:
    "Everyone on this invitation, first and last names, separated by commas.\n" +
    "Write (child) after a child's name.\n" +
    "Add +1 for a guest they may bring, or +1 child for a child you don't have a name for.\n" +
    "Example: Farid Karim, Nadia Karim, Samir Karim (child), +1 child",
  event: "Seats at this event. Leave blank if not invited. A number like 3, or x for everyone listed.",
  notes: "Filled in by the website. ✓ means the row is live. Anything else explains what to fix.",
  id: "Filled in automatically. Don't type here.",
};

var READ_ME = [
  ["How this sheet works"],
  [""],
  ["1. Each row of Guest List is one invitation: one name on the invite, one sign-in on the website."],
  ["2. Name on invite: how the invitation is addressed, e.g. The Karim Family."],
  ["3. Guests: everyone on it, first and last names, separated by commas. Write (child) after a child's name. Add +1 for a guest they may bring, or +1 child for an unnamed child."],
  ["4. Nikkah, Holud, Reception: how many seats they have at that event. Leave blank if they're not invited. An x means everyone listed."],
  ["5. Changes reach the website by themselves within about 10 minutes. Then check the Website notes column: ✓ means it's live, anything else says what to fix."],
  ["6. Summary, RSVPs and Messages fill in by themselves from the website. Don't type in them."],
  ["7. Add any extra columns you like (phone, address, who invited them). They stay in this sheet and never go to the website."],
  ["8. Deleting a row takes that invitation off the website, but keeps their RSVP. If it was a mistake, File > Version history brings the row back, RSVP included."],
  ["9. Never edit the Website ID column."],
];

var ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var MAX_CELL = 2000;

// ---------------------------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Website")
    .addItem("Publish now", "publishNow")
    .addItem("Publish and allow removals", "publishAllowingRemovals")
    .addSeparator()
    .addItem("Set up / change settings", "setUp")
    .addToUi();
}

function publishNow() {
  publish_({ interactive: true, allowRemovals: false });
}

function publishAllowingRemovals() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert(
    "Allow removals?",
    "This publishes the Guest List even if it takes many invitations off the website at once. " +
      "Their RSVPs are kept, and putting the rows back restores them. Continue?",
    ui.ButtonSet.YES_NO
  );
  if (answer === ui.Button.YES) publish_({ interactive: true, allowRemovals: true });
}

/** Run by the 10-minute trigger. */
function scheduledPublish() {
  publish_({ interactive: false, allowRemovals: false });
}

// ---------------------------------------------------------------------------------------------
// Set up: settings, tabs, protections, the 10-minute trigger
// ---------------------------------------------------------------------------------------------

function setUp() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getScriptProperties();

  var current = props.getProperty("SITE_URL") || "https://nyimul.com";
  var urlAnswer = ui.prompt(
    "Website address",
    "The address of the wedding website, without /hridee. Leave blank to keep: " + current,
    ui.ButtonSet.OK_CANCEL
  );
  if (urlAnswer.getSelectedButton() !== ui.Button.OK) return;
  var url = cleanUrl_(urlAnswer.getResponseText() || current);

  var hasSecret = Boolean(props.getProperty("SYNC_SECRET"));
  var secretAnswer = ui.prompt(
    "Sheet secret",
    "Paste WEDDING_SHEET_SECRET from the website's settings (Vercel)." +
      (hasSecret ? " Leave blank to keep the current one." : ""),
    ui.ButtonSet.OK_CANCEL
  );
  if (secretAnswer.getSelectedButton() !== ui.Button.OK) return;
  var secret = secretAnswer.getResponseText().trim();
  if (!secret && !hasSecret) {
    ui.alert("Set up stopped: the secret is needed.");
    return;
  }
  if (secret && secret.length < 32) {
    ui.alert("Set up stopped: that secret is too short. It should be at least 32 characters.");
    return;
  }

  props.setProperty("SITE_URL", url);
  if (secret) props.setProperty("SYNC_SECRET", secret);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  setUpTabs_(ss);

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "scheduledPublish") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("scheduledPublish").timeBased().everyMinutes(10).create();

  publish_({ interactive: true, allowRemovals: false });
}

function setUpTabs_(ss) {
  // Guest List: reuse an empty first tab ("Sheet1") in a brand-new spreadsheet.
  var guests = ss.getSheetByName(TAB.guests);
  if (!guests) {
    var first = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && first.getLastRow() === 0) {
      guests = first.setName(TAB.guests);
    } else {
      guests = ss.insertSheet(TAB.guests);
    }
  }

  // Add any missing header, at the end of row 1.
  var lastCol = guests.getLastColumn();
  var header = lastCol > 0 ? guests.getRange(1, 1, 1, lastCol).getValues()[0] : [];
  var order = ["name", "guests", "nikkah", "holud", "reception", "notes", "id"];
  order.forEach(function (key) {
    if (findColumn_(header, COL[key]) === -1) {
      header.push(COL[key]);
      guests.getRange(1, header.length).setValue(COL[key]);
    }
  });
  var cols = columnsOf_(header);
  guests.setFrozenRows(1);
  guests.getRange(1, 1, 1, header.length).setFontWeight("bold");
  guests.getRange(1, cols.name + 1).setNote(HEADER_NOTES.name);
  guests.getRange(1, cols.guests + 1).setNote(HEADER_NOTES.guests);
  EVENTS.forEach(function (e) {
    guests.getRange(1, cols[e] + 1).setNote(HEADER_NOTES.event);
  });
  guests.getRange(1, cols.notes + 1).setNote(HEADER_NOTES.notes);
  guests.getRange(1, cols.id + 1).setNote(HEADER_NOTES.id);
  guests.setColumnWidth(cols.name + 1, 200);
  guests.setColumnWidth(cols.guests + 1, 360);
  guests.setColumnWidth(cols.notes + 1, 320);

  // A warning (not a lock) if someone edits the columns the website fills in.
  ["notes", "id"].forEach(function (key) {
    protectOnce_(guests.getRange(1, cols[key] + 1, guests.getMaxRows(), 1), "Filled in by the website");
  });

  // Read me, first.
  var readMe = ss.getSheetByName(TAB.readMe) || ss.insertSheet(TAB.readMe, 0);
  readMe.getRange(1, 1, READ_ME.length, 1).setValues(READ_ME);
  readMe.getRange(1, 1).setFontWeight("bold");
  readMe.setColumnWidth(1, 900);

  // The website's tabs, after Guest List.
  [TAB.summary, TAB.rsvps, TAB.messages].forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    var existing = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (existing.length === 0) {
      sheet.protect().setDescription("Filled in by the website").setWarningOnly(true);
    }
  });
}

function protectOnce_(range, description) {
  var sheet = range.getSheet();
  var already = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) {
    return p.getDescription() === description && p.getRange().getA1Notation() === range.getA1Notation();
  });
  if (!already) range.protect().setDescription(description).setWarningOnly(true);
}

// ---------------------------------------------------------------------------------------------
// Publish: Guest List -> website -> notes + Summary / RSVPs / Messages
// ---------------------------------------------------------------------------------------------

function publish_(opts) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30 * 1000)) {
    if (opts.interactive) SpreadsheetApp.getUi().alert("Another update is already running. Try again in a minute.");
    return;
  }
  try {
    var result = runPublish_(opts);
    if (opts.interactive) SpreadsheetApp.getUi().alert(result.ok ? "Done" : "Not published", result.message, SpreadsheetApp.getUi().ButtonSet.OK);
  } finally {
    lock.releaseLock();
  }
}

function runPublish_(opts) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getScriptProperties();
  var siteUrl = props.getProperty("SITE_URL");
  var secret = props.getProperty("SYNC_SECRET");
  if (!siteUrl || !secret) return failed_(ss, "The sheet isn't connected yet. Use Website > Set up.");

  var sheet = ss.getSheetByName(TAB.guests);
  if (!sheet) return failed_(ss, 'There is no "' + TAB.guests + '" tab. Use Website > Set up to create it.');

  var values = sheet.getDataRange().getValues();
  var cols = columnsOf_(values[0] || []);
  var missing = Object.keys(COL).filter(function (key) {
    return cols[key] === -1;
  });
  if (missing.length > 0) {
    return failed_(
      ss,
      "The Guest List is missing these column headers: " +
        missing.map(function (k) { return COL[k]; }).join(", ") +
        ". Nothing was sent. Put them back in row 1 (or use Website > Set up)."
    );
  }

  // 1. Collect the rows; give new rows a Website ID; blank rows lose theirs.
  var data = values.slice(1);
  var ids = [];
  var names = [];
  var rows = [];
  data.forEach(function (r, i) {
    var name = cellOut_(r[cols.name]);
    var guestText = cellOut_(r[cols.guests]);
    names.push(r[cols.name]);
    var blank = isBlank_(name) && isBlank_(guestText);
    var id = String(r[cols.id] || "").trim();
    if (blank) {
      ids.push("");
      return;
    }
    if (!ID_PATTERN.test(id)) id = Utilities.getUuid();
    id = id.toLowerCase();
    ids.push(id);
    var seats = {};
    EVENTS.forEach(function (e) {
      seats[e] = cellOut_(r[cols[e]]);
    });
    rows.push({ row: i + 2, id: id, name: name, guests: guestText, seats: seats });
  });

  var idChanged = data.some(function (r, i) {
    return String(r[cols.id] || "") !== ids[i];
  });
  if (idChanged) {
    // Nobody may have inserted or moved rows since we read them, or IDs would land on the wrong rows.
    var namesNow = data.length ? sheet.getRange(2, cols.name + 1, data.length, 1).getValues() : [];
    var moved = namesNow.some(function (r, i) {
      return String(r[0]) !== String(names[i]);
    });
    if (moved || sheet.getLastRow() !== values.length) {
      return failed_(ss, "The Guest List changed while it was being read. It will try again in a few minutes.");
    }
    sheet.getRange(2, cols.id + 1, ids.length, 1).setValues(ids.map(function (id) { return [id]; }));
  }

  // 2. Send.
  var params = {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + secret },
    payload: JSON.stringify({ rows: rows, allowRemovals: opts.allowRemovals === true }),
    muteHttpExceptions: true,
    followRedirects: false,
  };
  var bypass = props.getProperty("VERCEL_BYPASS"); // only for a protected Vercel preview deployment
  if (bypass) params.headers["x-vercel-protection-bypass"] = bypass;

  var response;
  try {
    response = UrlFetchApp.fetch(siteUrl + "/hridee/sync", params);
  } catch (e) {
    return failed_(ss, "Couldn't reach " + siteUrl + ". Is the website up? (" + e.message + ")");
  }
  var code = response.getResponseCode();
  if (code >= 300 && code < 400) {
    var to = response.getHeaders()["Location"] || response.getHeaders()["location"] || "another address";
    return failed_(ss, "The website address redirects to " + to + ". Use Website > Set up and enter that address instead.");
  }
  var body;
  try {
    body = JSON.parse(response.getContentText());
  } catch (e) {
    return failed_(ss, "The website answered with an error (" + code + "). Check that " + siteUrl + "/hridee/sync exists.");
  }
  if (!body.ok) return failed_(ss, body.message || "The website answered with an error (" + code + ").");

  // 3. Write the answer back.
  applyIdChanges_(sheet, cols, body.idChanges || []);
  writeNotes_(sheet, cols, rows, body.notes || []);
  (body.tables || []).forEach(function (table) {
    writeTable_(ss, table);
  });

  if (body.changes > 0) props.setProperty("LAST_CHANGE", now_(ss));
  setStatus_(
    ss,
    "✓ Up to date. The website checks this sheet every 10 minutes. Last change sent: " +
      (props.getProperty("LAST_CHANGE") || "none yet") + ". " + body.message
  );
  return { ok: true, message: body.message };
}

function applyIdChanges_(sheet, cols, changes) {
  if (changes.length === 0) return;
  var n = sheet.getLastRow() - 1;
  if (n < 1) return;
  var range = sheet.getRange(2, cols.id + 1, n, 1);
  var current = range.getValues();
  var dirty = false;
  changes.forEach(function (c) {
    var i = c.row - 2;
    if (i >= 0 && i < n && String(current[i][0]).toLowerCase() === c.from) {
      current[i][0] = c.to;
      dirty = true;
    }
  });
  if (dirty) range.setValues(current);
}

function writeNotes_(sheet, cols, sentRows, notes) {
  var n = sheet.getLastRow() - 1;
  if (n < 1) return;
  var ids = sheet.getRange(2, cols.id + 1, n, 1).getValues();
  var range = sheet.getRange(2, cols.notes + 1, n, 1);
  var current = range.getValues();
  var next = current.map(function (r, i) {
    // Rows that weren't sent (blank) have no note.
    return [String(ids[i][0]) === "" ? "" : r[0]];
  });
  notes.forEach(function (note) {
    var i = note.row - 2;
    // Only if the row still holds the invitation the note is about (rows may have moved).
    if (i >= 0 && i < n && String(ids[i][0]).toLowerCase() === note.id) next[i][0] = note.note;
  });
  var changed = next.some(function (r, i) {
    return String(r[0]) !== String(current[i][0]);
  });
  if (changed) range.setValues(next);
}

/** Rewrites a website tab, but only when its content changed (keeps Version history readable). */
function writeTable_(ss, table) {
  var startRow = table.name === TAB.summary ? 3 : 1; // Summary keeps a status line on top
  var sheet = ss.getSheetByName(table.name) || ss.insertSheet(table.name);
  var width = table.header.length;
  table.rows.forEach(function (r) {
    width = Math.max(width, r.length);
  });
  var values = [table.header].concat(table.rows).map(function (r) {
    var out = r.slice();
    while (out.length < width) out.push("");
    return out;
  });

  var props = PropertiesService.getScriptProperties();
  var key = "TABLE_" + table.name;
  var digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify(values)));
  var intact =
    sheet.getLastRow() === startRow + values.length - 1 &&
    String(sheet.getRange(startRow, 1).getValue()) === String(table.header[0]);
  if (props.getProperty(key) === digest && intact) return;

  var needRows = startRow + values.length - 1;
  if (needRows > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), needRows - sheet.getMaxRows() + 100);

  var lastRow = Math.max(sheet.getLastRow(), startRow);
  var lastCol = Math.max(sheet.getLastColumn(), width);
  sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).clearContent();
  sheet.getRange(startRow, 1, values.length, width).setValues(values);
  sheet.getRange(startRow, 1, 1, width).setFontWeight("bold");
  sheet.setFrozenRows(startRow);
  if (table.name === TAB.rsvps) {
    // A filter over the whole tab, so the family can pick one event or "No reply yet".
    var filter = sheet.getFilter();
    if (filter && filter.getRange().getLastRow() < needRows) {
      filter.remove();
      filter = null;
    }
    if (!filter) sheet.getRange(1, 1, sheet.getMaxRows(), width).createFilter();
  }
  props.setProperty(key, digest);
}

function setStatus_(ss, text) {
  var sheet = ss.getSheetByName(TAB.summary) || ss.insertSheet(TAB.summary);
  var cell = sheet.getRange(1, 1);
  if (String(cell.getValue()) !== text) cell.setValue(text);
}

function failed_(ss, message) {
  setStatus_(ss, "⚠ The website wasn't updated (" + now_(ss) + "): " + message);
  return { ok: false, message: message };
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

function findColumn_(header, name) {
  var want = String(name).trim().toLowerCase();
  for (var i = 0; i < header.length; i++) {
    if (String(header[i]).trim().toLowerCase() === want) return i;
  }
  return -1;
}

function columnsOf_(header) {
  var cols = {};
  Object.keys(COL).forEach(function (key) {
    cols[key] = findColumn_(header, COL[key]);
  });
  return cols;
}

/** A cell as the website expects it: text (capped), a number, a checkbox, or null. */
function cellOut_(v) {
  if (v === "" || v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (v instanceof Date) return v.toISOString();
  return String(v).slice(0, MAX_CELL);
}

function isBlank_(v) {
  return v === null || String(v).trim() === "";
}

function cleanUrl_(url) {
  url = String(url).trim().replace(/\/+$/, "").replace(/\/hridee$/, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

function now_(ss) {
  return Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "MMM d, h:mm a");
}
