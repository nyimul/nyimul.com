/**
 * Server-only Supabase client for the wedding RSVP system.
 *
 * This file must NEVER be imported from a Client Component. It uses the service-role key,
 * which bypasses Row Level Security, so it can only exist on the server.
 *
 * Setup (see WEDDING.md > Backend):
 *   1. Create a NEW Supabase project just for the wedding (keep it separate from the mobile app).
 *   2. npm i @supabase/supabase-js server-only
 *   3. Put SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (dev) and Vercel env vars (prod).
 *      No NEXT_PUBLIC_ prefix. Ever. That prefix ships the value to the browser.
 *   4. Uncomment below.
 *
 * The `import "server-only"` line makes the build FAIL if this file is ever pulled into client code,
 * which is exactly the safety net you want around a key like this.
 */

// import "server-only";
// import { createClient } from "@supabase/supabase-js";
//
// export function supabaseAdmin() {
//   const url = process.env.SUPABASE_URL;
//   const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
//   if (!url || !key) throw new Error("Supabase env vars are missing");
//   return createClient(url, key, { auth: { persistSession: false } });
// }

export {};
