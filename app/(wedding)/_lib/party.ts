/**
 * "Who is looking at this page, and what are they invited to?"
 *
 * Every /hridee page renders on the server for ONE party. Filtering happens here, before any
 * HTML is produced, so a Reception-only guest's page never contains a word about the Nikkah,
 * not even hidden in the markup or the JavaScript.
 */
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { events } from "./content";
import { whoFor } from "./format";
import { getSession } from "./session";
import { guestStore } from "./store";
import type { EventId, PartySummary, WeddingEvent } from "./types";

/** The signed-in party, or null (no session, or the party was deleted from the guest list). */
export const getCurrentParty = cache(async (): Promise<PartySummary | null> => {
  const session = await getSession();
  if (session?.stage !== "party") return null;
  return guestStore().getPartySummary(session.partyId);
});

/** For pages: the signed-in party, or a trip back to the entrance. */
export async function requireParty(): Promise<PartySummary> {
  const party = await getCurrentParty();
  if (!party) redirect("/hridee/enter");
  return party;
}

/** The party's events, in the order they appear in content.ts. */
export function eventsFor(invited: readonly EventId[]): WeddingEvent[] {
  return events.filter((e) => invited.includes(e.id));
}

/**
 * Events meant for only some of the party, and who each one is for. The whole family signs in
 * the same way, so the home page has to say that the Nikkah is "Only for Farid Karim".
 */
export async function eventsForSome(partyId: string): Promise<Partial<Record<EventId, string>>> {
  const party = await guestStore().getRsvpPartyData(partyId);
  const onlyFor: Partial<Record<EventId, string>> = {};
  for (const { eventId, guestIds } of party?.invitations ?? []) {
    if (!guestIds) continue;
    const invited = party!.guests.filter((g) => guestIds.includes(g.id));
    onlyFor[eventId] = whoFor(
      invited.flatMap((g) => (!g.isSlot && g.fullName ? [g.fullName] : [])),
      invited.filter((g) => g.isSlot).length,
    );
  }
  return onlyFor;
}

/** Keep items with no `eventIds`, plus items tagged with at least one invited event. */
export function visibleTo<T extends { eventIds?: EventId[] }>(items: readonly T[], invited: readonly EventId[]): T[] {
  return items.filter((item) => !item.eventIds || item.eventIds.some((id) => invited.includes(id)));
}
