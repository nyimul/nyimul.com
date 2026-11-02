/**
 * Events: one card per event (Holud, Nikkah, Reception) a guest can read in ten seconds.
 *
 * Checklist (guide "must-haves" + "easily forgotten"): date & time, venue name + address,
 * a map (Google Maps embed or a big "Get directions" link; the link is friendlier on phones),
 * link to the venue website, dress code PER EVENT, written directions with landmarks/parking,
 * whether it is unplugged, and an "Add to calendar" link (.ics download or Google Calendar URL).
 *
 * Not every guest is invited to every event. This section shows all three; the RSVP page
 * only shows the ones a party is invited to.
 *
 * Everything comes from _lib/content.ts (the `events` array). Nothing is hardcoded here.
 */
import { events } from "../../_lib/content";
import { formatTime } from "../../_lib/format";

export default function Events() {
  return (
    <section id="events" className="mx-auto max-w-3xl px-4 py-24">
      <h2 className="font-display text-4xl">The Events</h2>
      <ul className="mt-8 space-y-8">
        {events.map((event) => (
          <li key={event.id} className="rounded-2xl border border-accent-soft p-6">
            <h3 className="font-display text-2xl">{event.name}</h3>
            <p className="text-muted">
              {event.date} · {formatTime(event.startTime)} · {event.venue.name}
            </p>
            {/* TODO: description, dress code, address + directions link, venue link, add-to-calendar */}
          </li>
        ))}
      </ul>
    </section>
  );
}
