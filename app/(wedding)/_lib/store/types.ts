import type { EventId, PartyLookupResult, PartySummary, RsvpPartyData, RsvpSubmission } from "../types";

export type AttemptKind = "password" | "lookup";

/**
 * Every read and write the wedding site makes. Two implementations:
 *   supabase.ts  the real database (production, and dev once the project exists)
 *   demo.ts      a fake in-memory guest list for local preview (WEDDING_DEMO_DATA=1, dev only)
 * Validation and permission checks happen in the Server Actions and the sheet sync, not here.
 * Parties removed from the Google Sheet are "archived": every guest-facing read skips them.
 */
export interface GuestStore {
  /** `normalizedQuery` comes from normalizeName(). Returns at most `limit` parties. */
  findParties(normalizedQuery: string, limit: number): Promise<PartyLookupResult[]>;
  getPartySummary(partyId: string): Promise<PartySummary | null>;
  getRsvpPartyData(partyId: string): Promise<RsvpPartyData | null>;
  saveRsvp(partyId: string, submission: RsvpSubmission): Promise<void>;

  recordAttempt(ip: string, kind: AttemptKind): Promise<void>;
  countRecentAttempts(ip: string, kind: AttemptKind, sinceMs: number): Promise<number>;

  /** Everything, archived parties included. Used by the Google Sheet sync (_lib/sheet/). */
  loadSnapshot(): Promise<Snapshot>;
  applySheetPlan(plan: SheetPlan): Promise<void>;
}

// ---------- The whole guest list, as the sheet sync sees it ----------

export type DbParty = { id: string; displayName: string; archived: boolean };

export type DbGuest = {
  id: string;
  partyId: string;
  fullName: string | null;
  isSlot: boolean;
  isChild: boolean;
  sortOrder: number;
};

/** guestIds: null means the whole invitation; otherwise only these guests. */
export type DbInvitation = { partyId: string; eventId: EventId; maxGuests: number; guestIds: string[] | null };

export type DbRsvp = {
  guestId: string;
  eventId: EventId;
  attending: boolean;
  dietaryNotes: string | null;
  updatedAt: string | null;
};

export type DbResponse = {
  partyId: string;
  songRequest: string | null;
  message: string | null;
  submittedAt: string | null;
};

export type Snapshot = {
  parties: DbParty[];
  guests: DbGuest[];
  invitations: DbInvitation[];
  rsvps: DbRsvp[];
  responses: DbResponse[];
};

/**
 * The changes one sync makes, worked out by _lib/sheet/plan.ts. Stores apply them in the order
 * listed. Each sync recomputes from scratch, so a sync that fails halfway is finished by the next.
 */
export type SheetPlan = {
  /** New parties, renamed parties, and archived parties that are back in the sheet (un-archives them). */
  upsertParties: { id: string; displayName: string }[];
  /** RSVPs for an event the party (or that guest) is no longer invited to. */
  deleteRsvps: { eventId: EventId; guestIds: string[] }[];
  deleteInvitations: { partyId: string; eventId: EventId }[];
  /** People taken off an invitation. Their RSVPs go with them (on delete cascade). */
  deleteGuestIds: string[];
  /** Named people. Never touches a slot. */
  upsertNamedGuests: { id: string; partyId: string; fullName: string; isChild: boolean; sortOrder: number }[];
  /** Open spots (invites without a name). Never touches the name a guest typed into one. */
  upsertSlots: { id: string; partyId: string; isChild: boolean; sortOrder: number }[];
  upsertInvitations: DbInvitation[];
  /** Rows gone from the sheet (or with no seats left): hidden from the site, data kept. */
  archivePartyIds: string[];
};
