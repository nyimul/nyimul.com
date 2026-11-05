/**
 * Works out what one sheet sync changes in the database, without touching it.
 *
 * The Google Sheet is the source of truth for WHO is invited to WHAT. The database is the source
 * of truth for what guests answered. So the sync must change the guest list without losing
 * anyone's RSVP, which is why it matches carefully:
 *   - Each row carries a "Website ID" (the party id). The Apps Script fills it in for new rows.
 *   - People are matched by name, then by "close enough" (a typo fix keeps that person's RSVP).
 *   - +1 slots are matched by position, keeping any name a guest already typed in.
 *   - A row that disappears hides the party ("archived"); nothing is deleted, and putting the row
 *     back (Version history) brings it back with its RSVPs.
 *   - If many rows disappear at once, the sync refuses to run. Someone probably deleted a block of
 *     rows or sorted part of the sheet.
 * Every problem becomes a sentence in that row's "Website notes" cell.
 */
import "server-only";
import { normalizeName } from "../names";
import type { DbGuest, SheetPlan, Snapshot } from "../store/types";
import type { EventId } from "../types";
import { EVENT_IDS, SEAT_COLUMN, type ParsedGuest, type ParsedRow } from "./rows";

/** More removals than this in one sync needs "Publish and allow removals". */
export const REMOVAL_LIMIT = 10;

export type RowNote = { row: number; id: string; note: string };
export type IdChange = { row: number; from: string; to: string };

export type PlanResult =
  | { refused: true; message: string }
  | {
      refused: false;
      plan: SheetPlan;
      changes: number;
      notes: RowNote[];
      /** Website IDs the Apps Script must rewrite (copied rows, reconnected rows). */
      idChanges: IdChange[];
      published: number;
      needAttention: number;
      removed: string[];
    };

// ---------- Name matching ----------

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const wordsWithin = (small: string, big: string) => {
  const words = new Set(big.split(" "));
  return small.split(" ").every((w) => words.has(w));
};

/**
 * Same person, spelled a little differently: "Nadia Karim" / "Nadiya Karim", "Omar Rahman" /
 * "Omar F Rahman". Short names get less slack, so "Sam Lee" and "Tom Lee" stay two people.
 */
export function similarNames(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  const len = Math.max(x.length, y.length);
  const slack = len < 8 ? 1 : len < 14 ? 2 : 3;
  return x === y || levenshtein(x, y) <= slack || wordsWithin(x, y) || wordsWithin(y, x);
}

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
  const invitationsByParty = new Map<string, Map<EventId, number>>();
  for (const inv of snapshot.invitations) {
    const m = invitationsByParty.get(inv.partyId) ?? new Map<EventId, number>();
    m.set(inv.eventId, inv.maxGuests);
    invitationsByParty.set(inv.partyId, m);
  }
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
      idChanges.push({ row: r.row, from: r.id, to: fresh });
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
    idChanges.push({ row: r.row, from: r.id, to: pick.id });
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
  let published = 0;
  let needAttention = 0;

  for (const r of rows) {
    const db = partiesById.get(r.id);
    const note = (text: string) => notes.push({ row: r.row, id: r.id, note: r.prefix + text });

    if (r.errors.length > 0) {
      needAttention++;
      note(
        db && !db.archived
          ? `Not updated: ${r.errors.join(" ")} The website still shows the earlier version.`
          : `Not on the website yet: ${r.errors.join(" ")}`,
      );
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
        note("Taken off the website: no event has seats.");
      } else {
        note("Not on the website yet: give at least one event a number of seats.");
      }
      continue;
    }

    // Publish this row.
    published++;
    if (!db || db.archived || db.displayName !== r.displayName) {
      plan.upsertParties.push({ id: r.id, displayName: r.displayName });
    }
    const keptGuestIds = diffGuests(r.id, guestsByParty.get(r.id) ?? [], r.guests, plan, opts.newId);

    const warnings = [...r.warnings];
    const had = invitationsByParty.get(r.id) ?? new Map<EventId, number>();
    for (const eventId of EVENT_IDS) {
      const seats = r.seats[eventId];
      const before = had.get(eventId);
      if (seats !== undefined) {
        if (before !== seats) plan.upsertInvitations.push({ partyId: r.id, eventId, maxGuests: seats });
        const coming = keptGuestIds.filter((g) => attending.has(`${g}|${eventId}`)).length;
        if (coming > seats) {
          warnings.push(
            `${coming} people already said yes to the ${SEAT_COLUMN[eventId]}, but it now has ${seats} ${seats === 1 ? "seat" : "seats"}.`,
          );
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
        "The Guest List looks empty, so nothing was changed. If you really want to take every invitation off the website, use Website > Publish and allow removals.",
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

  return { refused: false, plan, changes, notes, idChanges, published, needAttention, removed };
}

/**
 * Matches the row's people to the party's current guests and adds the differences to `plan`.
 * Returns the ids of the guests that remain (matched or new).
 */
function diffGuests(
  partyId: string,
  current: DbGuest[],
  wanted: ParsedGuest[],
  plan: SheetPlan,
  newId: () => string,
): string[] {
  const kept: string[] = [];
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

  let sortOrder = 0;
  named.forEach((g, i) => {
    sortOrder++;
    const m = match[i];
    if (!m) {
      const id = newId();
      kept.push(id);
      plan.upsertNamedGuests.push({ id, partyId, fullName: g.fullName, isChild: g.isChild, sortOrder });
      return;
    }
    kept.push(m.id);
    if (m.fullName !== g.fullName || m.isChild !== g.isChild || m.sortOrder !== sortOrder) {
      plan.upsertNamedGuests.push({ id: m.id, partyId, fullName: g.fullName, isChild: g.isChild, sortOrder });
    }
  });

  // Slots (+1, unnamed child): by position within adults and within children. When there are
  // fewer slots than before, the ones a guest already filled in are kept first.
  const slots = wanted.flatMap((g) => (g.kind === "slot" ? [g] : []));
  for (const isChild of [false, true]) {
    const pool = current
      .filter((g) => g.isSlot && g.isChild === isChild)
      .sort((a, b) => Number(!a.fullName) - Number(!b.fullName) || a.sortOrder - b.sortOrder);
    let k = 0;
    slots.forEach((s, j) => {
      if (s.isChild !== isChild) return;
      const order = named.length + j + 1;
      const m = pool[k++];
      if (!m) {
        const id = newId();
        kept.push(id);
        plan.upsertSlots.push({ id, partyId, isChild, sortOrder: order });
        return;
      }
      used.add(m.id);
      kept.push(m.id);
      if (m.sortOrder !== order) plan.upsertSlots.push({ id: m.id, partyId, isChild, sortOrder: order });
    });
  }

  for (const g of current) if (!used.has(g.id)) plan.deleteGuestIds.push(g.id);
  return kept;
}
