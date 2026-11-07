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
    dressCode: "", // TODO e.g. "Traditional South Asian attire, yellows and oranges welcome"
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
 * "Our Favorite Food/Cafes in Atlanta": your favorite places, mainly for out-of-town guests.
 * Groups (Food, Cafes...) each list their places nearest the hotel first, sorted by `minutes`:
 * the drive from the hotel without traffic, rounded to 5 (from a routing check on 6 Nov 2026).
 * Every row opens the place in Google Maps as a search for its name and address, so there are
 * no map links to collect; `url` overrides that if you ever want one. `what` is a few words
 * under the name, `area` the town or neighborhood as a guest would say it. Add a place anywhere
 * in its group and the site sorts it in. The section stays hidden until a group has a place.
 */
export const recommendations: RecommendationGroup[] = [
  {
    title: "Food",
    places: [
      { name: "Pokeworks", what: "Our favorite poke", area: "Peachtree Corners", minutes: 10, address: "5160 Town Center Blvd Ste 520, Peachtree Corners, GA 30092" },
      { name: "Java Saga", what: "Taiwanese", area: "Buford Highway", minutes: 10, address: "5145 Buford Hwy NE Ste E, Doraville, GA 30340" },
      { name: "China Hot Pot", what: "Hot pot", area: "Buford Highway", minutes: 10, address: "5090 Buford Hwy NE Ste 104, Doraville, GA 30340" },
      { name: "LanZhou Ramen", what: "Hand-pulled noodles", area: "Buford Highway", minutes: 10, address: "5231 Buford Hwy NE, Doraville, GA 30340" },
      { name: "Cafe Maiko", what: "Dessert", area: "Buford Highway", minutes: 10, address: "5306 Buford Hwy NE Ste B, Doraville, GA 30340" },
      { name: "Dhaka Guys", what: "Bengali snacks and street food", area: "Buford Highway", minutes: 10, address: "5382 Buford Hwy NE Ste C, Doraville, GA 30340" },
      { name: "Pad Thai", what: "Our favorite Thai", area: "Duluth", minutes: 15, address: "2180 Pleasant Hill Rd B3, Duluth, GA 30096" },
      { name: "Big Sister's Kitchen", what: "Our favorite Korean", area: "Duluth", minutes: 15, address: "3095 Peachtree Industrial Blvd Ste 100, Duluth, GA 30097" },
      { name: "Jeni's Splendid Ice Creams", what: "Ice cream", area: "Several locations", minutes: 15 },
      { name: "Cow Wow", what: "Our favorite Korean BBQ", area: "Suwanee", minutes: 25, address: "2850 Lawrenceville-Suwanee Rd Ste F, Suwanee, GA 30024" },
      { name: "Circle Poke", what: "Our favorite poke", area: "West Midtown", minutes: 25, address: "1000 Northside Dr NW Ste 950, Atlanta, GA 30318" },
      { name: "Botiwalla by Chai Pani", what: "Our favorite Indian", area: "Ponce City Market", minutes: 30, address: "675 Ponce De Leon Ave NE, Atlanta, GA 30308" },
      { name: "Agavero", what: "Our favorite Mexican", area: "West Midtown", minutes: 30, address: "1133 Huff Rd NW Ste C, Atlanta, GA 30318" },
    ],
  },
  {
    title: "Cafes",
    places: [
      { name: "Paris Baguette", what: "Bakery", area: "Several locations", minutes: 10 },
      { name: "Qamaria Yemeni Coffee Co.", area: "Duluth", minutes: 15, address: "2645 N Berkeley Lake Rd NW Ste 221, Duluth, GA 30096" },
      { name: "Kafeiin", area: "Duluth", minutes: 15, address: "3865 Venture Dr A, Duluth, GA 30096" },
      { name: "Cafe Flat", area: "Duluth", minutes: 15, address: "2227 Duluth Hwy #109, Duluth, GA 30097" },
      { name: "Summit Coffee", area: "Brookhaven", minutes: 15, address: "4001 Peachtree Rd NE, Atlanta, GA 30319" },
      { name: "Refuge Coffee Co.", area: "Midtown", minutes: 25, address: "1280 Peachtree St NE Ste 100-A, Atlanta, GA 30309" },
      { name: "The Chai Box Cafe", area: "West Midtown", minutes: 25, address: "1963 Howell Mill Rd NW, Atlanta, GA 30318" },
      { name: "Raani Coffee Roasters", area: "East Atlanta", minutes: 30, address: "720 Moreland Ave SE Ste B, Atlanta, GA 30316" },
    ],
  },
  {
    title: "Things to do",
    places: [
      // { name: "", what: "", area: "", minutes: 0, address: "" },
    ],
  },
];

/**
 * Optional, for a real map: in the Google Maps app, save all the places above to one list
 * (Saved > New list), then Share > Copy link and paste it here. A "See them all on a map"
 * button then appears above the lists. Empty means no button.
 */
export const recommendationsMapUrl = "";

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
