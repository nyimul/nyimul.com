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
 *   1. Reads the two guest list tabs (one per family) and gives each new row a Website ID.
 *   2. Sends the rows to https://<your site>/hridee/sync with the shared secret.
 *   3. Writes the website's answer back: a note per row ("Website notes" column) and the
 *      Summary, RSVPs and Messages tabs.
 * Only the columns below are sent. Anything else you add (phone, address...) never leaves the sheet.
 *
 * The 10-minute trigger runs as whoever ran Set up. The rest of the family never needs the menu.
 */

var TAB = { readMe: "Read me", summary: "Summary", rsvps: "RSVPs", messages: "Messages" };

// One guest list tab per family. Keys and tab names must match FAMILIES / FAMILY_LABEL in
// app/(wedding)/_lib/sheet/rows.ts.
var FAMILIES = [
  { key: "nyimul", tab: "Nyimul's Family" },
  { key: "hridee", tab: "Hridee's Family" },
];
var OLD_GUEST_TAB = "Guest List"; // the first version's single tab; Set up renames it

// Guest list columns. Matched by header text (any order, any case). The event columns must match
// SEAT_COLUMN in rows.ts.
var COL = {
  name: "Family name",
  guests: "Guest names",
  invites: "Invites",
  nikkah: "Nikkah",
  holud: "Holud",
  reception: "Reception",
  needsNamed: "Others need a named guest",
  notes: "Website notes",
  id: "Website ID",
};
var COL_ORDER = ["name", "guests", "invites", "nikkah", "holud", "reception", "needsNamed", "notes", "id"];
var OLD_HEADERS = { name: ["Name on invite"], guests: ["Guests"] }; // renamed by Set up
var EVENTS = ["nikkah", "holud", "reception"];

var HEADER_NOTES = {
  name: "How the website greets them.\nExample: The Karim Family, or Sam Lee",
  guests: "The people you know by name, with commas between them.\nExample: Farid Karim, Nadia Karim",
  invites: "How many people in total, counting the ones without a name.\nExample: 5\nBlank means just the names.",
  event: "x = invited. Blank = not invited.\nOnly some of them? Type their names instead, like: Farid Karim",
  needsNamed: "Usually blank.\nx = the others can only come to an event if someone named is coming too.",
  notes: "The website fills this in. ✓ means it's on the website.",
  id: "The website fills this in. Don't type here.",
};

var READ_ME = [
  ["Wedding guest list"],
  [""],
  ["Nyimul's family: use the Nyimul's Family tab."],
  ["Hridee's family: use the Hridee's Family tab."],
  [""],
  ["One row is one invitation."],
  [""],
  ["Family name: how the website greets them, like The Karim Family."],
  ["Guest names: the people you know by name, with commas, like Farid Karim, Nadia Karim."],
  ["Invites: how many people in total, like 5. They can add the rest when they RSVP."],
  ["Nikkah, Holud, Reception: an x if they're invited, blank if not."],
  ["Only some of them invited to an event? Type their names there instead of an x."],
  ["Others need a named guest: usually blank. An x means the others can only come if someone named is coming too."],
  [""],
  ["Leave Website notes and Website ID alone. A ✓ in Website notes means it's on the website."],
  ["Changes go to the website by themselves within 10 minutes."],
  ["Summary, RSVPs and Messages fill in by themselves."],
  [""],
  ["Made a mistake? File > Version history."],
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
    "This publishes the guest lists even if it takes many invitations off the website at once, " +
      "or removes people who already said yes.\n\n" +
      "Invitations taken off keep their RSVPs, and putting the rows back restores them. " +
      "People removed because a row has no room for them lose their RSVP for good.\n\nContinue?",
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

  var current = props.getProperty("SITE_URL") || "https://www.nyimul.com";
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
  FAMILIES.forEach(function (fam, i) {
    var sheet = ss.getSheetByName(fam.tab);
    if (!sheet) {
      // The first family takes over the old single "Guest List" tab, or an empty "Sheet1".
      var old = i === 0 ? ss.getSheetByName(OLD_GUEST_TAB) : null;
      var first = ss.getSheets()[0];
      if (old) sheet = old.setName(fam.tab);
      else if (i === 0 && ss.getSheets().length === 1 && first.getLastRow() === 0) sheet = first.setName(fam.tab);
      else sheet = ss.insertSheet(fam.tab);
    }
    setUpGuestTab_(sheet);
  });

  // Read me: written once. After that it's yours to edit; delete the tab to get this text back.
  if (!ss.getSheetByName(TAB.readMe)) {
    var readMe = ss.insertSheet(TAB.readMe, 0);
    readMe.getRange(1, 1, READ_ME.length, 1).setValues(READ_ME);
    readMe.getRange(1, 1).setFontWeight("bold").setFontSize(14);
    readMe.setColumnWidth(1, 700);
  }

  // The website's tabs. A warning (not a lock) if someone types in them.
  [TAB.summary, TAB.rsvps, TAB.messages].forEach(function (name) {
    var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET).length === 0) {
      sheet.protect().setDescription("Filled in by the website").setWarningOnly(true);
    }
  });

  // Tab order: Read me, the two families, then the website's tabs.
  var order = [TAB.readMe].concat(FAMILIES.map(function (f) { return f.tab; }), [TAB.summary, TAB.rsvps, TAB.messages]);
  order.forEach(function (name, i) {
    var sheet = ss.getSheetByName(name);
    if (sheet && sheet.getIndex() !== i + 1) {
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(i + 1);
    }
  });
  ss.setActiveSheet(ss.getSheetByName(FAMILIES[0].tab));
}

function setUpGuestTab_(sheet) {
  var lastCol = sheet.getLastColumn();
  var header = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  // Headers from the first version get their new names.
  Object.keys(OLD_HEADERS).forEach(function (key) {
    if (findColumn_(header, COL[key]) !== -1) return;
    OLD_HEADERS[key].some(function (old) {
      var i = findColumn_(header, old);
      if (i === -1) return false;
      sheet.getRange(1, i + 1).setValue(COL[key]);
      header[i] = COL[key];
      return true;
    });
  });

  if (header.every(isBlank_)) {
    sheet.getRange(1, 1, 1, COL_ORDER.length).setValues([COL_ORDER.map(function (k) { return COL[k]; })]);
  } else {
    // A missing column goes right after the one before it, so an old tab gets Invites after Guest names.
    COL_ORDER.forEach(function (key, k) {
      if (findColumn_(header, COL[key]) !== -1) return;
      var prev = -1;
      for (var j = k - 1; j >= 0 && prev === -1; j--) prev = findColumn_(header, COL[COL_ORDER[j]]);
      if (prev === -1) sheet.insertColumnBefore(1);
      else sheet.insertColumnAfter(prev + 1);
      sheet.getRange(1, prev + 2).setValue(COL[key]);
      header.splice(prev + 1, 0, COL[key]);
    });
  }

  header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var cols = columnsOf_(header);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, header.length).setFontWeight("bold");
  ["name", "guests", "invites", "needsNamed", "notes", "id"].forEach(function (key) {
    sheet.getRange(1, cols[key] + 1).setNote(HEADER_NOTES[key]);
  });
  EVENTS.forEach(function (e) {
    sheet.getRange(1, cols[e] + 1).setNote(HEADER_NOTES.event);
  });
  sheet.setColumnWidth(cols.name + 1, 200);
  sheet.setColumnWidth(cols.guests + 1, 320);
  sheet.setColumnWidth(cols.notes + 1, 320);

  ["notes", "id"].forEach(function (key) {
    protectOnce_(sheet.getRange(1, cols[key] + 1, sheet.getMaxRows(), 1), "Filled in by the website");
  });

  // Website notes: show the whole note, and turn "Not updated" / "Not on the website yet" red.
  var notes = sheet.getRange(2, cols.notes + 1, sheet.getMaxRows() - 1, 1);
  notes.setWrap(true);
  var others = sheet.getConditionalFormatRules().filter(function (rule) {
    var condition = rule.getBooleanCondition();
    return !(condition && condition.getCriteriaType() === SpreadsheetApp.BooleanCriteria.TEXT_STARTS_WITH && condition.getCriteriaValues()[0] === "Not ");
  });
  var red = SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith("Not ").setBackground("#f8d7da").setRanges([notes]).build();
  sheet.setConditionalFormatRules(others.concat([red]));
}

function protectOnce_(range, description) {
  var sheet = range.getSheet();
  var already = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) {
    return p.getDescription() === description && p.getRange().getA1Notation() === range.getA1Notation();
  });
  if (!already) range.protect().setDescription(description).setWarningOnly(true);
}

// ---------------------------------------------------------------------------------------------
// Publish: guest lists -> website -> notes + Summary / RSVPs / Messages
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

  // Both tabs or nothing: sending one family alone would take the other's invitations off the website.
  var tabs = [];
  for (var f = 0; f < FAMILIES.length; f++) {
    var fam = FAMILIES[f];
    var sheet = ss.getSheetByName(fam.tab);
    if (!sheet) return failed_(ss, 'There is no "' + fam.tab + '" tab. Use Website > Set up to create it.');
    var values = sheet.getDataRange().getValues();
    var cols = columnsOf_(values[0] || []);
    var missing = COL_ORDER.filter(function (key) { return cols[key] === -1; });
    if (missing.length > 0) {
      return failed_(
        ss,
        'The "' + fam.tab + '" tab is missing these column headers: ' +
          missing.map(function (k) { return COL[k]; }).join(", ") +
          ". Nothing was sent. Put them back in row 1 (or use Website > Set up)."
      );
    }
    tabs.push({ family: fam.key, tab: fam.tab, sheet: sheet, values: values, cols: cols });
  }

  // 1. Collect the rows; give new rows a Website ID; blank rows lose theirs.
  var rows = [];
  for (var t = 0; t < tabs.length; t++) {
    var problem = collectRows_(tabs[t], rows);
    if (problem) return failed_(ss, problem);
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
    var location = response.getHeaders()["Location"] || response.getHeaders()["location"] || "";
    var origin = (String(location).match(/^https?:\/\/[^\/]+/i) || [])[0];
    return failed_(ss, origin
      ? "The website address redirects to " + origin + ". Use Website > Set up and enter " + origin + " instead."
      : "The website address redirects somewhere else. Check the address in Website > Set up.");
  }
  var body;
  try {
    body = JSON.parse(response.getContentText());
  } catch (e) {
    return failed_(ss, "The website answered with an error (" + code + "). Check that " + siteUrl + "/hridee/sync exists.");
  }
  if (!body.ok) return failed_(ss, body.message || "The website answered with an error (" + code + ").");

  // 3. Write the answer back.
  tabs.forEach(function (tab) {
    var mine = function (x) { return x.family === tab.family; };
    applyIdChanges_(tab.sheet, tab.cols, (body.idChanges || []).filter(mine));
    writeNotes_(tab.sheet, tab.cols, (body.notes || []).filter(mine));
  });
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

/** Adds one tab's rows to `rows`. Returns a problem to report, or null. */
function collectRows_(tab, rows) {
  var sheet = tab.sheet;
  var cols = tab.cols;
  var data = tab.values.slice(1);
  var ids = [];
  var names = [];
  data.forEach(function (r, i) {
    var name = cellOut_(r[cols.name]);
    var guestText = cellOut_(r[cols.guests]);
    names.push(r[cols.name]);
    var id = String(r[cols.id] || "").trim();
    if (isBlank_(name) && isBlank_(guestText)) {
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
    rows.push({
      family: tab.family,
      row: i + 2,
      id: id,
      name: name,
      guests: guestText,
      invites: cellOut_(r[cols.invites]),
      needsNamed: cellOut_(r[cols.needsNamed]),
      seats: seats,
    });
  });

  var idChanged = data.some(function (r, i) {
    return String(r[cols.id] || "") !== ids[i];
  });
  if (!idChanged) return null;
  // Nobody may have inserted or moved rows since we read them, or IDs would land on the wrong rows.
  var namesNow = data.length ? sheet.getRange(2, cols.name + 1, data.length, 1).getValues() : [];
  var moved = namesNow.some(function (r, i) {
    return String(r[0]) !== String(names[i]);
  });
  if (moved || sheet.getLastRow() !== tab.values.length) {
    return 'The "' + tab.tab + '" tab changed while it was being read. It will try again in a few minutes.';
  }
  sheet.getRange(2, cols.id + 1, ids.length, 1).setValues(ids.map(function (id) { return [id]; }));
  return null;
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

function writeNotes_(sheet, cols, notes) {
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
  var bold = table.boldRows || [];
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
  var digest = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, JSON.stringify([values, bold])));
  var intact =
    sheet.getLastRow() === startRow + values.length - 1 &&
    String(sheet.getRange(startRow, 1).getValue()) === String(table.header[0]);
  if (props.getProperty(key) === digest && intact) return;

  var needRows = startRow + values.length - 1;
  if (needRows > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), needRows - sheet.getMaxRows() + 100);

  var lastRow = Math.max(sheet.getLastRow(), startRow);
  var lastCol = Math.max(sheet.getLastColumn(), width);
  sheet.getRange(startRow, 1, lastRow - startRow + 1, lastCol).clearContent().setFontWeight("normal");
  sheet.getRange(startRow, 1, values.length, width).setValues(values);
  sheet.getRange(startRow, 1, 1, width).setFontWeight("bold");
  bold.forEach(function (i) {
    sheet.getRange(startRow + 1 + i, 1, 1, width).setFontWeight("bold");
  });
  sheet.setFrozenRows(startRow);
  if (table.name === TAB.rsvps) {
    // A filter over the whole tab, so the family can pick one family, one event, or "No reply yet".
    var filter = sheet.getFilter();
    if (filter && (filter.getRange().getLastRow() < needRows || filter.getRange().getLastColumn() !== width)) {
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
  url = String(url).trim().replace(/\/+$/, "").replace(/\/hridee(\/sync)?$/i, "");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  return url;
}

function now_(ss) {
  return Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "MMM d, h:mm a");
}
