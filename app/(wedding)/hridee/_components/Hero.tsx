/**
 * Hero: the first screen. Full-bleed engagement photo, your names, a personal welcome,
 * the date of the guest's first event, the city, and one big RSVP button. Nothing else.
 *
 * Checklist: names, date (guide: "date and time"), location at a glance.
 * Photo: <Image src={heroPhoto} fill priority placeholder="blur" sizes="100vw" />  (the ONLY priority image)
 * Optional: a countdown. It needs the current time so it must be a Client Component
 * ("use client" in its own file, e.g. Countdown.tsx) and should render the server-known
 * date first to avoid a hydration mismatch. Pass it the date as a prop, never the events list.
 */
import { couple, wedding } from "../../_lib/content";
import { formatDate } from "../../_lib/format";
import type { WeddingEvent } from "../../_lib/types";

type Props = {
  /** The signed-in party's name, e.g. "The Karim Family". */
  guestName: string;
  /** The party's first event, or undefined if they have none yet. */
  firstEvent?: WeddingEvent;
};

export default function Hero({ guestName, firstEvent }: Props) {
  return (
    <section
      id="top"
      className="flex min-h-svh flex-col items-center justify-center px-4 text-center"
    >
      <p className="text-lg text-muted">Welcome, {guestName}</p>
      <h1 className="mt-2 font-display text-5xl md:text-7xl">
        {couple.names[0]} &amp; {couple.names[1]}
      </h1>
      <p className="mt-4 text-lg text-muted">
        {firstEvent ? `${formatDate(firstEvent.date)} · ` : ""}
        {wedding.city}
      </p>
    </section>
  );
}
