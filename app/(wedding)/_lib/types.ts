/**
 * Shared TypeScript types for the wedding site.
 * The RSVP types mirror supabase/schema.sql. If you change a table, change it here and in
 * _lib/store/types.ts too (or generate them with `supabase gen types typescript`).
 */

// ---------- Content (static, lives in content.ts) ----------

export type EventId = "holud" | "nikkah" | "reception";

export type Venue = {
  name: string;
  address: string;
  /** Link to the venue's own website (guide: "include a link to the venue's website"). */
  website?: string;
  /** Google Maps share link, used for the map embed and the "Get directions" button. */
  mapsUrl?: string;
  /** Written directions with landmarks, parking, which entrance (guide: "easily forgotten details"). */
  directions?: string;
};

export type WeddingEvent = {
  id: EventId;
  name: string;
  /** ISO date, e.g. "2027-04-10". Used for countdown and add-to-calendar. */
  date: string;
  startTime: string; // "18:00"
  endTime?: string;
  venue: Venue;
  dressCode: string;
  /** One or two friendly sentences: what happens at this event, what to expect. */
  description: string;
  /** Practical notes: shoes/grass, outdoor/indoor, arrive 15 min early, unplugged, etc. */
  guestNotes?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
  /** Only show this to parties invited to at least one of these events. Omit to show everyone. */
  eventIds?: EventId[];
};

export type WeddingPartyMember = {
  name: string;
  role: string; // "Maid of Honour", "Best Man", "Sister of the bride" ...
  bio: string;
  photo?: string; // key into _photos/index.ts
};

// ---------- RSVP data (mirrors supabase/schema.sql) ----------

/** A household / invitation unit (one row of the family's Google Sheet). Guests look themselves up by this. */
export type Party = {
  id: string;
  displayName: string; // "The Hoque Family", "Ayesha & Omar"
  inviteCode?: string | null;
};

export type Guest = {
  id: string;
  /** null for an open spot nobody has named. Guests may leave it that way. */
  fullName: string | null;
  /** An open spot: an invite without a name (Invites is bigger than the names listed). */
  isSlot: boolean;
  isChild: boolean;
};

/** Which events a party is invited to, and how many seats they have at each. */
export type PartyEvent = {
  partyId: string;
  eventId: EventId;
  maxGuests: number;
  /** null: the whole invitation. Otherwise only these guests may come to this event. */
  guestIds: string[] | null;
};

export type Rsvp = {
  guestId: string;
  eventId: EventId;
  attending: boolean;
  mealChoice?: string | null;
  dietaryNotes?: string | null;
};

/** One per party: things that are asked once, not per person. */
export type PartyResponse = {
  songRequest: string | null;
  message: string | null;
  submittedAt: string | null;
};

/** What the lookup step returns to the browser. Deliberately minimal (see WEDDING.md > Security). */
export type PartyLookupResult = {
  partyId: string;
  displayName: string;
  firstNames: string[];
};

/** The signed-in party, as every /hridee page sees it. Decides which events are shown. */
export type PartySummary = {
  partyId: string;
  displayName: string;
  invitedEventIds: EventId[];
};

/** Everything the RSVP form needs for one party (and nothing about anyone else). */
export type RsvpPartyData = PartySummary & {
  /** Open spots can't come to an event unless someone named is coming to it. */
  othersNeedNamed: boolean;
  guests: Guest[];
  invitations: { eventId: EventId; maxGuests: number; guestIds: string[] | null }[];
  rsvps: Rsvp[];
  response: PartyResponse | null;
};

/** What submitRsvp writes, after validation. */
export type RsvpSubmission = {
  rsvps: { guestId: string; eventId: EventId; attending: boolean; dietaryNotes: string | null }[];
  /** guestId -> name, for open spots only. null: unused, or coming without a name. */
  slotNames: Record<string, string | null>;
  songRequest: string | null;
  message: string | null;
};
