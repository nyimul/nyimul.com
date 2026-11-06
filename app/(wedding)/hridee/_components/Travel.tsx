/**
 * Travel: everything an out-of-town guest needs, in this order:
 *   1. Getting there: airport (ATL), parking, rideshare, shuttle (shown as soon as they are filled in)
 *   2. Accommodation: hotel block(s), one card each, with the booking button and group code
 * Data: `transport`, `accommodations` in _lib/content.ts.
 *
 * A hotel's `eventNotes` are filtered by the party's invitations (like the FAQ), so a line such
 * as "The reception is here" never reaches a guest who isn't invited to the reception.
 */
import { accommodations, transport } from "../../_lib/content";
import { visibleTo } from "../../_lib/party";
import type { EventId } from "../../_lib/types";
import { cardClass, smallButton } from "../../_lib/ui";
import { chapterPhotos } from "../../_photos";
import Section from "./Section";

export default function Travel({ invitedEventIds }: { invitedEventIds: EventId[] }) {
  return (
    <Section id="travel" title="Travel & Stay" photo={chapterPhotos.travel}>
      <p className="text-lg">Fly into {transport.airport}.</p>
      {transport.parking && <p className="mt-4">{transport.parking}</p>}
      {transport.rideshare && <p className="mt-4">{transport.rideshare}</p>}
      {transport.shuttle && <p className="mt-4">{transport.shuttle}</p>}

      {accommodations.length > 0 && (
        <ul className="mt-8 space-y-5">
          {accommodations.map((hotel) => (
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
    </Section>
  );
}
