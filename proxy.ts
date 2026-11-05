/**
 * The front door of the wedding site (Next 16's name for middleware).
 *
 * Nothing under /hridee renders unless the visitor has a signed session from /hridee/enter
 * (invitation password + name lookup). Everyone else is sent to the entrance, remembering
 * where they were headed so an "RSVP here" link still lands on /hridee/rsvp afterwards.
 *
 * This is the first line of defence only. Pages and Server Actions check the session again
 * themselves (app/(wedding)/_lib/session.ts), because a proxy matcher can silently stop
 * covering a route after a refactor. The portfolio (/, /photography) is never touched.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, decodeSession } from "./app/(wedding)/_lib/sessionToken";

// Metadata files that link previews (WhatsApp, iMessage) fetch without cookies.
const PUBLIC_FILES = /^\/hridee\/(opengraph-image|twitter-image|icon|apple-icon)(\.\w+)?$/;

// Paths that do their own auth instead of the guest session:
//   /hridee/enter  the entrance itself
//   /hridee/sync   the family's Google Sheet, which sends a secret (see hridee/sync/route.ts)
const OWN_AUTH = new Set(["/hridee/enter", "/hridee/sync"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (OWN_AUTH.has(pathname) || PUBLIC_FILES.test(pathname)) {
    return NextResponse.next();
  }

  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (session?.stage === "party") {
    return NextResponse.next();
  }

  const entrance = new URL("/hridee/enter", request.url);
  if (pathname !== "/hridee") {
    entrance.searchParams.set("next", pathname);
  }
  return NextResponse.redirect(entrance);
}

export const config = {
  matcher: ["/hridee", "/hridee/:path*"],
};
