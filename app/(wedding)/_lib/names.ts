/**
 * Name normalisation and matching, for the guest lookup and the Google Sheet sync.
 *
 * normalizeName MUST produce the same text as the SQL in supabase/schema.sql
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

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

const wordsWithin = (small: string, big: string) => {
  const words = new Set(big.split(" "));
  return small.split(" ").every((w) => words.has(w));
};

/**
 * Same person, spelled a little differently: "Nadia Karim" / "Nadiya Karim", "Omar Rahman" /
 * "Omar F Rahman". Short names get less slack, so "Sam Lee" and "Tom Lee" stay two people.
 * Used by the sheet sync to keep someone's RSVP when the family fixes a spelling.
 */
export function similarNames(a: string, b: string): boolean {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return false;
  const len = Math.max(x.length, y.length);
  const slack = len < 8 ? 1 : len < 14 ? 2 : 3;
  return x === y || levenshtein(x, y) <= slack || wordsWithin(x, y) || wordsWithin(y, x);
}

// ---------- The guest lookup ----------

/** First letter, then the consonants without h/w/y, doubles collapsed: "chowdhury" and "chaudhry" are both "cdr". */
function skeleton(word: string): string {
  return (word[0] + word.slice(1).replace(/[aeiouhwy]/g, "")).replace(/(.)\1+/g, "$1");
}

/** One typo, or two in a long word ("Muhammad" / "Mohammed"), or the same consonants ("Chowdhury" / "Chaudhry"). */
function closeWords(a: string, b: string): boolean {
  if (Math.min(a.length, b.length) >= 4 && levenshtein(a, b) <= (Math.max(a.length, b.length) >= 8 ? 2 : 1)) return true;
  const s = skeleton(a);
  return s.length >= 3 && s === skeleton(b);
}

export type NameMatch = "exact" | "close";

/**
 * Does a typed name (normalized) match one of these names (normalized)? Every typed word has to
 * match a different word of the SAME name, in any order, so middle names, "Karim Farid" and
 * "Karim Family" all work, but "Farid Rahman" doesn't match a party with Farid Karim and Ayesha Rahman.
 */
export function matchName(query: string, names: string[]): NameMatch | null {
  const typed = query.split(" ").filter(Boolean);
  let best: NameMatch | null = null;
  for (const name of names) {
    const words = name.split(" ").filter(Boolean);
    if (typed.length === 0 || typed.length > words.length) continue;
    const used = new Set<number>();
    const unmatched = typed.filter((t) => {
      const i = words.findIndex((w, k) => !used.has(k) && w === t);
      if (i >= 0) used.add(i);
      return i < 0;
    });
    if (unmatched.length === 0) return "exact";
    const allClose = unmatched.every((t) => {
      const i = words.findIndex((w, k) => !used.has(k) && closeWords(t, w));
      if (i >= 0) used.add(i);
      return i >= 0;
    });
    if (allClose) best = "close";
  }
  return best;
}

/**
 * The lookup's rule: when anyone matches exactly, show only exact matches, so a correctly typed
 * name never shows other families. Only when nothing matches exactly, show the close ones.
 */
export function pickMatches<T>(items: T[], namesOf: (item: T) => string[], query: string): T[] {
  const exact: T[] = [];
  const close: T[] = [];
  for (const item of items) {
    const m = matchName(query, namesOf(item));
    if (m === "exact") exact.push(item);
    else if (m === "close") close.push(item);
  }
  return exact.length > 0 ? exact : close;
}
