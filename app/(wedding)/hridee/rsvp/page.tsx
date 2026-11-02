/**
 * nyimul.com/hridee/rsvp  (guest-list lookup RSVP)
 *
 * The flow, one step per screen, big buttons, no scrolling needed on a phone:
 *
 *   1. FIND   "Enter your first and last name as it appears on your invitation."
 *             -> lookupParty(query) returns 0..n minimal matches (party name + first names only).
 *             0 matches: friendly message + contact email, never "not invited".
 *   2. PICK   If more than one match, show them as cards; the guest taps theirs.
 *   3. RESPOND For EACH event the party is invited to (party_events), a card with:
 *               - one Yes/No toggle per named guest (and empty name fields for "+1"/child slots)
 *               - the server enforces max_guests for that event; the UI greys out extra toggles
 *               - meal choice (only if that event has options) + dietary needs per guest
 *             Then, once per party: song request, a message to the couple.
 *   4. CONFIRM Summary of what they said, "Send" button, then a thank-you screen.
 *             To change later: look yourself up again, previous answers are pre-filled.
 *
 * Implementation notes:
 *   - This page is a Server Component shell; the stepper is a Client Component (RsvpForm.tsx)
 *     because it holds form state. It calls the Server Actions in ./actions.ts.
 *   - React 19's useActionState gives you pending/errors for each action without extra libs.
 *   - After wedding.rsvpDeadline, render a "RSVPs have closed" message instead of the form.
 *   - Rate-limit the lookup (see WEDDING.md > Security) so nobody can enumerate the guest list.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { wedding } from "../../_lib/content";

export const metadata: Metadata = { title: "RSVP" };

export default function RsvpPage() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Link href="/hridee" className="text-sm">
        &larr; Back
      </Link>
      <h1 className="mt-6 font-display text-4xl">RSVP</h1>
      <p className="mt-2 text-muted">Please reply by {wedding.rsvpDeadline}.</p>
      {/* TODO: <RsvpForm /> (Client Component with the 4-step flow) */}
    </main>
  );
}
