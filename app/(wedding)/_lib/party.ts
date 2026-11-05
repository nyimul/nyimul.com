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

/** Keep items with no `eventIds`, plus items tagged with at least one invited event. */
export function visibleTo<T extends { eventIds?: EventId[] }>(items: readonly T[], invited: readonly EventId[]): T[] {
  return items.filter((item) => !item.eventIds || item.eventIds.some((id) => invited.includes(id)));
}
