/**
 * The signed session cookie that gates everything under /hridee.
 *
 * Pure functions with no Next.js imports, so both proxy.ts and server code can use them.
 * (It deliberately does not import "server-only": proxy.ts runs outside the React server
 * graph. It still never reaches the browser, because only server files import it, and the
 * secret is a non-NEXT_PUBLIC env var that is undefined in browser code anyway.)
 *
 * Format: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload, WEDDING_SESSION_SECRET)).
 * Nobody can forge or edit it without the secret. Changing the secret signs everyone out.
 *
 * Two stages:
 *   "password"  the visitor typed the invitation password but hasn't found their name yet.
 *               Short-lived, and only lets them use the name lookup.
 *   "party"     the visitor picked their party. This is what every page requires.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "hridee_session";

/** How long each stage lasts, in seconds. Browsers cap cookies at 400 days. */
export const SESSION_MAX_AGE = {
  password: 60 * 60, // 1 hour to find your name
  party: 60 * 60 * 24 * 365, // a year: guests shouldn't have to sign in twice
} as const;

export type SessionPayload =
  | { v: 1; stage: "password"; iat: number }
  | { v: 1; stage: "party"; partyId: string; iat: number };

function secret(): string {
  const value = process.env.WEDDING_SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("WEDDING_SESSION_SECRET is missing or shorter than 32 characters");
  }
  return value;
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function encodeSession(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data)}`;
}

/** Returns the payload if the token is genuine and unexpired, otherwise null. Never throws on bad input. */
export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token || token.length > 1000) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const data = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(data), "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (p.v !== 1 || typeof p.iat !== "number") return null;

  const age = Date.now() / 1000 - p.iat;
  if (p.stage === "password") {
    return age >= 0 && age < SESSION_MAX_AGE.password ? { v: 1, stage: "password", iat: p.iat } : null;
  }
  if (p.stage === "party" && typeof p.partyId === "string") {
    return age >= 0 && age < SESSION_MAX_AGE.party
      ? { v: 1, stage: "party", partyId: p.partyId, iat: p.iat }
      : null;
  }
  return null;
}

/** Only allow redirects back into the wedding site, never to another origin. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !(next === "/hridee" || next.startsWith("/hridee/"))) return "/hridee";
  if (next.startsWith("/hridee/enter")) return "/hridee";
  if (next.includes("//") || next.includes("\\")) return "/hridee";
  return next;
}
