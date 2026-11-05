/**
 * Reading the family's Google Sheet ("Guest List" tab), one row at a time.
 *
 * The sheet is typed by people, not machines, so this is forgiving: it accepts "x", "yes" or a
 * ticked checkbox for "everyone on this invitation", and explains every problem in plain words.
 * Those words end up in the row's "Website notes" cell, so they're written for the parents.
 *
 * The column names here must match the ones in scripts/wedding-sheet.gs.
 */
import "server-only";
import { z } from "zod";
import { events } from "../content";
import { normalizeName } from "../names";
import type { EventId } from "../types";

/** Event ids in the order the site shows them, and the sheet column for each. */
export const EVENT_IDS: EventId[] = events.map((e) => e.id);
export const SEAT_COLUMN: Record<EventId, string> = { nikkah: "Nikkah", holud: "Holud", reception: "Reception" };

const MAX_PEOPLE = 40;
const MAX_SEATS = 50;

// A cell, as Apps Script's getValues() hands it over: text, a number, a checkbox, or empty.
const cell = z.union([z.string().max(2000), z.number(), z.boolean(), z.null()]);

export const syncRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        /** Sheet row number, so notes land back on the right row. */
        row: z.number().int().min(2).max(100_000),
        id: z.uuid().transform((s) => s.toLowerCase()),
        name: cell,
        guests: cell,
        seats: z.object({ nikkah: cell.optional(), holud: cell.optional(), reception: cell.optional() }),
      }),
    )
    .max(2000),
  /** Set by the "Publish and allow removals" menu item. Lifts the mass-removal guard. */
  allowRemovals: z.boolean().optional(),
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;

export type ParsedGuest = { kind: "named"; fullName: string; isChild: boolean } | { kind: "slot"; isChild: boolean };

export type ParsedRow = {
  row: number;
  id: string;
  displayName: string;
  guests: ParsedGuest[];
  /** Only the events this party is invited to. */
  seats: Partial<Record<EventId, number>>;
  /** Anything here keeps the row off the website (or keeps the website's previous version). */
  errors: string[];
  /** Published anyway, but worth a look. */
  warnings: string[];
};

const text = (v: string | number | boolean | null | undefined) =>
  typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

const YES = new Set(["x", "yes", "y", "all", "everyone", "✓", "✔", "true"]);
const NO = new Set(["", "0", "no", "n", "-", "false"]);

// "+1", "+2", "+1 child", "+ 2 kids"
const SLOT = /^\+\s*(\d{1,2})?\s*(child|children|kid|kids)?$/i;
const CHILD_MARK = /\s*\((child|kid)\)\s*$/i;

export function parseRow(input: SyncRequest["rows"][number]): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];

  const displayName = oneLine(text(input.name));
  if (!displayName) errors.push("Add the name that goes on the invite.");
  else if (displayName.length > 120) errors.push("The name on the invite is too long.");

  // ---- Guests: "Farid Karim, Nadia Karim, Samir Karim (child), +1 child"
  const guests: ParsedGuest[] = [];
  const seen = new Set<string>();
  for (const raw of text(input.guests).split(/[,;\n]+/)) {
    const token = oneLine(raw);
    if (!token) continue;

    const slot = SLOT.exec(token);
    if (slot) {
      const count = Number(slot[1] ?? 1);
      for (let i = 0; i < count; i++) guests.push({ kind: "slot", isChild: Boolean(slot[2]) });
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
      warnings.push(`"${fullName}" looks like two people. Put a comma between guests.`);
    } else if (!normalized.includes(" ")) {
      warnings.push(`${fullName} has no last name, so they can't find this invitation by searching their own name.`);
    }
    guests.push({ kind: "named", fullName, isChild });
  }
  if (guests.length === 0) errors.push("Add the guests' names in the Guests column.");
  else if (!guests.some((g) => g.kind === "named")) errors.push("Add at least one guest by name, so they can find the invitation.");
  if (guests.length > MAX_PEOPLE) errors.push(`That's more than ${MAX_PEOPLE} people on one invitation. Split it into two rows.`);

  // ---- Seats per event: a number, "x"/"yes"/checkbox for everyone, blank for not invited.
  const seats: Partial<Record<EventId, number>> = {};
  for (const eventId of EVENT_IDS) {
    const value = input.seats[eventId];
    const column = SEAT_COLUMN[eventId];
    if (value === true) {
      seats[eventId] = guests.length;
      continue;
    }
    if (value === false || value === null || value === undefined) continue;

    const word = text(value).toLowerCase();
    if (NO.has(word)) continue;
    if (YES.has(word)) {
      seats[eventId] = guests.length;
      continue;
    }
    const n = Number(word);
    if (!Number.isInteger(n) || n < 0 || n > MAX_SEATS) {
      errors.push(`${column}: "${text(value)}" isn't a number of seats. Use a number like 3, an x for everyone, or leave it blank.`);
      continue;
    }
    if (n > 0) seats[eventId] = n;
  }
  for (const eventId of EVENT_IDS) {
    const n = seats[eventId];
    if (n !== undefined && guests.length > 0 && n > guests.length) {
      warnings.push(
        `${SEAT_COLUMN[eventId]} has ${n} seats but ${guests.length === 1 ? "1 person is" : `${guests.length} people are`} listed. Add +1 if they can bring someone.`,
      );
    }
  }

  return { row: input.row, id: input.id, displayName, guests, seats, errors, warnings };
}
