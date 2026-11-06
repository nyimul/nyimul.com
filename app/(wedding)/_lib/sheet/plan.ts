/**
 * Works out what one sheet sync changes in the database, without touching it.
 *
 * The Google Sheet is the source of truth for WHO is invited to WHAT. The database is the source
 * of truth for what guests answered. So the sync must change the guest list without losing
 * anyone's RSVP, which is why it matches carefully:
 *   - Each row carries a "Website ID" (the party id). The Apps Script fills it in for new rows.
 *   - People are matched by name, then by "close enough" (a typo fix keeps that person's RSVP).
 *   - Open spots (Invites beyond the names) are matched by position, keeping any name a guest typed in.
 *   - A row that no longer has room for people who already said yes waits, with a note, instead
 *     of removing them.
 *   - A row that disappears hides the party ("archived"); nothing is deleted, and putting the row
 *     back (Version history) brings it back with its RSVPs.
 *   - If many rows disappear at once, the sync refuses to run. Someone probably deleted a block of
 *     rows or sorted part of the sheet.
 * Every problem becomes a sentence in that row's "Website notes" cell.
 */
import "server-only";
import { normalizeName, similarNames } from "../names";
import type { DbGuest, DbInvitation, SheetPlan, Snapshot } from "../store/types";
import type { EventId } from "../types";
import { EVENT_IDS, SEAT_COLUMN, type Family, type ParsedGuest, type ParsedRow } from "./rows";

/** More removals than this in one sync needs "Publish and allow removals". */
export const REMOVAL_LIMIT = 10;

export type RowNote = { family: Family; row: number; id: string; note: string };
export type IdChange = { family: Family; row: number; from: string; to: string };

export type PlanResult =
  | { refused: true; message: string }
  | {
      refused: false;
      plan: SheetPlan;
      changes: number;
      notes: RowNote[];
      /** Website IDs the Apps Script must rewrite (copied rows, reconnected rows). */
      idChanges: IdChange[];
      /** Which family's tab each party in the sheet is on, for the Summary and RSVPs tabs. */
      families: Map<string, Family>;
      published: number;
      needAttention: number;
      removed: string[];
      /** Only with allowRemovals: invitations that lost people who had said yes. */
      removedYes: string[];
    };

const people = (n: number) => (n === 1 ? "1 person" : `${n} people`);

const sameIds = (a: string[] | null, b: string[] | null) =>
  a === null || b === null ? a === b : a.length === b.length && [...a].sort().join() === [...b].sort().join();

const namedOf = (guests: ParsedGuest[]) =>
  guests.flatMap((g) => (g.kind === "named" ? [g.fullName] : []));

// ---------- The plan ----------

export function planSheetSync(
  snapshot: Snapshot,
  parsedRows: ParsedRow[],
  opts: { allowRemovals: boolean; newId: () => string },
): PlanResult {
  const partiesById = new Map(snapshot.parties.map((p) => [p.id, p]));
  const guestsByParty = new Map<string, DbGuest[]>();
  for (const g of snapshot.guests) {
    const list = guestsByParty.get(g.partyId) ?? [];
    list.push(g);
    guestsByParty.set(g.partyId, list);
  }
  for (const list of guestsByParty.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
  const invitationsByParty = new Map<string, Map<EventId, DbInvitation>>();
  for (const inv of snapshot.invitations) {
    const m = invitationsByParty.get(inv.partyId) ?? new Map<EventId, DbInvitation>();
    m.set(inv.eventId, inv);
    invitationsByParty.set(inv.partyId, m);
  }
  const saidYes = new Set(snapshot.rsvps.filter((r) => r.attending).map((r) => r.guestId));
  const attending = new Set(snapshot.rsvps.filter((r) => r.attending).map((r) => `${r.guestId}|${r.eventId}`));

  const dbNamedOf = (partyId: string) =>
    (guestsByParty.get(partyId) ?? []).flatMap((g) => (!g.isSlot && g.fullName ? [g.fullName] : []));

  /** Is this sheet row plausibly the same invitation as this database party? */
  const sameParty = (partyId: string, row: ParsedRow) => {
    const db = partiesById.get(partyId);
    if (!db) return false;
    if (similarNames(db.displayName, row.displayName)) return true;
    const dbNames = dbNamedOf(partyId);
    return namedOf(row.guests).some((n) => dbNames.some((d) => similarNames(d, n)));
  };

  const rows = parsedRows.map((r) => ({ ...r, prefix: "" }));
  const idChanges: IdChange[] = [];

  // 1. Copied rows: two rows with one Website ID. The row that matches the database keeps it;
  //    the others become new invitations with fresh IDs.
  const byId = new Map<string, typeof rows>();
  for (const r of rows) byId.set(r.id, [...(byId.get(r.id) ?? []), r]);
  for (const [id, group] of byId) {
    if (group.length < 2) continue;
    const keeper = group.find((r) => sameParty(id, r)) ?? group[0];
    for (const r of group) {
      if (r === keeper) continue;
      const fresh = opts.newId();
      idChanges.push({ family: r.family, row: r.row, from: r.id, to: fresh });
      r.id = fresh;
      r.prefix = "Copied row, so it got its own Website ID. ";
    }
  }

  // 2. Reconnect: a row with an unknown ID (its Website ID cell was cleared or retyped) that
  //    clearly is a party no longer in the sheet: same invitation name AND a guest in common.
  const sheetIds = new Set(rows.map((r) => r.id));
  const reconnected = new Set<string>();
  for (const r of rows) {
    if (partiesById.has(r.id)) continue;
    const rowName = normalizeName(r.displayName);
    const rowGuests = new Set(namedOf(r.guests).map(normalizeName));
    const candidates = snapshot.parties.filter(
      (p) =>
        !sheetIds.has(p.id) &&
        !reconnected.has(p.id) &&
        normalizeName(p.displayName) === rowName &&
        dbNamedOf(p.id).some((n) => rowGuests.has(normalizeName(n))),
    );
    const active = candidates.filter((p) => !p.archived);
    const pick = active.length === 1 ? active[0] : active.length === 0 && candidates.length === 1 ? candidates[0] : null;
    if (!pick) continue;
    idChanges.push({ family: r.family, row: r.row, from: r.id, to: pick.id });
    sheetIds.delete(r.id);
    sheetIds.add(pick.id);
    reconnected.add(pick.id);
    r.id = pick.id;
    r.prefix = "Reconnected to its earlier invitation. ";
  }

  // 3. Row by row.
  const plan: SheetPlan = {
    upsertParties: [],
    deleteRsvps: [],
    deleteInvitations: [],
    deleteGuestIds: [],
    upsertNamedGuests: [],
    upsertSlots: [],
    upsertInvitations: [],
    archivePartyIds: [],
  };
  const notes: RowNote[] = [];
  const removed: string[] = [];
  const removedYes: string[] = [];
  const families = new Map(rows.map((r) => [r.id, r.family]));
  let published = 0;
  let needAttention = 0;

  for (const r of rows) {
    const db = partiesById.get(r.id);
    const note = (text: string) => notes.push({ family: r.family, row: r.row, id: r.id, note: r.prefix + text });
    const refuse = (why: string) => {
      needAttention++;
      note(db && !db.archived ? `Not updated: ${why} The website still shows the earlier version.` : `Not on the website yet: ${why}`);
    };

    if (r.errors.length > 0) {
      refuse(r.errors.join(" "));
      continue;
    }

    if (db && !sameParty(r.id, r)) {
      needAttention++;
      note(
        `Not updated: this row's Website ID belongs to a different invitation ("${db.displayName}"). ` +
          "If the sheet was just sorted one column at a time, undo that (Edit > Undo, or File > Version history). " +
          "If you copied this row from another one, clear its Website ID cell.",
      );
      continue;
    }

    const invited = EVENT_IDS.filter((e) => r.seats[e] !== undefined);
    if (invited.length === 0) {
      if (db && !db.archived) {
        plan.archivePartyIds.push(db.id);
        removed.push(db.displayName);
        note("Taken off the website: it isn't invited to any event.");
      } else {
        note("Not on the website yet: put an x under at least one event.");
      }
      continue;
    }

    const currentGuests = guestsByParty.get(r.id) ?? [];
    const diff = diffGuests(r.id, currentGuests, r.guests, opts.newId, saidYes);
    const { namedIds, slotIds } = diff;

    // Lowering Invites doesn't look like removing someone, so it never removes people who already
    // said yes without asking. The row waits, with a note that stays until it's sorted out.
    const openYes = currentGuests.filter((g) => g.isSlot && saidYes.has(g.id) && !namedIds.includes(g.id));
    const wouldLose = openYes.filter((g) => diff.deleteGuestIds.includes(g.id)).length;
    if (wouldLose > 0) {
      if (!opts.allowRemovals) {
        const room = openYes.length - wouldLose;
        refuse(
          `${people(openYes.length)} not listed in Guest names already said yes, but this row now has ` +
            `${room === 0 ? "no room for them" : `room for only ${room} of them`}. ` +
            `Set Invites to ${namedIds.length + openYes.length} or more to keep them, or ask the family to change their RSVP first.`,
        );
        continue;
      }
      r.prefix += `Removed ${people(wouldLose)} not listed in Guest names who had said yes. `;
      removedYes.push(`${r.displayName} (${wouldLose})`);
    }

    // Publish this row.
    published++;
    if (!db || db.archived || db.displayName !== r.displayName || db.othersNeedNamed !== r.othersNeedNamed) {
      plan.upsertParties.push({ id: r.id, displayName: r.displayName, othersNeedNamed: r.othersNeedNamed });
    }
    plan.upsertNamedGuests.push(...diff.upsertNamedGuests);
    plan.upsertSlots.push(...diff.upsertSlots);
    plan.deleteGuestIds.push(...diff.deleteGuestIds);
    const keptGuestIds = [...namedIds, ...slotIds];
    const keptSet = new Set(keptGuestIds);

    const warnings = [...r.warnings];
    const had = invitationsByParty.get(r.id) ?? new Map<EventId, DbInvitation>();
    for (const eventId of EVENT_IDS) {
      const seats = r.seats[eventId];
      const before = had.get(eventId);
      if (seats !== undefined) {
        const only = r.only[eventId];
        const guestIds = only ? [...only.named.map((i) => namedIds[i]), ...slotIds.slice(0, only.openSpots)] : null;
        if (!before || before.maxGuests !== seats || !sameIds(before.guestIds, guestIds)) {
          plan.upsertInvitations.push({ partyId: r.id, eventId, maxGuests: seats, guestIds });
        }
        // People who could come before but not any more (e.g. the Nikkah is now "Farid" only) lose that RSVP.
        const allowed = new Set(guestIds ?? keptGuestIds);
        const droppedOut = (before?.guestIds ?? currentGuests.map((g) => g.id)).filter((g) => keptSet.has(g) && !allowed.has(g));
        if (before && droppedOut.length > 0) plan.deleteRsvps.push({ eventId, guestIds: droppedOut });

        // The x went in after they replied. Their answer stays, so say so rather than hide it.
        const comes = (g: string) => allowed.has(g) && attending.has(`${g}|${eventId}`);
        if (r.othersNeedNamed && namedIds.some((g) => allowed.has(g)) && !namedIds.some(comes) && slotIds.some(comes)) {
          warnings.push(`Only the others said yes to the ${SEAT_COLUMN[eventId]}, with no one named coming. That still counts until they change it.`);
        }
      } else if (before !== undefined) {
        plan.deleteInvitations.push({ partyId: r.id, eventId });
        const guestIds = (guestsByParty.get(r.id) ?? []).map((g) => g.id);
        if (guestIds.length > 0) plan.deleteRsvps.push({ eventId, guestIds });
      }
    }

    if (warnings.length > 0) needAttention++;
    note(warnings.length > 0 ? `✓ On the website. Check: ${warnings.join(" ")}` : "✓ On the website");
  }

  // 4. Parties no longer in the sheet at all.
  for (const p of snapshot.parties) {
    if (!p.archived && !sheetIds.has(p.id)) {
      plan.archivePartyIds.push(p.id);
      removed.push(p.displayName);
    }
  }

  const activeCount = snapshot.parties.filter((p) => !p.archived).length;
  if (!opts.allowRemovals && rows.length === 0 && activeCount > 0) {
    return {
      refused: true,
      message:
        "Both guest lists look empty, so nothing was changed. If you really want to take every invitation off the website, use Website > Publish and allow removals.",
    };
  }
  if (!opts.allowRemovals && removed.length > REMOVAL_LIMIT) {
    const examples = removed.slice(0, 3).map((n) => `"${n}"`).join(", ");
    return {
      refused: true,
      message:
        `${removed.length} invitations would be taken off the website (${examples} and more), so nothing was changed. ` +
        "If rows were deleted by accident, use File > Version history to get them back. " +
        "If it's on purpose, use Website > Publish and allow removals.",
    };
  }

  const changes =
    plan.upsertParties.length +
    plan.deleteRsvps.length +
    plan.deleteInvitations.length +
    plan.deleteGuestIds.length +
    plan.upsertNamedGuests.length +
    plan.upsertSlots.length +
    plan.upsertInvitations.length +
    plan.archivePartyIds.length;

  return { refused: false, plan, changes, notes, idChanges, families, published, needAttention, removed, removedYes };
}

/**
 * Matches the row's people to the party's current guests and works out the differences, without
 * applying them. Returns the guest id for each named person and each open spot, in the row's order.
 */
function diffGuests(
  partyId: string,
  current: DbGuest[],
  wanted: ParsedGuest[],
  newId: () => string,
  /** Guests who said yes to something. */
  coming: Set<string>,
) {
  const namedIds: string[] = [];
  const slotIds: string[] = [];
  const upsertNamedGuests: SheetPlan["upsertNamedGuests"] = [];
  const upsertSlots: SheetPlan["upsertSlots"] = [];
  const used = new Set<string>();

  // Named people: exact name first, then close spellings (keeps a renamed person's RSVP).
  const named = wanted.flatMap((g) => (g.kind === "named" ? [g] : []));
  const currentNamed = current.filter((g) => !g.isSlot && g.fullName);
  const match: (DbGuest | undefined)[] = named.map(() => undefined);
  named.forEach((g, i) => {
    const n = normalizeName(g.fullName);
    const m = currentNamed.find((c) => !used.has(c.id) && normalizeName(c.fullName!) === n);
    if (m) {
      match[i] = m;
      used.add(m.id);
    }
  });
  named.forEach((g, i) => {
    if (match[i]) return;
    const m = currentNamed.find((c) => !used.has(c.id) && similarNames(c.fullName!, g.fullName));
    if (m) {
      match[i] = m;
      used.add(m.id);
    }
  });
  // A name a guest typed on their RSVP, now added to Guest names: the same person, not a second
  // one. They stop being an open spot and keep their RSVP.
  const typedSpots = current.filter((g) => g.isSlot && g.fullName);
  named.forEach((g, i) => {
    if (match[i]) return;
    const m = typedSpots.find((c) => !used.has(c.id) && similarNames(c.fullName!, g.fullName));
    if (m) {
      match[i] = m;
      used.add(m.id);
    }
  });

  let sortOrder = 0;
  named.forEach((g, i) => {
    sortOrder++;
    const m = match[i];
    if (!m) {
      const id = newId();
      namedIds.push(id);
      upsertNamedGuests.push({ id, partyId, fullName: g.fullName, isChild: g.isChild, sortOrder });
      return;
    }
    namedIds.push(m.id);
    if (m.isSlot || m.fullName !== g.fullName || m.isChild !== g.isChild || m.sortOrder !== sortOrder) {
      upsertNamedGuests.push({ id: m.id, partyId, fullName: g.fullName, isChild: g.isChild, sortOrder });
    }
  });

  // Open spots: by position within adults and within children. When there are fewer spots than
  // before, the ones a guest already used (named, or said yes) are kept first.
  const slots = wanted.flatMap((g) => (g.kind === "slot" ? [g] : []));
  const unused = (g: DbGuest) => Number(!(g.fullName || coming.has(g.id)));
  for (const isChild of [false, true]) {
    const pool = current
      .filter((g) => g.isSlot && g.isChild === isChild && !used.has(g.id))
      .sort((a, b) => unused(a) - unused(b) || a.sortOrder - b.sortOrder);
    let k = 0;
    slots.forEach((s, j) => {
      if (s.isChild !== isChild) return;
      const order = named.length + j + 1;
      const m = pool[k++];
      if (!m) {
        const id = newId();
        slotIds[j] = id;
        upsertSlots.push({ id, partyId, isChild, sortOrder: order });
        return;
      }
      used.add(m.id);
      slotIds[j] = m.id;
      if (m.sortOrder !== order) upsertSlots.push({ id: m.id, partyId, isChild, sortOrder: order });
    });
  }

  const deleteGuestIds = current.filter((g) => !used.has(g.id)).map((g) => g.id);
  return { namedIds, slotIds, upsertNamedGuests, upsertSlots, deleteGuestIds };
}
