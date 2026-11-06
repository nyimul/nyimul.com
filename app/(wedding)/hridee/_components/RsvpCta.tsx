/**
 * RsvpCta: a full-width photo band with the RSVP deadline and one big button to /hridee/rsvp,
 * written in the sky above the two of you. Appears right after Events because it is the one
 * action every guest must take. After the deadline it shows the "RSVPs have closed" line instead.
 */
import Link from "next/link";
import { couple, wedding } from "../../_lib/content";
import { isRsvpClosed } from "../../_lib/format";
import { lightButton } from "../../_lib/ui";
import { chapterPhotos } from "../../_photos";
import Photo from "./Photo";
import Reveal from "./Reveal";

export default function RsvpCta() {
  const closed = isRsvpClosed(wedding.rsvpDeadline);

  return (
    <Reveal>
      <section id="rsvp" className="relative h-[82svh] max-h-[820px] min-h-[560px] overflow-hidden bg-ink text-white">
        <Photo photo={chapterPhotos.rsvp} sizes="100vw" />
        <div aria-hidden="true" className="shade-band absolute inset-0" />
        <div className="relative mx-auto max-w-xl px-6 pt-12 text-center md:pt-20">
          <p className="shadow-text font-display text-3xl md:text-4xl">Please RSVP by {wedding.rsvpDeadlineText}</p>
          {closed ? (
            <p className="shadow-text mt-5 text-lg">
              RSVPs have closed. If your plans have changed, please email{" "}
              <a href={`mailto:${couple.contactEmail}`} className="text-white">
                {couple.contactEmail}
              </a>
              .
            </p>
          ) : (
            <div className="mx-auto mt-6 max-w-[240px]">
              <Link href="/hridee/rsvp" className={lightButton}>
                RSVP
              </Link>
            </div>
          )}
          <p className="shadow-text mt-5 text-[15px] text-white/90">
            Questions?{" "}
            <a href={`mailto:${couple.contactEmail}`} className="text-white">
              {couple.contactEmail}
            </a>
          </p>
        </div>
      </section>
    </Reveal>
  );
}
