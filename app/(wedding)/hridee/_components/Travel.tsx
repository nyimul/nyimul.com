/**
 * Travel: everything an out-of-town guest needs, in this order:
 *   1. Accommodation: hotel block(s) with booking link, group code, cut-off date (guide "easily forgotten")
 *   2. Getting there: airport (ATL), rideshare, driving, parking at each venue
 *   3. Shuttle/transport between hotel and venues, with times and how to book (guide)
 * Data: `accommodations`, `transport` in _lib/content.ts.
 * Keep it scannable: short headings, bold the booking code and cut-off date.
 */
import { transport } from "../../_lib/content";

export default function Travel() {
  return (
    <section id="travel" className="mx-auto max-w-3xl px-4 py-24">
      <h2 className="font-display text-4xl">Travel &amp; Stay</h2>
      <p className="mt-4 text-muted">Fly into {transport.airport}.</p>
      {/* TODO: accommodations, parking, shuttle */}
    </section>
  );
}
