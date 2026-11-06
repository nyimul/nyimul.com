/**
 * ALL wedding copy and facts live here: names, dates, venues, FAQ, registry links...
 * Components import from this file and never hardcode details, so when a time changes
 * you edit one line and every section, calendar link and countdown updates together.
 *
 * Everything marked TODO is a placeholder. Fill it in with your fiancée before launch.
 * Guest-list data (who is invited, RSVPs) does NOT live here; that is in Supabase.
 *
 * Guests only see the events they are invited to. Anything event-specific (an FAQ answer
 * about the Nikkah, say) gets an `eventIds` tag so it is hidden from everyone else.
 * "server-only" makes the build fail if a Client Component imports this file, which would
 * ship every event's details to every guest's browser.
 */
import "server-only";
import type { Accommodation, EventId, Family, FaqItem, RecommendationGroup, WeddingEvent, WeddingPartyMember } from "./types";

export const couple = {
  // TODO: confirm spelling and the order you want displayed everywhere.
  names: ["Hridee", "Nyimul"] as const,
  /** Shown in the footer / FAQ so guests can reach you with questions. */
  contactEmail: "hrideeandnyimul@gmail.com",
};

export const wedding = {
  city: "Atlanta, Georgia",
  /** ISO date. The RSVP form closes after this day. Change rsvpDeadlineText along with it. */
  rsvpDeadline: "2027-02-15",
  /** How the deadline reads on the site, as in "Please RSVP by ...". */
  rsvpDeadlineText: "February 15th, right after Valentine's Day!",
  unpluggedCeremony: true, // TODO: decide (guide: say whether ceremony/reception are unplugged)
};

/**
 * Colors to wear, shown on each event's card. Up to 7 per event, per family's side. A guest sees
 * the list for the tab their row is on (Nyimul's Family or Hridee's Family).
 * Paste any of these: "#F5EBE0", "F5EBE0", "rgb(245, 235, 224)".
 * To give the sides different colors for the Nikkah or Reception, give each side its own list,
 * the way the Holud does. An empty list hides the colors for that event.
 */
const nikkahColors = ["#FFE4E1", "#FBF0C4", "#D0F0C0", "#E3DAF0", "#D5E9F5"]; // misty rose, butter yellow, tea green, lilac, sky
// Reception colors are off for now (an empty list hides the swatches). To bring them back,
// uncomment this line and use `receptionColors` for both sides in `reception` below.
// const receptionColors = ["#64403e", "#413C58", "#6b4423", "#b8860b", "#f7e7ce", "#000000", "#FFFFFF"]; // chocolate plum, vintage grape, brown bark, dark goldenrod, champagne mist, black, white

export const eventColors: Record<EventId, Record<Family, string[]>> = {
  nikkah: { nyimul: nikkahColors, hridee: nikkahColors },
  holud: {
    nyimul: ["#191970", "#F77FBE", "#FFD700", "#DBB2D1", "#7FB3E6"], // midnight blue, bright pink, gold, soft pink, cool horizon
    hridee: ["#E8701A", "#2E8B57", "#FFD700", "#FFA000", "#50C878"], // deep orange, sea green, gold, amber, emerald
  },
  reception: { nyimul: [], hridee: [] }, // no palette for now; see receptionColors above
};

/**
 * The line above the swatches on each event card. It has to make clear that one of these
 * colors is fine and so is a mix; nobody needs to wear all of them.
 */
export const colorsToWearLabel = "Wear any of these colors, or mix them";

export const events: WeddingEvent[] = [
  {
    id: "nikkah",
    name: "Nikkah",
    date: "2027-04-09",
    startTime: "09:30",
    venue: {
      name: "TPC Sugarloaf",
      address: "2595 Sugarloaf Club Dr, Duluth, GA 30097",
      website: "",
      mapsUrl: "",
      directions: "",
    },
    dressCode: "", // TODO
    description: "", // TODO: what the ceremony is, roughly how long, seating, modest dress note if any
    guestNotes: "",
  },
  {
    id: "holud",
    name: "Gaye Holud",
    date: "2027-04-09",
    startTime: "18:30",
    venue: {
      name: "TPC Sugarloaf",
      address: "2595 Sugarloaf Club Dr, Duluth, GA 30097",
      website: "",
      mapsUrl: "",
      directions: "",
    },
    dressCode: "Dress code Holud", // TODO e.g. "Traditional South Asian attire, yellows and oranges welcome"
    description: "", // TODO: 1-2 sentences on what a Holud is, for guests who have never been to one
    guestNotes: "",
  },
  {
    id: "reception",
    name: "Reception",
    date: "2027-04-10", // TODO: confirm reception date
    startTime: "19:00",
    venue: {
      name: "Hilton Atlanta Northeast",
      address: "5993 Peachtree Industrial Blvd, Peachtree Corners, GA 30092",
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

export const accommodations: Accommodation[] = [
  {
    name: "Hilton Atlanta Northeast",
    address: "5993 Peachtree Industrial Blvd, Peachtree Corners, GA 30092",
    // Hilton's direct link: the group code and the dates are already filled in; guests can change the dates.
    bookingUrl:
      "https://www.hilton.com/en/book/reservation/rooms/?ctyhocn=ATLHPHF&arrivalDate=2027-04-09&departureDate=2027-04-11&groupCode=HNW&room1NumAdults=1&cid=OM%2CWW%2CHILTONLINK%2CEN%2CDirectLink",
    groupCode: "HNW",
    // TODO: cutoffDate and nightlyRate once the hotel confirms them.
    // Each line below is only shown to guests invited to one of its events.
    eventNotes: [
      { eventIds: ["reception"], text: "The reception is here." },
      { eventIds: ["nikkah", "holud"], text: "TPC Sugarloaf is a short drive or Uber away." },
    ],
  },
];

export const transport = {
  // TODO airport (ATL), rideshare notes, parking at each venue, shuttle between hotel and venue (if any) with times
  airport: "Hartsfield-Jackson Atlanta International (ATL)",
  parking: "",
  shuttle: "",
  rideshare: "",
};

/**
 * "While You're in Atlanta": your favorite places, mainly for out-of-town guests.
 * The section stays hidden until at least one group has a place in it. Rename the group titles,
 * add or remove groups, and add places as `{ name, blurb, url?, address? }`: `url` can be the
 * place's website or a Google Maps link, and the blurb is one short line (why you love it).
 */
export const recommendations: RecommendationGroup[] = [
  {
    title: "Restaurants",
    places: [
      // { name: "", blurb: "", url: "", address: "" },
    ],
  },
  {
    title: "Cafes",
    places: [],
  },
  {
    title: "Things to do",
    places: [],
  },
];

export const registry: { name: string; url: string; note?: string }[] = [
  // TODO { name: "", url: "" }
];

export const faq: FaqItem[] = [
  // Suggested questions. TODO: write the answers.
  // An answer that talks about one event belongs on a question tagged with that event's id;
  // otherwise every guest reads about an event they may not be invited to.
  { question: "What should I wear to each event?", answer: "" },
  { question: "I've never been to a Nikkah. What should I expect?", answer: "", eventIds: ["nikkah"] },
  { question: "I've never been to a Gaye Holud. What should I expect?", answer: "", eventIds: ["holud"] },
  { question: "How many people can I bring? Can I bring a plus-one?", answer: "" },
  { question: "Are children invited?", answer: "Yes" },
  { question: "Is there parking?", answer: "Venues have on-site free parking." },
  { question: "Will there be alcohol?", answer: "No, alcohol will not be served." },
  { question: "Is the ceremony unplugged? Can I take photos?", answer: "", eventIds: ["nikkah"] },
  {
    question: "When is the RSVP deadline, and how do I change my RSVP?",
    answer: `${wedding.rsvpDeadlineText} To change your RSVP, come back to this site by then, sign in, and send it again.`,
  },
  { question: "Who do I contact with questions?", answer: "Whoever invited you, or at "+ couple.contactEmail },
];
