/**
 * GET /hridee/calendar/<eventId>.ics  ("Add to calendar" on an event card)
 *
 * Returns a calendar file for one event. Only for the signed-in party, and only for an event
 * they are invited to, so a Reception-only guest can't fetch the Nikkah's time and place here.
 * proxy.ts already sends visitors without a session to the entrance; this checks again.
 * The event is worded for the guest's side (eventsFor), so the file name and title say "Akht"
 * for Hridee's side.
 */
import { buildIcs } from "../../../_lib/calendar";
import { eventsFor, getCurrentParty } from "../../../_lib/party";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const party = await getCurrentParty();
  const event = party && eventsFor(party.invitedEventIds, party.family).find((e) => `${e.id}.ics` === file);
  if (!event) {
    return new Response("Not found", { status: 404 });
  }

  const fileName = event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || event.id;
  return new Response(buildIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
