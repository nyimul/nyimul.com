/**
 * nyimul.com/hridee/admin  (private view for the two of you and the parents)
 *
 * WEDDING.md > "Seeing the data" lists the options. If you go with an admin page, this is it:
 *   - Gate it: simplest is a password form that sets an httpOnly cookie, checked in proxy.ts
 *     (so unauthenticated requests never even render this page). Supabase Auth with 6 allowed
 *     emails is the sturdier option if you want per-person logins.
 *   - Top: headcount per event (invited / yes / no / no reply yet), plus meal and dietary totals.
 *   - Table: one row per guest x event, searchable, with the party's song request and message.
 *   - "Download CSV" button (a Route Handler that streams text/csv) for seating charts and caterers.
 *   - Optional: "Sync to Google Sheet" button or automatic sync after each RSVP (see WEDDING.md).
 *
 * This page must be dynamic (reads fresh data on every request) and must never be cached or indexed.
 */
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-4xl">RSVP Dashboard</h1>
      <p className="mt-2 text-muted">TODO: gate behind a password, then show counts and the guest table.</p>
    </main>
  );
}
