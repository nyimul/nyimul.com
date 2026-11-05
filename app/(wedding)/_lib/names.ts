/**
 * Name normalisation for the guest lookup.
 *
 * This MUST produce the same text as the SQL in supabase/schema.sql
 * (private.refresh_party_search_name): lowercase, accents stripped, anything that isn't a
 * letter or digit turned into a single space, trimmed. "  Rahmán, O'Neil " -> "rahman o neil".
 */

// unaccent() in Postgres also expands these; NFD alone leaves them untouched.
const SPECIAL: Record<string, string> = { ß: "ss", æ: "ae", œ: "oe", ø: "o", đ: "d", ł: "l", ı: "i" };

export function normalizeName(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[ßæœøđłı]/g, (c) => SPECIAL[c] ?? c)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "Ayesha Rahman" -> "Ayesha". Used to tell apart two parties with the same display name. */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
