/**
 * Travel: everything an out-of-town guest needs, in this order:
 *   1. Getting there: airport (ATL), parking, rideshare, shuttle (shown as soon as they are filled in)
 *   2. Accommodation: hotel block(s), one card each, with the booking button and group code,
 *      then "Other hotels nearby": the cheaper ones (`alternative: true`) as short rows with a
 *      Map link, so the main hotel stays the obvious choice
 * Data: `transport`, `accommodations` in _lib/content.ts.
 *
 * A hotel's `eventNotes` are filtered by the party's invitations (like the FAQ), so a line such
 * as "The reception is here" never reaches a guest who isn't invited to the reception.
 */
import { accommodations, otherHotelsNote, transport } from "../../_lib/content";
import { visibleTo } from "../../_lib/party";
import type { EventId } from "../../_lib/types";
import { cardClass, smallButton } from "../../_lib/ui";
import { chapterPhotos } from "../../_photos";
import Section from "./Section";

/** A Google Maps search for the hotel (name and address), which also offers booking; opens the Maps app on phones. */
const mapsUrl = (name: string, address?: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address ? `${name}, ${address}` : name)}`;

export default function Travel({ invitedEventIds }: { invitedEventIds: EventId[] }) {
  const mainHotels = accommodations.filter((hotel) => !hotel.alternative);
  const otherHotels = accommodations.filter((hotel) => hotel.alternative);
  return (
    <Section id="travel" title="Travel & Stay" photo={chapterPhotos.travel}>
      <p className="text-lg">Fly into {transport.airport}.</p>
      {transport.parking && <p className="mt-4">{transport.parking}</p>}
      {transport.rideshare && <p className="mt-4">{transport.rideshare}</p>}
      {transport.shuttle && <p className="mt-4">{transport.shuttle}</p>}

      {mainHotels.length > 0 && (
        <ul className="mt-8 space-y-5">
          {mainHotels.map((hotel) => (
            <li key={hotel.name} className={cardClass}>
              <h3 className="text-2xl md:text-3xl">{hotel.name}</h3>
              {hotel.address && <p className="mt-1 text-muted">{hotel.address}</p>}
              {visibleTo(hotel.eventNotes ?? [], invitedEventIds).map((note) => (
                <p key={note.text} className="mt-3">
                  {note.text}
                </p>
              ))}
              {hotel.notes && <p className="mt-3">{hotel.notes}</p>}
              {hotel.groupCode && (
                <p className="mt-3">
                  Group code <span className="font-semibold">{hotel.groupCode}</span>
                </p>
              )}
              {/* cutoffDate and nightlyRate need short labels ("Book by", "Rate"): decide the wording first. */}
              {hotel.bookingUrl && (
                <div className="mt-5">
                  <a href={hotel.bookingUrl} target="_blank" rel="noopener noreferrer" className={smallButton}>
                    Book a room
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {otherHotels.length > 0 && (
        <div className="mt-10">
          <h3 className="text-2xl md:text-3xl">Other hotels nearby</h3>
          {otherHotelsNote && <p className="mt-2 text-muted">{otherHotelsNote}</p>}
          <ul className="mt-4 divide-y divide-accent-soft border-y border-accent-soft">
            {otherHotels.map((hotel) => (
              <li key={hotel.name}>
                <a
                  href={mapsUrl(hotel.name, hotel.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-4 py-4 text-ink no-underline"
                >
                  <span className="min-w-0">
                    <span className="block text-xl font-semibold leading-snug group-hover:underline">{hotel.name}</span>
                    {hotel.address && <span className="mt-0.5 block text-muted">{hotel.address}</span>}
                  </span>
                  <span className="shrink-0 text-right">
                    {hotel.minutes !== undefined && <span className="block text-lg leading-snug">{hotel.minutes} min</span>}
                    <span className="mt-1 block text-sm font-semibold text-accent">Map</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}
