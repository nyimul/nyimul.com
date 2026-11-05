/**
 * The read-only tabs the sync writes back into the family's Google Sheet: Summary, RSVPs and
 * Messages. Built from the database after the guest lists have been applied, so they always
 * match what the website shows. The Apps Script writes these as-is; all the wording lives here.
 */
import "server-only";
import { events } from "../content";
import type { Snapshot } from "../store/types";
import type { EventId } from "../types";
import { FAMILIES, FAMILY_LABEL, type Family } from "./rows";

export type Table = {
  name: "Summary" | "RSVPs" | "Messages";
  header: string[];
  rows: (string | number)[][];
  /** Rows (0-based, not counting the header) to show in bold: the Summary's family titles. */
  boldRows?: number[];
};

const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
const when = (iso: string | null) => (iso ? day.format(new Date(iso)) : "");

export function buildTables(s: Snapshot, familyOf: Map<string, Family>): Table[] {
  const active = s.parties.filter((p) => !p.archived).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const family = (partyId: string): Family => familyOf.get(partyId) ?? "nyimul";
  const activeIds = new Set(active.map((p) => p.id));
  const guestsByParty = new Map<string, Snapshot["guests"]>();
  for (const g of s.guests) {
    if (!activeIds.has(g.partyId)) continue;
    guestsByParty.set(g.partyId, [...(guestsByParty.get(g.partyId) ?? []), g]);
  }
  for (const list of guestsByParty.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
  const invited = new Map<string, Map<EventId, Snapshot["invitations"][number]>>();
  for (const inv of s.invitations) {
    if (!activeIds.has(inv.partyId)) continue;
    const m = invited.get(inv.partyId) ?? new Map();
    m.set(inv.eventId, inv);
    invited.set(inv.partyId, m);
  }
  const rsvp = new Map(s.rsvps.map((r) => [`${r.guestId}|${r.eventId}`, r]));
  const response = new Map(s.responses.map((r) => [r.partyId, r]));

  /** The people who may come to this event, and whether the party has answered for it. */
  const forEvent = (partyId: string, eventId: EventId) => {
    const inv = invited.get(partyId)?.get(eventId);
    if (!inv) return null;
    const allowed = inv.guestIds ? new Set(inv.guestIds) : null;
    const guests = (guestsByParty.get(partyId) ?? []).filter((g) => !allowed || allowed.has(g.id));
    const replied = guests.some((g) => rsvp.has(`${g.id}|${eventId}`));
    const coming = guests.filter((g) => rsvp.get(`${g.id}|${eventId}`)?.attending).length;
    return { seats: inv.maxGuests, guests, replied, coming };
  };

  // ---- RSVPs: one row per person per event, grouped by family.
  const rsvpRows: (string | number)[][] = [];
  for (const fam of FAMILIES) {
    for (const event of events) {
      for (const p of active) {
        if (family(p.id) !== fam) continue;
        const e = forEvent(p.id, event.id);
        if (!e) continue;
        const row = (guest: string, reply: string, dietary = "", date = "") =>
          rsvpRows.push([FAMILY_LABEL[fam], event.name, p.displayName, guest, reply, dietary, date]);

        for (const g of e.guests.filter((x) => !x.isSlot)) {
          const r = rsvp.get(`${g.id}|${event.id}`);
          const name = `${g.fullName ?? ""}${g.isChild ? " (child)" : ""}`;
          row(name, r ? (r.attending ? "Coming" : "Not coming") : "No reply yet", r?.dietaryNotes ?? "", when(r?.updatedAt ?? null));
        }
        // Open spots: list the ones coming. Before they reply, one line says how many there are.
        const spots = e.guests.filter((x) => x.isSlot);
        if (spots.length === 0) continue;
        if (!e.replied) {
          row(`+${spots.length} without a name`, "No reply yet");
          continue;
        }
        let unnamed = 0;
        for (const g of spots) {
          const r = rsvp.get(`${g.id}|${event.id}`);
          if (!r?.attending) continue;
          row(g.fullName ? `${g.fullName} (added by guest)` : `Extra guest ${++unnamed}`, "Coming", r.dietaryNotes ?? "", when(r.updatedAt));
        }
      }
    }
  }

  // ---- Summary: per family, then everyone. People invited = coming + not coming + no reply yet.
  const summaryRows: (string | number)[][] = [];
  const boldRows: number[] = [];
  const section = (title: string, inSection: (partyId: string) => boolean) => {
    if (summaryRows.length > 0) summaryRows.push([]);
    boldRows.push(summaryRows.length);
    summaryRows.push([title]);
    for (const event of events) {
      let invitations = 0;
      let replied = 0;
      let seats = 0;
      let coming = 0;
      let notComing = 0;
      let waiting = 0;
      for (const p of active) {
        if (!inSection(p.id)) continue;
        const e = forEvent(p.id, event.id);
        if (!e) continue;
        invitations++;
        seats += e.seats;
        if (e.replied) {
          replied++;
          coming += e.coming;
          notComing += Math.max(0, e.seats - e.coming);
        } else {
          waiting += e.seats;
        }
      }
      summaryRows.push([event.name, invitations, replied, seats, coming, notComing, waiting]);
    }
  };
  for (const fam of FAMILIES) section(FAMILY_LABEL[fam], (id) => family(id) === fam);
  section("Everyone", () => true);

  // ---- Messages: song requests and notes to the couple, newest first.
  const messageRows = active
    .flatMap((p) => {
      const r = response.get(p.id);
      return r && (r.songRequest || r.message) ? [{ p, r }] : [];
    })
    .sort((a, b) => (b.r.submittedAt ?? "").localeCompare(a.r.submittedAt ?? ""))
    .map(({ p, r }) => [FAMILY_LABEL[family(p.id)], p.displayName, r.songRequest ?? "", r.message ?? "", when(r.submittedAt)]);

  return [
    {
      name: "Summary",
      header: ["Event", "Invitations", "Replied", "People invited", "Coming", "Not coming", "No reply yet"],
      rows: summaryRows,
      boldRows,
    },
    { name: "RSVPs", header: ["Family", "Event", "Invitation", "Guest", "Reply", "Dietary needs", "Replied on"], rows: rsvpRows },
    { name: "Messages", header: ["Family", "Invitation", "Song request", "Message", "Replied on"], rows: messageRows },
  ];
}
