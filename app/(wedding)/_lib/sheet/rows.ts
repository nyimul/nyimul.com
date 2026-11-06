/**
 * Reading the family's Google Sheet (the "Nyimul's Family" and "Hridee's Family" tabs), one row
 * at a time.
 *
 * The sheet is typed by people, not machines, so this is forgiving: it accepts "x", "yes" or a
 * ticked checkbox for "invited", and explains every problem in plain words. Those words end up
 * in the row's "Website notes" cell, so they're written for the parents.
 *
 * One row:  Name on invite | Guest names | Invites | Nikkah | Holud | Reception
 *   Guest names  the people they know by name: "Farid Karim, Nadia Karim"
 *   Invites      how many people in total (blank = just the names). Any invite without a name
 *                is an open spot: the family says on the RSVP form how many of those are coming.
 *   Event cells  x = everyone on the invitation; names = only those people ("Farid Karim", or
 *                "Farid Karim, +1"); blank = not invited. There are no seat numbers: a number
 *                doesn't say who, and seats always equal the people invited to that event.
 *   Others need a named guest  usually blank. x = open spots can't come to an event unless
 *                someone named is coming to it. Applies to every event on the row.
 *
 * The column names and tab names here must match the ones in scripts/wedding-sheet.gs.
 */
import "server-only";
import { z } from "zod";
import { events } from "../content";
import { normalizeName, similarNames } from "../names";
import type { EventId } from "../types";

/** Event ids in the order the site shows them, and the sheet column for each. */
export const EVENT_IDS: EventId[] = events.map((e) => e.id);
export const SEAT_COLUMN: Record<EventId, string> = { nikkah: "Nikkah", holud: "Holud", reception: "Reception" };

/** One guest list tab per family. The labels are the tab names in the sheet. */
export const FAMILIES = ["nyimul", "hridee"] as const;
export type Family = (typeof FAMILIES)[number];
export const FAMILY_LABEL: Record<Family, string> = { nyimul: "Nyimul's Family", hridee: "Hridee's Family" };

const MAX_PEOPLE = 40;

// A cell, as Apps Script's getValues() hands it over: text, a number, a checkbox, or empty.
const cell = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);

export const syncRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        family: z.enum(FAMILIES),
        /** Sheet row number, so notes land back on the right row of the right tab. */
        row: z.number().int().min(2).max(100_000),
        id: z.uuid().transform((s) => s.toLowerCase()),
        name: cell,
        guests: cell,
        invites: cell.optional(),
        needsNamed: cell.optional(),
        seats: z.object({ nikkah: cell.optional(), holud: cell.optional(), reception: cell.optional() }),
      }),
    )
    .max(2000),
  /** Set by the "Publish and allow removals" menu item. Lifts the mass-removal guard. */
  allowRemovals: z.boolean().optional(),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;

export type ParsedGuest = { kind: "named"; fullName: string; isChild: boolean } | { kind: "slot"; isChild: boolean };

/** An event the row names people under: only they (and the first `openSpots` open spots) may come. */
export type OnlyFor = { named: number[]; openSpots: number };

export type ParsedRow = {
  family: Family;
  row: number;
  id: string;
  displayName: string;
  /** Named people first (in sheet order), then the open spots. */
  guests: ParsedGuest[];
  /** Only the events this party is invited to, with the number of seats. */
  seats: Partial<Record<EventId, number>>;
  /** Events where only some of the party is invited. Indexes are into the named guests. */
  only: Partial<Record<EventId, OnlyFor>>;
  /** Open spots can't come to an event unless someone named is coming to it. */
  othersNeedNamed: boolean;
  /** Anything here keeps the row off the website (or keeps the website's previous version). */
  errors: string[];
  /** Published anyway, but worth a look. */
  warnings: string[];
};

const text = (v: string | number | boolean | null | undefined) =>
  typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const people = (n: number) => (n === 1 ? "1 person" : `${n} people`);

const YES = new Set(["x", "yes", "y", "all", "everyone", "✓", "✔", "true"]);
const NO = new Set(["", "0", "no", "n", "-", "false"]);

// "+1", "+2", "+1 child", "+ 2 kids": still understood, though Invites is the simpler way.
const SLOT = /^\+\s*(\d{1,2})?\s*(child|children|kid|kids)?$/i;
const CHILD_MARK = /\s*\((child|kid)\)\s*$/i;

export function parseRow(input: SyncRequest["rows"][number]): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const displayName = oneLine(text(input.name));
  if (!displayName) errors.push("Add the name that goes on the invite.");
  else if (displayName.length > 120) errors.push("The name on the invite is too long.");

  // ---- Guest names: "Farid Karim, Nadia Karim, Samir Karim (child)"
  const named: { fullName: string; isChild: boolean }[] = [];
  const plusSpots: boolean[] = []; // isChild, one per "+1"
  const seen = new Set<string>();
  for (const raw of text(input.guests).split(/[,;\n]+/)) {
    const token = oneLine(raw);
    if (!token) continue;

    const slot = SLOT.exec(token);
    if (slot) {
      for (let i = 0; i < Number(slot[1] ?? 1); i++) plusSpots.push(Boolean(slot[2]));
      continue;
    }

    const isChild = CHILD_MARK.test(token);
    const fullName = token.replace(CHILD_MARK, "").trim();
    const normalized = normalizeName(fullName);
    if (!/[a-z]/.test(normalized)) {
      errors.push(`"${token}" doesn't look like a name.`);
      continue;
    }
    if (fullName.length > 100) {
      errors.push(`"${fullName.slice(0, 30)}..." is too long for a name.`);
      continue;
    }
    if (seen.has(normalized)) {
      errors.push(`${fullName} is listed twice.`);
      continue;
    }
    seen.add(normalized);
    if (/&|\band\b/i.test(fullName)) {
      warnings.push(`"${fullName}" looks like two people. Put a comma between names.`);
    } else if (!normalized.includes(" ")) {
      warnings.push(`${fullName} has no last name, so they can't find this invitation by searching their own name.`);
    }
    named.push({ fullName, isChild });
  }
  if (named.length === 0) errors.push("Add at least one name in Guest names, so they can find the invitation.");

  // ---- Invites: how many people in total. The ones without a name become open spots.
  let total = named.length + plusSpots.length;
  const invitesText = text(input.invites);
  if (invitesText !== "") {
    const n = Number(invitesText);
    if (!Number.isInteger(n) || n < 1) {
      errors.push(`Invites: "${invitesText}" isn't a number. Use a number like 5, or leave it blank for just the names.`);
    } else if (n < named.length) {
      // Everyone named has a seat, so the count can't be lower than the names.
      total = named.length;
      warnings.push(`${people(named.length)} are named, so this invitation has ${named.length} seats, not ${n}.`);
    } else {
      total = n;
    }
  }
  if (total > MAX_PEOPLE) errors.push(`That's more than ${MAX_PEOPLE} people on one invitation. Split it into two rows.`);
  const spotCount = Math.max(0, Math.min(total, MAX_PEOPLE) - named.length);
  const guests: ParsedGuest[] = [
    ...named.map((g) => ({ kind: "named" as const, ...g })),
    ...Array.from({ length: spotCount }, (_, i) => ({ kind: "slot" as const, isChild: plusSpots[i] ?? false })),
  ];

  // ---- Others need a named guest: usually blank.
  const flag = input.needsNamed === true ? "x" : text(input.needsNamed).toLowerCase();
  const othersNeedNamed = YES.has(flag);
  if (!othersNeedNamed && !NO.has(flag)) errors.push("Others need a named guest: put an x, or leave it blank.");

  // ---- Events: x for everyone, some names, or blank for not invited.
  const seats: Partial<Record<EventId, number>> = {};
  const only: Partial<Record<EventId, OnlyFor>> = {};
  for (const eventId of EVENT_IDS) {
    const value = input.seats[eventId];
    const column = SEAT_COLUMN[eventId];
    if (value === true) {
      seats[eventId] = total;
      continue;
    }
    if (value === false || value === null || value === undefined) continue;

    const word = text(value).toLowerCase();
    if (NO.has(word)) continue;
    if (YES.has(word)) {
      seats[eventId] = total;
      continue;
    }
    if (/^\d+$/.test(word)) {
      errors.push(`${column}: a number doesn't say who. Put an x for everyone, or type the names of the people invited.`);
      continue;
    }

    const picked = pickPeople(text(value), named, spotCount, column);
    errors.push(...picked.errors);
    if (picked.errors.length === 0 && picked.named.length + picked.openSpots > 0) {
      seats[eventId] = picked.named.length + picked.openSpots;
      only[eventId] = { named: picked.named, openSpots: picked.openSpots };
    }
  }

  return { family: input.family, row: input.row, id: input.id, displayName, guests, seats, only, othersNeedNamed, errors, warnings };
}

/**
 * An event cell with names in it: "Farid Karim", "Farid", "Farid and Nadia", "Farid Karim, +1".
 * Each name must be one of the row's Guest names (a first name is enough when it's unique).
 */
function pickPeople(cellText: string, named: { fullName: string }[], spotCount: number, column: string) {
  const errors: string[] = [];
  const picked = new Set<number>();
  let openSpots = 0;

  const tokens = cellText
    .replace(/\s*\+\s*/g, ",+")
    .split(/[,;\n&]+|\band\b/i)
    .map(oneLine)
    .filter(Boolean);
  for (const raw of tokens) {
    const slot = SLOT.exec(raw);
    if (slot) {
      openSpots += Number(slot[1] ?? 1);
      continue;
    }
    const token = raw.replace(/^\+\s*/, "");
    const n = normalizeName(token);
    let matches = named.flatMap((g, i) => (normalizeName(g.fullName) === n ? [i] : []));
    if (matches.length === 0) matches = named.flatMap((g, i) => (normalizeName(g.fullName).split(" ")[0] === n ? [i] : []));
    if (matches.length === 0) matches = named.flatMap((g, i) => (similarNames(g.fullName, token) ? [i] : []));
    if (matches.length === 1) picked.add(matches[0]);
    else if (matches.length > 1) errors.push(`${column}: more than one guest could be "${token}". Use the full name.`);
    else errors.push(`${column}: "${token}" isn't in Guest names. Add them there, or put an x for everyone.`);
  }
  if (openSpots > spotCount) {
    errors.push(
      `${column} has +${openSpots}, but this invitation only has ${spotCount} ${spotCount === 1 ? "invite" : "invites"} without a name. Raise Invites first.`,
    );
  }
  return { named: [...picked].sort((a, b) => a - b), openSpots, errors };
}
