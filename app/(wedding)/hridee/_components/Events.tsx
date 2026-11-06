/**
 * Events: one card per event a guest can read in ten seconds: date and time, venue and address
 * (the venue name links to its website once content.ts has one), description, dress code,
 * directions and notes when they are filled in, "Get directions" (Google Maps) and "Add to
 * calendar" (an .ics file from /hridee/calendar), and the colours to wear.
 *
 * Shows ONLY the events the signed-in party is invited to. The page passes them in already
 * filtered (see _lib/party.ts); this component never imports the full events list.
 *
 * Colors come from `eventColors` in content.ts, for the party's own family's side. This renders
 * on the server, so the other side's colors never reach the browser.
 */
import { colorsToWearLabel, eventColors } from "../../_lib/content";
import { formatDate, formatTime, paletteColors } from "../../_lib/format";
import type { EventId, Family, Venue, WeddingEvent } from "../../_lib/types";
import { cardClass, smallButton } from "../../_lib/ui";
import { chapterPhotos } from "../../_photos";
import Section from "./Section";

type Props = {
  events: WeddingEvent[];
  /** Events meant for only some of the party: who each one is for. See _lib/party.ts. */
  onlyFor: Partial<Record<EventId, string>>;
  family: Family;
};

/** The venue's own Maps link if content.ts has one, otherwise a Google Maps search for the address. */
function directionsUrl(venue: Venue): string {
  return (
    venue.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue.name}, ${venue.address}`)}`
  );
}

function EventColors({ colors, eventName }: { colors: string[]; eventName: string }) {
  if (colors.length === 0) return null;
  return (
    <div className="mt-5 border-t border-accent-soft pt-4">
      <p className="text-[15px] font-semibold text-muted">{colorsToWearLabel}</p>
      <div
        role="img"
        aria-label={`Suggested colors to wear to the ${eventName}`}
        className="mt-2.5 flex flex-wrap gap-1.5 md:gap-2"
      >
        {colors.map((color, i) => (
          <span
            key={`${color}-${i}`}
            className="h-9 w-9 rounded-full ring-1 ring-inset ring-ink/15 md:h-10 md:w-10"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

export default function Events({ events, onlyFor, family }: Props) {
  return (
    <Section id="events" title={events.length === 1 ? "Your Invitation" : "Your Events"} photo={chapterPhotos.events}>
      {events.length === 0 ? (
        <p className="text-muted">Your event details are on their way. Check back soon.</p>
      ) : (
        <ul className="space-y-5 md:space-y-6">
          {events.map((event) => (
            <li key={event.id} className={cardClass}>
              <h3 className="text-3xl md:text-4xl">{event.name}</h3>
              {onlyFor[event.id] && (
                <p className="mt-3 inline-block rounded-full bg-accent-soft px-3 py-1.5 text-[15px] font-semibold">
                  Only for {onlyFor[event.id]}
                </p>
              )}
              <p className="mt-4 text-lg font-semibold leading-snug">{formatDate(event.date)}</p>
              <p className="text-lg text-muted">{formatTime(event.startTime)}</p>
              <p className="mt-3 text-lg leading-snug">
                {event.venue.website ? (
                  <a href={event.venue.website} target="_blank" rel="noopener noreferrer">
                    {event.venue.name}
                  </a>
                ) : (
                  event.venue.name
                )}
              </p>
              <p className="text-muted">{event.venue.address}</p>
              {event.description && <p className="mt-4">{event.description}</p>}
              {event.dressCode && <p className="mt-3">{event.dressCode}</p>}
              {event.venue.directions && <p className="mt-3 text-muted">{event.venue.directions}</p>}
              {event.guestNotes && <p className="mt-3 text-muted">{event.guestNotes}</p>}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <a href={directionsUrl(event.venue)} target="_blank" rel="noopener noreferrer" className={smallButton}>
                  Get directions
                </a>
                <a href={`/hridee/calendar/${event.id}.ics`} className={smallButton}>
                  Add to calendar
                </a>
              </div>
              <EventColors colors={paletteColors(eventColors[event.id][family])} eventName={event.name} />
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
