/**
 * RsvpCta: a short, high-contrast band with the RSVP deadline and one big button to /hridee/rsvp.
 * Appears early (right after Events) because it is the one action every guest must take.
 * After the deadline passes, swap the button for a "RSVPs are closed, email us" line.
 */
import Link from "next/link";
import { couple, wedding } from "../../_lib/content";
import { formatDate } from "../../_lib/format";

export default function RsvpCta() {
  return (
    <section id="rsvp" className="px-4 py-16 text-center">
      <p className="text-lg">Please RSVP by {formatDate(wedding.rsvpDeadline)}</p>
      <Link
        href="/hridee/rsvp"
        className="mt-4 inline-block rounded-full bg-accent px-8 py-4 text-lg text-paper"
      >
        RSVP
      </Link>
      <p className="mt-4 text-sm text-muted">Questions? {couple.contactEmail}</p>
    </section>
  );
}
