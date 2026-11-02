/**
 * ALL wedding copy and facts live here: names, dates, venues, FAQ, registry links...
 * Components import from this file and never hardcode details, so when a time changes
 * you edit one line and every section, calendar link and countdown updates together.
 *
 * Everything marked TODO is a placeholder. Fill it in with your fiancée before launch.
 * Guest-list data (who is invited, RSVPs) does NOT live here; that is in Supabase.
 */
import type { FaqItem, WeddingEvent, WeddingPartyMember } from "./types";

export const couple = {
  // TODO: confirm spelling and the order you want displayed everywhere.
  names: ["Hridee", "Nyimul"] as const,
  hashtag: "#TODO",
  /** Shown in the footer / FAQ so guests can reach you with questions. */
  contactEmail: "TODO@example.com",
};

export const wedding = {
  city: "Atlanta, Georgia",
  /** ISO date. Shown on the RSVP page and used to close the form after the deadline. */
  rsvpDeadline: "2027-03-01", // TODO
  unpluggedCeremony: true, // TODO: decide (guide: say whether ceremony/reception are unplugged)
};

export const events: WeddingEvent[] = [
  {
    id: "holud",
    name: "Gaye Holud",
    date: "2027-04-01", // TODO
    startTime: "18:00", // TODO
    venue: {
      name: "TPC Sugarloaf", // TODO: confirm
      address: "Duluth, GA", // TODO: full street address
      website: "",
      mapsUrl: "",
      directions: "",
    },
    dressCode: "", // TODO e.g. "Traditional South Asian attire, yellows and oranges welcome"
    description: "", // TODO: 1-2 sentences on what a Holud is, for guests who have never been to one
    guestNotes: "",
  },
  {
    id: "nikkah",
    name: "Nikkah",
    date: "2027-04-02", // TODO
    startTime: "11:00", // TODO
    venue: {
      name: "TPC Sugarloaf", // TODO: confirm
      address: "Duluth, GA", // TODO
      website: "",
      mapsUrl: "",
      directions: "",
    },
    dressCode: "", // TODO
    description: "", // TODO: what the ceremony is, roughly how long, seating, modest dress note if any
    guestNotes: "",
  },
  {
    id: "reception",
    name: "Reception",
    date: "2027-04-03", // TODO
    startTime: "18:00", // TODO
    venue: {
      name: "Hilton Atlanta Northeast", // TODO: confirm
      address: "Peachtree Corners, GA", // TODO
      website: "",
      mapsUrl: "",
      directions: "",
    },
    dressCode: "", // TODO
    description: "",
    guestNotes: "",
  },
];

/** How you met, the proposal, the in-between. Short paragraphs; photos go in _photos. */
export const story: { heading: string; body: string }[] = [
  // TODO { heading: "How we met", body: "..." },
  // TODO { heading: "The proposal", body: "..." },
];

export const weddingParty: WeddingPartyMember[] = [
  // TODO { name: "", role: "", bio: "", photo: "" },
];

export const accommodations = [
  // TODO hotel block(s): name, address, booking link/code, cut-off date, nightly rate, distance to venue
  // { name: "Hilton Atlanta Northeast", bookingUrl: "", groupCode: "", cutoffDate: "", notes: "" },
];

export const transport = {
  // TODO airport (ATL), rideshare notes, parking at each venue, shuttle between hotel and venue (if any) with times
  airport: "Hartsfield-Jackson Atlanta International (ATL)",
  parking: "",
  shuttle: "",
  rideshare: "",
};

export const thingsToDo: { name: string; blurb: string; url?: string }[] = [
  // TODO your favourite Atlanta spots, ideally tied to your story (first date, go-to restaurant...)
];

export const registry: { name: string; url: string; note?: string }[] = [
  // TODO { name: "", url: "" }
];

export const childcare = {
  // TODO are children invited to each event? babysitter / kids' room details and who to contact
  note: "",
};

export const faq: FaqItem[] = [
  // Suggested questions. TODO: write the answers.
  { question: "What should I wear to each event?", answer: "" },
  { question: "I've never been to a Holud or a Nikkah. What should I expect?", answer: "" },
  { question: "Can I bring a plus-one?", answer: "" },
  { question: "Are children invited?", answer: "" },
  { question: "Is there parking?", answer: "" },
  { question: "Will there be alcohol?", answer: "" },
  { question: "Is the ceremony unplugged? Can I take photos?", answer: "" },
  { question: "When is the RSVP deadline, and how do I change my RSVP?", answer: "" },
  { question: "What is the wedding hashtag?", answer: couple.hashtag },
  { question: "Who do I contact with questions?", answer: couple.contactEmail },
];
