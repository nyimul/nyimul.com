/**
 * Reading and writing the /hridee session from Server Components and Server Actions.
 *
 * proxy.ts already bounces visitors without a session, but Server Actions are not reliably
 * covered by the proxy (see node_modules/next/dist/docs/.../proxy.md), so every page and
 * action checks again with getSession() / requirePartyId(). Never trust a partyId sent by the browser.
 */
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  decodeSession,
  encodeSession,
  type SessionPayload,
} from "./sessionToken";

const cookieOptions = {
  httpOnly: true,
  // Plain http on localhost can't set secure cookies in every browser; production is always https.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/hridee",
};

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
});

/** The signed-in party's id, or a redirect to the entrance. For pages. */
export async function requirePartyId(): Promise<string> {
  const session = await getSession();
  if (session?.stage !== "party") redirect("/hridee/enter");
  return session.partyId;
}

/** Server Actions only (cookies can't be set while a page renders). */
export async function startPasswordSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession({ v: 1, stage: "password", iat: now() }), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE.password,
  });
}

/** Server Actions only. */
export async function startPartySession(partyId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, encodeSession({ v: 1, stage: "party", partyId, iat: now() }), {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE.party,
  });
}

/** Server Actions only. */
export async function endSession() {
  const store = await cookies();
  store.delete({ name: SESSION_COOKIE, path: cookieOptions.path });
}

function now() {
  return Math.floor(Date.now() / 1000);
}
