/**
 * Hero: the first screen. Full-bleed engagement photo, your names, the date, the city,
 * and one big RSVP button. Nothing else.
 *
 * Checklist: names, date (guide: "date and time"), location at a glance.
 * Photo: <Image src={heroPhoto} fill priority placeholder="blur" sizes="100vw" />  (the ONLY priority image)
 * Optional: a countdown. It needs the current time so it must be a Client Component
 * ("use client" in its own file, e.g. Countdown.tsx) and should render the server-known
 * date first to avoid a hydration mismatch.
 */
import { couple, events, wedding } from "../../_lib/content";

export default function Hero() {
  const first = events[0];

  return (
    <section
      id="top"
      className="flex min-h-svh flex-col items-center justify-center px-4 text-center"
    >
      <h1 className="font-display text-5xl md:text-7xl">
        {couple.names[0]} &amp; {couple.names[1]}
      </h1>
      <p className="mt-4 text-lg text-muted">
        {/* TODO: format the date nicely (Intl.DateTimeFormat) */}
        {first.date} · {wedding.city}
      </p>
    </section>
  );
}
