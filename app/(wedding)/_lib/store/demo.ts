/**
 * A fake, in-memory guest list for previewing the site before the Supabase project exists.
 * Turned on by WEDDING_DEMO_DATA=1 in .env.local. Refuses to run on Vercel (see ./index.ts).
 * RSVPs saved here vanish when the dev server restarts. The sheet sync (POST /hridee/sync)
 * works against it too, so the whole flow can be tried locally.
 *
 * Try these names at /hridee/enter (any password set in WEDDING_PASSWORD):
 *   "Omar Rahman"    all three events
 *   "Farid Karim"    5 invites, 3 of them named: Holud + Reception for all, the Nikkah for Farid only
 *   "Sam Lee"        Reception only, with one open spot (a +1)
 *   "Ayesha Rahman"  matches TWO parties, so you see the "which one are you?" picker
 *   "Fareed Kareem"  no exact match, so the close spelling finds the Karims
 */
import "server-only";
import type { EventId, Guest, PartyResponse } from "../types";
import { firstName, normalizeName, pickMatches } from "../names";
import type { AttemptKind, DbRsvp, GuestStore, Snapshot } from "./types";

type DemoGuest = Guest & { sortOrder: number };

type DemoParty = {
  id: string;
  displayName: string;
  archived: boolean;
  guests: DemoGuest[];
  invitations: { eventId: EventId; maxGuests: number; guestIds: string[] | null }[];
};

type DemoState = {
  parties: DemoParty[];
  rsvps: DbRsvp[];
  responses: Record<string, PartyResponse>;
  attempts: { ip: string; kind: AttemptKind; at: number }[];
};

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const named = (n: number, sortOrder: number, fullName: string, isChild = false): DemoGuest => ({
  id: id(n),
  fullName,
  isSlot: false,
  isChild,
  sortOrder,
});
const slot = (n: number, sortOrder: number, isChild = false): DemoGuest => ({
  id: id(n),
  fullName: null,
  isSlot: true,
  isChild,
  sortOrder,
});

function seed(): DemoState {
  return {
    parties: [
      {
        id: id(101),
        displayName: "Ayesha & Omar Rahman",
        archived: false,
        guests: [named(201, 1, "Ayesha Rahman"), named(202, 2, "Omar Rahman")],
        invitations: [
          { eventId: "nikkah", maxGuests: 2, guestIds: null },
          { eventId: "holud", maxGuests: 2, guestIds: null },
          { eventId: "reception", maxGuests: 2, guestIds: null },
        ],
      },
      {
        id: id(102),
        displayName: "The Karim Family",
        archived: false,
        guests: [
          named(211, 1, "Farid Karim"),
          named(212, 2, "Nadia Karim"),
          named(213, 3, "Samir Karim", true),
          slot(214, 4),
          slot(215, 5),
        ],
        invitations: [
          { eventId: "nikkah", maxGuests: 1, guestIds: [id(211)] },
          { eventId: "holud", maxGuests: 5, guestIds: null },
          { eventId: "reception", maxGuests: 5, guestIds: null },
        ],
      },
      {
        id: id(103),
        displayName: "Sam Lee",
        archived: false,
        guests: [named(221, 1, "Sam Lee"), slot(222, 2)],
        invitations: [{ eventId: "reception", maxGuests: 2, guestIds: null }],
      },
      {
        id: id(104),
        displayName: "The Rahman Family",
        archived: false,
        guests: [named(231, 1, "Tariq Rahman"), named(232, 2, "Mina Rahman"), named(233, 3, "Ayesha Rahman")],
        invitations: [{ eventId: "reception", maxGuests: 3, guestIds: null }],
      },
    ],
    rsvps: [],
    responses: {},
    attempts: [],
  };
}

// Kept on globalThis so it survives hot reloads in `next dev`.
const g = globalThis as typeof globalThis & { __weddingDemoState?: DemoState };
const state = (): DemoState => (g.__weddingDemoState ??= seed());

const active = () => state().parties.filter((p) => !p.archived);
const sorted = (guests: DemoGuest[]) => [...guests].sort((a, b) => a.sortOrder - b.sortOrder);

const searchNames = (p: DemoParty) =>
  [p.displayName, ...p.guests.flatMap((x) => (x.fullName ? [x.fullName] : []))].map(normalizeName);

export const demoStore: GuestStore = {
  async findParties(query, limit) {
    const parties = [...active()].sort((a, b) => a.displayName.localeCompare(b.displayName));
    return pickMatches(parties, searchNames, query)
      .slice(0, limit)
      .map((p) => ({
        partyId: p.id,
        displayName: p.displayName,
        firstNames: sorted(p.guests).flatMap((x) => (x.fullName ? [firstName(x.fullName)] : [])),
      }));
  },

  async getPartySummary(partyId) {
    const p = active().find((x) => x.id === partyId);
    return p ? { partyId: p.id, displayName: p.displayName, invitedEventIds: p.invitations.map((i) => i.eventId) } : null;
  },

  async getRsvpPartyData(partyId) {
    const s = state();
    const p = active().find((x) => x.id === partyId);
    if (!p) return null;
    const guestIds = new Set(p.guests.map((x) => x.id));
    return {
      partyId: p.id,
      displayName: p.displayName,
      invitedEventIds: p.invitations.map((i) => i.eventId),
      guests: sorted(p.guests).map(({ id, fullName, isSlot, isChild }) => ({ id, fullName, isSlot, isChild })),
      invitations: p.invitations.map((i) => ({ ...i, guestIds: i.guestIds && [...i.guestIds] })),
      rsvps: s.rsvps
        .filter((r) => guestIds.has(r.guestId))
        .map(({ guestId, eventId, attending, dietaryNotes }) => ({ guestId, eventId, attending, dietaryNotes })),
      response: s.responses[p.id] ? { ...s.responses[p.id] } : null,
    };
  },

  async saveRsvp(partyId, submission) {
    const s = state();
    const p = s.parties.find((x) => x.id === partyId);
    if (!p) throw new Error("Unknown party");
    const now = new Date().toISOString();
    for (const [guestId, name] of Object.entries(submission.slotNames)) {
      const guest = p.guests.find((x) => x.id === guestId && x.isSlot);
      if (guest) guest.fullName = name;
    }
    for (const r of submission.rsvps) {
      s.rsvps = s.rsvps.filter((x) => !(x.guestId === r.guestId && x.eventId === r.eventId));
      s.rsvps.push({ guestId: r.guestId, eventId: r.eventId, attending: r.attending, dietaryNotes: r.dietaryNotes, updatedAt: now });
    }
    s.responses[partyId] = { songRequest: submission.songRequest, message: submission.message, submittedAt: now };
  },

  async recordAttempt(ip, kind) {
    state().attempts.push({ ip, kind, at: Date.now() });
  },

  async countRecentAttempts(ip, kind, sinceMs) {
    return state().attempts.filter((a) => a.ip === ip && a.kind === kind && a.at >= sinceMs).length;
  },

  async loadSnapshot(): Promise<Snapshot> {
    const s = state();
    return structuredClone({
      parties: s.parties.map((p) => ({ id: p.id, displayName: p.displayName, archived: p.archived })),
      guests: s.parties.flatMap((p) => p.guests.map((x) => ({ ...x, partyId: p.id }))),
      invitations: s.parties.flatMap((p) => p.invitations.map((i) => ({ ...i, partyId: p.id }))),
      rsvps: s.rsvps,
      responses: Object.entries(s.responses).map(([partyId, r]) => ({ partyId, ...r })),
    });
  },

  async applySheetPlan(plan) {
    const s = state();
    const party = (partyId: string) => {
      const p = s.parties.find((x) => x.id === partyId);
      if (!p) throw new Error(`Unknown party ${partyId}`);
      return p;
    };

    for (const u of plan.upsertParties) {
      const p = s.parties.find((x) => x.id === u.id);
      if (p) Object.assign(p, { displayName: u.displayName, archived: false });
      else s.parties.push({ id: u.id, displayName: u.displayName, archived: false, guests: [], invitations: [] });
    }
    for (const { eventId, guestIds } of plan.deleteRsvps) {
      const ids = new Set(guestIds);
      s.rsvps = s.rsvps.filter((r) => !(r.eventId === eventId && ids.has(r.guestId)));
    }
    for (const { partyId, eventId } of plan.deleteInvitations) {
      const p = party(partyId);
      p.invitations = p.invitations.filter((i) => i.eventId !== eventId);
    }
    const gone = new Set(plan.deleteGuestIds);
    for (const p of s.parties) p.guests = p.guests.filter((x) => !gone.has(x.id));
    s.rsvps = s.rsvps.filter((r) => !gone.has(r.guestId));

    for (const u of plan.upsertNamedGuests) {
      const p = party(u.partyId);
      const existing = p.guests.find((x) => x.id === u.id);
      const fields = { fullName: u.fullName, isSlot: false, isChild: u.isChild, sortOrder: u.sortOrder };
      if (existing) Object.assign(existing, fields);
      else p.guests.push({ id: u.id, ...fields });
    }
    for (const u of plan.upsertSlots) {
      const p = party(u.partyId);
      const existing = p.guests.find((x) => x.id === u.id);
      if (existing) Object.assign(existing, { isChild: u.isChild, sortOrder: u.sortOrder });
      else p.guests.push({ id: u.id, fullName: null, isSlot: true, isChild: u.isChild, sortOrder: u.sortOrder });
    }
    for (const u of plan.upsertInvitations) {
      const p = party(u.partyId);
      const existing = p.invitations.find((i) => i.eventId === u.eventId);
      if (existing) Object.assign(existing, { maxGuests: u.maxGuests, guestIds: u.guestIds });
      else p.invitations.push({ eventId: u.eventId, maxGuests: u.maxGuests, guestIds: u.guestIds });
    }
    for (const partyId of plan.archivePartyIds) party(partyId).archived = true;
  },
};
