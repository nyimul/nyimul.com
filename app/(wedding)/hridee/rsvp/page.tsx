/**
 * nyimul.com/hridee/rsvp
 *
 * The visitor already proved who they are at /hridee/enter, so there is no lookup here: the
 * party comes from the signed session, and the form shows one screen per event THEY are
 * invited to (party_events), with only the guests invited to that event, then extras, then a
 * confirmation. Previous answers are pre-filled, so changing an RSVP is just coming back to this page.
 *
 * This page is a Server Component: it loads the party's data and passes only that party's
 * guests and events to RsvpForm (a Client Component, because it holds form state).
 * After wedding.rsvpDeadline it shows a "RSVPs have closed" message instead.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { couple, wedding } from "../../_lib/content";
import { formatDate, isRsvpClosed } from "../../_lib/format";
import { eventsFor } from "../../_lib/party";
import { requirePartyId } from "../../_lib/session";
import { guestStore } from "../../_lib/store";
import RsvpForm, { type RsvpEvent } from "./RsvpForm";

export const metadata: Metadata = { title: "RSVP" };

export default async function RsvpPage() {
  const partyId = await requirePartyId(); // reads the cookie, so this page is never prerendered
  const party = await guestStore().getRsvpPartyData(partyId);
  if (!party) redirect("/hridee/enter");

  const closed = isRsvpClosed(wedding.rsvpDeadline);
  const invitations = new Map(party.invitations.map((i) => [i.eventId, i]));
  const everyone = party.guests.map((g) => g.id);
  const events: RsvpEvent[] = eventsFor(party.invitedEventIds).map((e) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    startTime: e.startTime,
    venueName: e.venue.name,
    maxGuests: invitations.get(e.id)?.maxGuests ?? 0,
    guestIds: invitations.get(e.id)?.guestIds ?? everyone,
  }));

  const initialAnswers: Record<string, boolean> = {};
  const initialDietary: Record<string, string> = {};
  for (const r of party.rsvps) {
    initialAnswers[`${r.guestId}:${r.eventId}`] = r.attending;
    if (r.dietaryNotes) initialDietary[r.guestId] = r.dietaryNotes;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Link href="/hridee" className="text-sm">
        &larr; Back
      </Link>
      <h1 className="mt-6 font-display text-4xl">RSVP for {party.displayName}</h1>
      {closed ? (
        <p className="mt-4 text-lg">
          RSVPs have closed. If your plans have changed, please email{" "}
          <a href={`mailto:${couple.contactEmail}`}>{couple.contactEmail}</a>.
        </p>
      ) : events.length === 0 ? (
        <p className="mt-4 text-lg">
          Your invitation details are on their way. Questions? Email{" "}
          <a href={`mailto:${couple.contactEmail}`}>{couple.contactEmail}</a>.
        </p>
      ) : (
        <>
          <p className="mt-2 text-muted">Please reply by {formatDate(wedding.rsvpDeadline)}.</p>
          <RsvpForm
            guests={party.guests}
            events={events}
            initialAnswers={initialAnswers}
            initialDietary={initialDietary}
            initialSongRequest={party.response?.songRequest ?? ""}
            initialMessage={party.response?.message ?? ""}
            submittedAt={party.response?.submittedAt ?? null}
            deadline={wedding.rsvpDeadline}
            contactEmail={couple.contactEmail}
          />
        </>
      )}
    </main>
  );
}
