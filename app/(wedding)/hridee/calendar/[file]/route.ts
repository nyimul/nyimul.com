/**
 * GET /hridee/calendar/<eventId>.ics  ("Add to calendar" on an event card)
 *
 * Returns a calendar file for one event. Only for the signed-in party, and only for an event
 * they are invited to, so a Reception-only guest can't fetch the Nikkah's time and place here.
 * proxy.ts already sends visitors without a session to the entrance; this checks again.
 */
import { buildIcs } from "../../../_lib/calendar";
import { events } from "../../../_lib/content";
import { getCurrentParty } from "../../../_lib/party";

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const party = await getCurrentParty();
  const event = events.find((e) => `${e.id}.ics` === file);
  if (!party || !event || !party.invitedEventIds.includes(event.id)) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(buildIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
