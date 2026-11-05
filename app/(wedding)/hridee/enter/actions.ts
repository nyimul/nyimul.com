"use server";

/**
 * Server Actions for the entrance: password, then name lookup, then "which one is you?".
 *
 * Each step checks the step before it on the server, using the signed session cookie, so the
 * name search can't be used without the password and a party can't be picked without both.
 * Everything a guest types is validated with zod and length-capped.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeName } from "../../_lib/names";
import { clientIp, isRateLimited, recordAttempt } from "../../_lib/rateLimit";
import { endSession, getSession, startPartySession, startPasswordSession } from "../../_lib/session";
import { safeNextPath } from "../../_lib/sessionToken";
import { guestStore } from "../../_lib/store";
import type { PartyLookupResult } from "../../_lib/types";

const TOO_MANY = "Too many tries from this device. Please wait 15 minutes, or email us and we'll help.";
const SOMETHING_WRONG = "Something went wrong on our side. Please try again in a minute.";

// ---------- Step 1: the password printed on the invitation ----------

export type PasswordState = { ok: boolean; error?: string };

/** Case, spacing and stray punctuation don't matter: "Marigold", " marigold " and "MARIGOLD!" all pass. */
function passwordMatches(typed: string): boolean {
  const expected = process.env.WEDDING_PASSWORD;
  if (!expected || !normalizeName(expected)) throw new Error("WEDDING_PASSWORD is not set");
  const digest = (s: string) => createHash("sha256").update(normalizeName(s)).digest();
  return timingSafeEqual(digest(typed), digest(expected));
}

export async function checkPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const parsed = z.string().trim().min(1).max(100).safeParse(formData.get("password"));
  if (!parsed.success) return { ok: false, error: "Please type the password from your invitation." };

  try {
    const ip = await clientIp();
    if (await isRateLimited(ip, "password")) return { ok: false, error: TOO_MANY };
    if (!passwordMatches(parsed.data)) {
      await recordAttempt(ip, "password");
      return { ok: false, error: "That's not quite it. Check the password on your invitation and try again." };
    }
  } catch (error) {
    console.error("[wedding] checkPassword:", error);
    return { ok: false, error: SOMETHING_WRONG };
  }

  await startPasswordSession();
  return { ok: true };
}

// ---------- Step 2: find your invitation by name ----------

export type LookupState =
  | { status: "idle" }
  | { status: "error"; query: string; error: string }
  | { status: "expired" }
  | { status: "none"; query: string }
  | { status: "results"; query: string; matches: PartyLookupResult[]; nonce: number };

export async function lookupParty(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const session = await getSession();
  if (!session) return { status: "expired" };

  const parsed = z.string().trim().max(100).safeParse(formData.get("name"));
  const query = parsed.success ? parsed.data : "";
  const normalized = normalizeName(query);
  if (normalized.length < 3 || normalized.split(" ").length < 2) {
    return { status: "error", query, error: "Please type your first and last name, as written on your invitation." };
  }

  try {
    const ip = await clientIp();
    if (await isRateLimited(ip, "lookup")) return { status: "error", query, error: TOO_MANY };
    await recordAttempt(ip, "lookup");

    const matches = await guestStore().findParties(normalized, 5);
    if (matches.length === 0) return { status: "none", query };
    return { status: "results", query, matches, nonce: Date.now() };
  } catch (error) {
    console.error("[wedding] lookupParty:", error);
    return { status: "error", query, error: SOMETHING_WRONG };
  }
}

// ---------- Step 3: "this is us" ----------

export async function selectParty(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/hridee/enter");

  const partyId = z.uuid().safeParse(formData.get("partyId"));
  if (!partyId.success) redirect("/hridee/enter");

  const party = await guestStore().getPartySummary(partyId.data);
  if (!party) redirect("/hridee/enter");

  await startPartySession(party.partyId);
  const next = formData.get("next");
  redirect(safeNextPath(typeof next === "string" ? next : null));
}

// ---------- "Not you? Switch" (shared family phones) ----------

export async function switchParty(): Promise<void> {
  await endSession();
  redirect("/hridee/enter");
}
