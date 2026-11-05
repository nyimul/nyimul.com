/**
 * Per-IP limits for the entrance, so nobody can guess the password or page through the
 * guest list by trying names. Counts live in the lookup_attempts table (or the demo store).
 */
import "server-only";
import { headers } from "next/headers";
import { guestStore, type AttemptKind } from "./store";

const WINDOW_MS = 15 * 60 * 1000;

/** Wrong passwords allowed, and name searches allowed, per IP per 15 minutes. */
const LIMITS: Record<AttemptKind, number> = {
  password: 10,
  lookup: 30,
};

/** Vercel puts the real client address first in x-forwarded-for. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function isRateLimited(ip: string, kind: AttemptKind): Promise<boolean> {
  const count = await guestStore().countRecentAttempts(ip, kind, Date.now() - WINDOW_MS);
  return count >= LIMITS[kind];
}

export async function recordAttempt(ip: string, kind: AttemptKind): Promise<void> {
  await guestStore().recordAttempt(ip, kind);
}
