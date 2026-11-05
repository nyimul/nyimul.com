/**
 * Server-only Supabase client for the wedding RSVP system.
 *
 * This file must NEVER be imported from a Client Component. It uses the project's SECRET key
 * (sb_secret_..., the successor of the old service_role key), which bypasses Row Level Security,
 * so it can only exist on the server.
 *
 * Setup (see WEDDING.md > Backend):
 *   1. Create a NEW Supabase project just for the wedding (keep it separate from the mobile app).
 *   2. Run supabase/schema.sql in its SQL editor.
 *   3. Put SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local (dev) and Vercel env vars (prod).
 *      No NEXT_PUBLIC_ prefix. Ever. That prefix ships the value to the browser.
 *
 * The `import "server-only"` line makes the build FAIL if this file is ever pulled into client code,
 * which is exactly the safety net you want around a key like this.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SECRET_KEY are missing. For local preview without a database, set WEDDING_DEMO_DATA=1 in .env.local.",
    );
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
