import "server-only";
import { demoStore } from "./demo";
import { supabaseStore } from "./supabase";
import type { GuestStore } from "./types";

export type { AttemptKind, GuestStore } from "./types";

/** The real database, unless WEDDING_DEMO_DATA=1 on your own machine. */
export function guestStore(): GuestStore {
  if (process.env.WEDDING_DEMO_DATA === "1") {
    // Vercel sets VERCEL=1 on every deployment (production and preview). The fake guest list
    // must never be what real guests sign in against.
    if (process.env.VERCEL) {
      throw new Error("WEDDING_DEMO_DATA is for local preview only. Remove it from the Vercel environment variables.");
    }
    return demoStore;
  }
  return supabaseStore;
}
