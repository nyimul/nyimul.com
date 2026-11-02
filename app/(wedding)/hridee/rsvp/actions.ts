"use server";

/**
 * Server Actions for the RSVP flow.
 *
 * "use server" at the top means every exported function here runs ONLY on the server, but can
 * be called from a Client Component like a normal async function (Next turns the call into a
 * POST behind the scenes). This is where the Supabase service-role client is used, and why the
 * key never reaches the browser.
 *
 * Rules for every action (see WEDDING.md > Security):
 *   - Validate and trim all input (zod is the usual choice: npm i zod). Cap string lengths.
 *   - Never trust IDs from the client without checking they belong to the party being edited.
 *   - Enforce party_events.max_guests here, not just in the UI.
 *   - Return plain objects ({ ok, error, data }), never throw raw DB errors to the browser.
 *   - Rate-limit lookupParty per IP (headers() gives you x-forwarded-for on Vercel).
 */
import type { EventId, PartyLookupResult, Rsvp } from "../../_lib/types";

/**
 * Step 1. Find parties whose search_name matches the typed name.
 * Normalise the query the same way search_name was stored (lowercase, trim, collapse spaces,
 * strip accents). Require at least 3 characters. Return at most ~5 results and only the
 * minimal fields in PartyLookupResult.
 */
export async function lookupParty(_query: string): Promise<PartyLookupResult[]> {
  // TODO: supabaseAdmin().from("parties").select(...).ilike("search_name", `%${normalised}%`).limit(5)
  return [];
}

/**
 * Step 2/3. Load one party: its guests, the events it is invited to (with max_guests),
 * and any existing RSVPs so the form can be pre-filled for edits.
 */
export async function getParty(_partyId: string) {
  // TODO
  return null;
}

/**
 * Step 4. Save the whole response in one go.
 * Validate: every guestId belongs to partyId; every eventId is in the party's invitations;
 * attending count per event <= max_guests; names for blank slots are filled if attending.
 * Then upsert rsvps (unique on guest_id + event_id) and party_responses.
 */
export async function submitRsvp(_input: {
  partyId: string;
  rsvps: Rsvp[];
  guestNames: Record<string, string>; // guestId -> name typed for "+1"/child slots
  songRequest?: string;
  message?: string;
}): Promise<{ ok: boolean; error?: string }> {
  // TODO
  return { ok: false, error: "Not implemented yet" };
}

export type { EventId };
