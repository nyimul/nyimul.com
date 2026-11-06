/**
 * Events: one card per event a guest can read in ten seconds.
 *
 * Checklist (guide "must-haves" + "easily forgotten"): date & time, venue name + address,
 * a map (Google Maps embed or a big "Get directions" link; the link is friendlier on phones),
 * link to the venue website, dress code PER EVENT, written directions with landmarks/parking,
 * whether it is unplugged, and an "Add to calendar" link (.ics download or Google Calendar URL).
 *
 * Shows ONLY the events the signed-in party is invited to. The page passes them in already
 * filtered (see _lib/party.ts); this component never imports the full events list.
 */
import { formatDate, formatTime } from "../../_lib/format";
import type { EventId, WeddingEvent } from "../../_lib/types";

type Props = {
  events: WeddingEvent[];
  /** Events meant for only some of the party: who each one is for. See _lib/party.ts. */
  onlyFor: Partial<Record<EventId, string>>;
};

export default function Events({ events, onlyFor }: Props) {
  return (
    <section id="events" className="mx-auto max-w-3xl px-4 py-24">
      <h2 className="font-display text-4xl">{events.length === 1 ? "Your Invitation" : "Your Events"}</h2>
      {events.length === 0 ? (
        <p className="mt-8 text-muted">Your event details are on their way. Check back soon.</p>
      ) : (
        <ul className="mt-8 space-y-8">
          {events.map((event) => (
            <li key={event.id} className="rounded-2xl border border-accent-soft p-6">
              <h3 className="font-display text-2xl">{event.name}</h3>
              {onlyFor[event.id] && <p className="text-accent">Only for {onlyFor[event.id]}</p>}
              <p className="text-muted">
                {formatDate(event.date)} at {formatTime(event.startTime)}
              </p>
              <p className="mt-2">{event.venue.name}</p>
              <p className="text-muted">{event.venue.address}</p>
              {/* TODO: description, dress code, directions link, venue link, add-to-calendar */}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
