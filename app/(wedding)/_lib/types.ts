/**
 * Shared TypeScript types for the wedding site.
 * The RSVP types mirror supabase/schema.sql one-to-one. If you change a table, change it here too
 * (later you can generate these automatically with `supabase gen types typescript`).
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

export type FaqItem = { question: string; answer: string };

export type WeddingPartyMember = {
  name: string;
  role: string; // "Maid of Honour", "Best Man", "Sister of the bride" ...
  bio: string;
  photo?: string; // key into _photos/index.ts
};

// ---------- RSVP data (mirrors supabase/schema.sql) ----------

/** A household / invitation unit. Guests look themselves up by this. */
export type Party = {
  id: string;
  displayName: string; // "The Hoque Family", "Ayesha & Omar"
  inviteCode?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type Guest = {
  id: string;
  partyId: string;
  /** null until a "+1" or unnamed child slot is filled in by the guest. */
  fullName: string | null;
  isChild: boolean;
};

/** Which events a party is invited to, and how many seats they have at each. */
export type PartyEvent = {
  partyId: string;
  eventId: EventId;
  maxGuests: number;
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
  partyId: string;
  songRequest?: string | null;
  message?: string | null;
  submittedAt?: string;
};

/** What the lookup step returns to the browser. Deliberately minimal (see WEDDING.md > Security). */
export type PartyLookupResult = {
  partyId: string;
  displayName: string;
  firstNames: string[];
};
