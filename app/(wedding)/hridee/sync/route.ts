/**
 * POST nyimul.com/hridee/sync: the only door between the family's Google Sheet and the database.
 *
 * Called by scripts/wedding-sheet.gs (every 10 minutes, or from the sheet's Website menu) with
 * the Guest List; answers with a note per row and the Summary / RSVPs / Messages tabs.
 * See WEDDING.md > "The family's Google Sheet".
 *
 * Auth: `Authorization: Bearer <WEDDING_SHEET_SECRET>`. No guest session is involved, so proxy.ts
 * lets this path through and this handler is the whole check. The response holds every guest's
 * name and RSVP, so without the secret it answers nothing but an error.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { runSheetSync } from "../../_lib/sheet/sync";
import { syncRequestSchema } from "../../_lib/sheet/rows";
import { guestStore } from "../../_lib/store";

const MAX_BODY_BYTES = 2_000_000;

const fail = (status: number, message: string) =>
  Response.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store" } });

/** Constant-time compare of two strings of any length. */
function sameSecret(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.WEDDING_SHEET_SECRET;
  if (!secret || secret.length < 32) {
    return fail(503, "The website isn't set up for the sheet yet: WEDDING_SHEET_SECRET is missing on the website.");
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!token || !sameSecret(token, secret)) {
    return fail(401, "The sheet's secret doesn't match the website's. Run Website > Set up again and paste the right one.");
  }

  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return fail(413, "The Guest List is too big to send in one go.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "The sheet sent something the website couldn't read.");
  }
  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, "The sheet sent something unexpected. Make sure the Apps Script is the latest version from the repo.");
  }

  try {
    const result = await runSheetSync(guestStore(), parsed.data);
    return Response.json(result, { status: result.ok ? 200 : 409, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[wedding] sheet sync failed:", error instanceof Error ? error.message : error);
    return fail(500, "The website couldn't update its database. Nothing is lost; it will try again at the next sync.");
  }
}
