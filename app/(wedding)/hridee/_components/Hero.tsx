/**
 * Hero: the first screen. One full-bleed engagement photo (portrait on phones, the wide one on
 * desktop), the monogram big in the sky (drawn by Nav.tsx, which later docks it in the corner),
 * your names, a personal welcome, the date of the guest's first event, the city, and one big
 * RSVP button. Nothing else.
 *
 * Deliberately NOT wrapped in <Reveal>: it must be visible before any JavaScript runs, and the
 * photo is the only image on the page that loads eagerly.
 */
import { couple, wedding } from "../../_lib/content";
import { formatDate } from "../../_lib/format";
import type { WeddingEvent } from "../../_lib/types";
import { heroPhoto } from "../../_photos";
import HeroRsvpButton from "./HeroRsvpButton";
import Photo from "./Photo";

type Props = {
  /** The signed-in party's name, e.g. "The Karim Family". */
  guestName: string;
  /** The party's first event, or undefined if they have none yet. */
  firstEvent?: WeddingEvent;
};

export default function Hero({ guestName, firstEvent }: Props) {
  return (
    <section id="top" className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-ink text-white">
      <Photo photo={heroPhoto} sizes="100vw" eager />
      <div aria-hidden="true" className="shade-hero absolute inset-0" />

      <div className="relative mx-auto w-full max-w-6xl px-6 pb-10 pt-40 short:pb-7 md:px-12 md:pb-16">
        <div className="md:max-w-xl">
          <p className="eyebrow shadow-text text-white/85">Welcome, {guestName}</p>
          <h1 className="shadow-text mt-3 text-[46px] text-white short:mt-2 short:text-[38px] md:text-7xl">
            {couple.names[0]} <em className="ampersand text-white/75">&amp;</em> {couple.names[1]}
          </h1>
          <p className="shadow-text mt-4 text-lg leading-snug short:mt-2 short:text-base md:text-xl">
            {firstEvent && (
              <>
                {formatDate(firstEvent.date)}
                <span className="hidden md:inline"> · </span>
                <br className="md:hidden" />
              </>
            )}
            {wedding.city}
          </p>
          <div className="mt-7 short:mt-4 md:max-w-xs">
            <HeroRsvpButton href="/hridee/rsvp" />
          </div>
        </div>
      </div>

      {/* A small "there is more below" hint. Decorative only. */}
      <div
        aria-hidden="true"
        className="absolute bottom-3 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-white/80"
      />
    </section>
  );
}
