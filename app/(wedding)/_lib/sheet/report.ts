/**
 * The read-only tabs the sync writes back into the family's Google Sheet: Summary, RSVPs and
 * Messages. Built from the database after the guest list has been applied, so they always match
 * what the website shows. The Apps Script writes these as-is; all the wording lives here.
 */
import "server-only";
import { events } from "../content";
import type { Snapshot } from "../store/types";
import type { EventId } from "../types";

export type Table = { name: "Summary" | "RSVPs" | "Messages"; header: string[]; rows: (string | number)[][] };

const day = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", year: "numeric" });
const when = (iso: string | null) => (iso ? day.format(new Date(iso)) : "");

export function buildTables(s: Snapshot): Table[] {
  const active = s.parties.filter((p) => !p.archived).sort((a, b) => a.displayName.localeCompare(b.displayName));
  const activeIds = new Set(active.map((p) => p.id));
  const guestsByParty = new Map<string, Snapshot["guests"]>();
  for (const g of s.guests) {
    if (!activeIds.has(g.partyId)) continue;
    guestsByParty.set(g.partyId, [...(guestsByParty.get(g.partyId) ?? []), g]);
  }
  for (const list of guestsByParty.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);
  const invited = new Map<string, Map<EventId, number>>();
  for (const inv of s.invitations) {
    if (!activeIds.has(inv.partyId)) continue;
    const m = invited.get(inv.partyId) ?? new Map<EventId, number>();
    m.set(inv.eventId, inv.maxGuests);
    invited.set(inv.partyId, m);
  }
  const rsvp = new Map(s.rsvps.map((r) => [`${r.guestId}|${r.eventId}`, r]));
  const response = new Map(s.responses.map((r) => [r.partyId, r]));

  // ---- RSVPs: one row per person per event they're invited to.
  const rsvpRows: (string | number)[][] = [];
  for (const event of events) {
    for (const p of active) {
      if (!invited.get(p.id)?.has(event.id)) continue;
      for (const g of guestsByParty.get(p.id) ?? []) {
        const r = rsvp.get(`${g.id}|${event.id}`);
        const name = g.isSlot
          ? g.fullName
            ? `${g.fullName} (added by guest)`
            : g.isChild
              ? "Unnamed child"
              : "Unnamed +1"
          : (g.fullName ?? "");
        rsvpRows.push([
          event.name,
          p.displayName,
          name,
          r ? (r.attending ? "Coming" : "Not coming") : "No reply yet",
          g.isChild ? "Yes" : "",
          r?.dietaryNotes ?? "",
          when(r?.updatedAt ?? null),
        ]);
      }
    }
  }

  // ---- Summary: headcounts per event.
  const summaryRows: (string | number)[][] = events.map((event) => {
    let invitations = 0;
    let seats = 0;
    let replied = 0;
    let coming = 0;
    let notComing = 0;
    let children = 0;
    for (const p of active) {
      const max = invited.get(p.id)?.get(event.id);
      if (max === undefined) continue;
      invitations++;
      seats += max;
      let answered = false;
      for (const g of guestsByParty.get(p.id) ?? []) {
        const r = rsvp.get(`${g.id}|${event.id}`);
        if (!r) continue;
        answered = true;
        if (r.attending) {
          coming++;
          if (g.isChild) children++;
        } else if (!g.isSlot || g.fullName) {
          notComing++; // an unused, unnamed +1 isn't a person saying no
        }
      }
      if (answered) replied++;
    }
    return [event.name, invitations, seats, coming, notComing, children, replied, invitations - replied];
  });
  const repliedParties = active.filter((p) => response.has(p.id)).length;
  summaryRows.push([], ["Invitations that have replied", `${repliedParties} of ${active.length}`]);

  // ---- Messages: song requests and notes to the couple.
  const messageRows = active
    .flatMap((p) => {
      const r = response.get(p.id);
      return r && (r.songRequest || r.message) ? [{ p, r }] : [];
    })
    .sort((a, b) => (b.r.submittedAt ?? "").localeCompare(a.r.submittedAt ?? ""))
    .map(({ p, r }) => [p.displayName, r.songRequest ?? "", r.message ?? "", when(r.submittedAt)]);

  return [
    {
      name: "Summary",
      header: ["Event", "Invitations", "Seats", "Coming", "Not coming", "Children coming", "Invitations replied", "Still waiting"],
      rows: summaryRows,
    },
    { name: "RSVPs", header: ["Event", "Invitation", "Guest", "Reply", "Child", "Dietary needs", "Replied on"], rows: rsvpRows },
    { name: "Messages", header: ["Invitation", "Song request", "Message", "Replied on"], rows: messageRows },
  ];
}
