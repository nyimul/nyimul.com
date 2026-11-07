/**
 * Shared TypeScript types for the wedding site.
 * The RSVP types mirror supabase/schema.sql. If you change a table, change it here and in
 * _lib/store/types.ts too (or generate them with `supabase gen types typescript`).
 */

// ---------- Content (static, lives in content.ts) ----------

export type EventId = "holud" | "nikkah" | "reception";

/** Whose side an invitation is on: the tab of the family's Google Sheet its row is on. */
export type Family = "nyimul" | "hridee";

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

/**
 * One recommended place. Its row opens Google Maps with a search for the name and address, so
 * only set `url` when you want a different link (the place's website, a Maps share link).
 */
export type Recommendation = {
  name: string;
  /** A few words under the name: why you love it or what it is ("Our favorite Thai", "Ice cream"). */
  what?: string;
  /** Town or neighborhood as a guest would say it ("Duluth", "West Midtown", "Several locations"). */
  area: string;
  /** Drive from the hotel in minutes, without traffic. Each group lists its places nearest first. */
  minutes: number;
  address?: string;
  url?: string;
};

/** A group of recommendations under one heading ("Food", "Cafes"...). */
export type RecommendationGroup = {
  title: string;
  places: Recommendation[];
};

/** A hotel block. Only `name` is required; the Travel section shows whatever is filled in. */
export type Accommodation = {
  name: string;
  address?: string;
  bookingUrl?: string;
  groupCode?: string;
  cutoffDate?: string;
  nightlyRate?: string;
  /** Shown to everyone. */
  notes?: string;
  /** Lines shown only to parties invited to one of the listed events (e.g. how far a venue is). */
  eventNotes?: { eventIds: EventId[]; text: string }[];
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
  family: Family;
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
