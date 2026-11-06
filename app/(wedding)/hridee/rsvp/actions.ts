"use server";

/**
 * Server Actions for the RSVP form.
 *
 * "use server" at the top means every exported function here runs ONLY on the server, but can
 * be called from a Client Component like a normal async function (Next turns the call into a
 * POST behind the scenes). The party being edited ALWAYS comes from the signed session cookie,
 * never from the browser, so nobody can answer for someone else's invitation.
 *
 * Rules (see WEDDING.md > Security):
 *   - Validate and trim all input with zod. Cap string lengths.
 *   - Every guestId / eventId must belong to the signed-in party and its invitations.
 *   - Enforce party_events.max_guests, guest_ids (who may come to which event) and
 *     parties.others_need_named here, not just in the UI.
 *   - Return plain objects ({ ok, error }), never raw DB errors.
 */
import { z } from "zod";
import { wedding } from "../../_lib/content";
import { isRsvpClosed } from "../../_lib/format";
import { getSession } from "../../_lib/session";
import { guestStore } from "../../_lib/store";
import type { RsvpSubmission } from "../../_lib/types";

const RsvpInput = z.object({
  answers: z
    .array(
      z.object({
        guestId: z.uuid(),
        eventId: z.enum(["nikkah", "holud", "reception"]),
        attending: z.boolean(),
      }),
    )
    .max(300),
  slotNames: z.record(z.uuid(), z.string().trim().max(100)),
  dietary: z.record(z.uuid(), z.string().trim().max(300)),
  songRequest: z.string().trim().max(200),
  message: z.string().trim().max(1000),
});

export type RsvpInput = z.input<typeof RsvpInput>;
export type SubmitResult = { ok: true } | { ok: false; error: string };

const fail = (error: string): SubmitResult => ({ ok: false, error });

export async function submitRsvp(input: RsvpInput): Promise<SubmitResult> {
  const session = await getSession();
  if (session?.stage !== "party") return fail("You've been signed out. Please reload the page and sign in again.");
  if (isRsvpClosed(wedding.rsvpDeadline)) return fail("RSVPs have closed. Please email us if your plans have changed.");

  const parsed = RsvpInput.safeParse(input);
  if (!parsed.success) return fail("Something in the form didn't look right. Please check it and try again.");
  const { answers, slotNames, dietary, songRequest, message } = parsed.data;

  try {
    const store = guestStore();
    const party = await store.getRsvpPartyData(session.partyId);
    if (!party) return fail("We couldn't find your invitation. Please reload the page and sign in again.");

    const guests = new Map(party.guests.map((g) => [g.id, g]));
    const seats = new Map(party.invitations.map((i) => [i.eventId, i.maxGuests]));
    const allowed = new Map(party.invitations.map((i) => [i.eventId, i.guestIds ? new Set(i.guestIds) : null]));

    // Every answer must be about this party's guests and this party's events, once each,
    // and every guest needs an answer for every event. Only invited guests can say yes.
    const seen = new Set<string>();
    for (const a of answers) {
      const key = `${a.guestId}:${a.eventId}`;
      if (!guests.has(a.guestId) || !seats.has(a.eventId) || seen.has(key)) return fail("That RSVP doesn't match your invitation.");
      const only = allowed.get(a.eventId);
      if (a.attending && only && !only.has(a.guestId)) return fail("That RSVP doesn't match your invitation.");
      seen.add(key);
    }
    if (seen.size !== guests.size * seats.size) return fail("Please answer for everyone before sending.");
    if (Object.keys(slotNames).some((id) => !guests.get(id)?.isSlot)) return fail("That RSVP doesn't match your invitation.");
    if (Object.keys(dietary).some((id) => !guests.has(id))) return fail("That RSVP doesn't match your invitation.");

    for (const [eventId, max] of seats) {
      const coming = answers.filter((a) => a.eventId === eventId && a.attending).length;
      if (coming > max) return fail(`You have ${max} ${max === 1 ? "seat" : "seats"} for one of the events. Please choose who is coming.`);
    }

    // The sheet's "Others need a named guest": open spots can't come to an event alone.
    if (party.othersNeedNamed) {
      for (const eventId of seats.keys()) {
        const only = allowed.get(eventId);
        const namedInvited = party.guests.some((g) => !g.isSlot && (!only || only.has(g.id)));
        const coming = answers.filter((a) => a.eventId === eventId && a.attending).map((a) => guests.get(a.guestId));
        if (namedInvited && coming.length > 0 && coming.every((g) => g?.isSlot)) {
          return fail("The others can only come with someone named on this RSVP. Please check your answers.");
        }
      }
    }

    // Names for open spots are optional. An unused spot loses any name it had.
    const attendingAny = (guestId: string) => answers.some((a) => a.guestId === guestId && a.attending);
    const finalSlotNames: RsvpSubmission["slotNames"] = {};
    for (const g of party.guests.filter((x) => x.isSlot)) {
      finalSlotNames[g.id] = attendingAny(g.id) ? slotNames[g.id] || null : null;
    }

    await store.saveRsvp(party.partyId, {
      rsvps: answers.map((a) => ({ ...a, dietaryNotes: dietary[a.guestId] || null })),
      slotNames: finalSlotNames,
      songRequest: songRequest || null,
      message: message || null,
    });
    return { ok: true };
  } catch (error) {
    console.error("[wedding] submitRsvp:", error);
    return fail("Something went wrong on our side and your RSVP wasn't saved. Please try again in a minute.");
  }
}
