# Wedding website: nyimul.com/hridee

The complete plan for the wedding site. Everything decided so far, everything still to decide, the full content checklist, and the rules the site has to follow. Read this before touching anything under `app/(wedding)/`.

Status (Nov 2026): skeleton in place, no real content, no backend yet. Build passes.

---

## 1. Principles

1. **Simple first.** The audience includes grandparents on old phones. If a feature makes the site harder to use, it loses. One long page plus a separate RSVP page. Big type, big buttons, few nav items.
2. **Stunning second.** The engagement photos do the heavy lifting. Typography-led layout, one accent colour, lots of air. Two kinds of motion only: content fading in as you scroll, and photos crossfading behind it.
3. **Mobile first.** Design at 375px wide, then widen. Most guests will open the link from WhatsApp or a text.
4. **Unlisted.** Not linked from nyimul.com, not indexed, not advertised anywhere except the invitations. `nyimul.com/hridee` is the home of all wedding things; the portfolio never mentions it and vice versa.
5. **Secure.** Guest data (names, emails, dietary needs, who is coming) never reaches the browser except the slice a guest needs to see their own party. Secrets live on the server only.
6. **Everything in one place.** All copy and facts in `_lib/content.ts`; all photos registered in `_photos/index.ts`; all theme tokens in `wedding.css`. Changing a time or a colour is a one-line edit.

---

## 2. Architecture

### Two sites, one repo, zero shared styling

```
app/
  favicon.ico                      shared by both sites (override for the wedding with app/(wedding)/hridee/icon.png)
  (portfolio)/                     route group: NOT part of the URL
    layout.tsx                     root layout #1: dark kantha portfolio
    globals.css
    page.tsx                       nyimul.com
    components/ProjectsDropdown.tsx
    photography/page.tsx           nyimul.com/photography
  (wedding)/                       route group: NOT part of the URL
    layout.tsx                     root layout #2: own <html>/<body>, fonts, metadata (robots: noindex)
    wedding.css                    Tailwind import + theme tokens + base styles + reduced-motion rules
    _lib/
      content.ts                   ALL wedding copy/facts (names, events, venues, FAQ, registry...)
      types.ts                     shared TS types; RSVP types mirror supabase/schema.sql
      supabase.server.ts           server-only Supabase client (commented out until the project exists)
    _hooks/useInView.ts            IntersectionObserver hook powering Reveal + PhotoBackdrop (TODO)
    _photos/                       engagement photos + index.ts manifest (see README.md there)
    hridee/
      page.tsx                     nyimul.com/hridee: composes the sections below
      _components/                 one file per section: Nav, Hero, Events, RsvpCta, OurStory, Travel,
                                   Faq, WeddingParty, ThingsToDo, Registry, Gallery, Footer,
                                   PhotoBackdrop (scroll crossfade), Reveal (fade-in wrapper)
      rsvp/page.tsx                nyimul.com/hridee/rsvp: 4-step lookup flow (TODO: RsvpForm.tsx)
      rsvp/actions.ts              Server Actions: lookupParty, getParty, submitRsvp (stubs)
      admin/page.tsx               nyimul.com/hridee/admin: private dashboard (option, see section 7)
supabase/schema.sql                draft database schema with RLS locked down
.env.example                       every env var the site uses; copy to .env.local
next.config.ts                     X-Robots-Tag noindex for /hridee + baseline security headers + image formats
```

How it works, in one paragraph: a folder named `(something)` is a **route group**. It organises files without appearing in the URL. Any `layout.tsx` with no layout above it is a **root layout**, and a project can have several. There is no `app/layout.tsx` any more, so `(portfolio)/layout.tsx` and `(wedding)/layout.tsx` are two independent roots, each owning its own `<html>`, `<body>`, fonts and CSS. Verified: `/` and `/hridee` load different stylesheets. Folders starting with `_` are **private folders**: Next never turns them into routes, so `_components`, `_lib`, `_photos` are safe places for code and assets.

Caveats to remember:
- Navigating between the two sites is a full page load, not a client-side transition. Irrelevant here: nothing links between them.
- Never create the same URL in both groups (e.g. `(portfolio)/hridee` and `(wedding)/hridee`); the build errors.
- 404s work without a top-level layout (verified). If you ever want a *custom* 404 shared by both sites, Next 16 has an experimental `app/global-not-found.tsx` for exactly this case.

### Running and deploying

- `npm run dev` then open `http://localhost:3000/hridee`.
- Hosting: Vercel, same project as the portfolio. The wedding site is just more routes.
- Env vars: Vercel > Project > Settings > Environment Variables. Set them for Production and Preview separately. Local dev uses `.env.local` (gitignored). `.env.example` lists them all.
- Turn on **Deployment Protection** for Preview deployments in Vercel so half-finished versions of the wedding site aren't on a public URL.
- `git add -A` will see the moves into `(portfolio)/` as renames, not delete+add, so history is preserved.

---

## 3. Photos

Full guidance is in `app/(wedding)/_photos/README.md`. The short version:

- Put design photos in `app/(wedding)/_photos/` and register them in `index.ts`. Import them (`import hero from "./hero.jpg"`) rather than putting them in `public/`: you get intrinsic sizes (no layout jumps), automatic blur placeholders, forever-cached URLs and on-demand AVIF/WebP resizing from `next/image`.
- Export at 2400px long edge (full-bleed) or 1600px (gallery/story), JPEG ~80. 300-800 KB each. `next/image` scales down, never up, so camera originals are wasted bytes.
- **Strip EXIF before committing** (GPS coordinates of the shoot location, camera serials). Export without metadata or run `exiftool -all= -tagsfromfile @ -icc_profile *.jpg`.
- Only the hero gets `priority`. Every `<Image>` gets a real `alt` and a correct `sizes`.
- Watch Vercel's image optimization quota if the gallery grows large; move a big gallery to Supabase Storage + `images.remotePatterns` if needed.

---

## 4. Content checklist (sayi.do guide, complete)

Source: https://sayi.do/articles/complete-guide-wedding-website-must-haves. Every item below, with where it lives in the code. Tick as you go.

### Must-haves ("the obvious")
- [ ] **RSVP information**: deadline + what you need from guests. `content.ts > wedding.rsvpDeadline`, `RsvpCta`, `rsvp/`
- [ ] **Date and time** of each event. `content.ts > events[].date/startTime`, `Hero`, `Events`
- [ ] **Venue and address** with a **map** and a **link to the venue's website**. `events[].venue`, `Events`
- [ ] **Dress code** per event, incl. practical footwear advice (grass, heels, outdoor). `events[].dressCode`, `Events`, FAQ
- [ ] **Your story**: how you met, the proposal, the history. `content.ts > story`, `OurStory`

### Should-haves ("the easily forgotten details")
- [ ] **Wedding location**: map plus **written directions with landmarks**, parking, which entrance. `events[].venue.directions`
- [ ] **Accommodation**: hotel block(s), booking link, group code, cut-off date, Airbnb suggestions. `content.ts > accommodations`, `Travel`
- [ ] **Transport**: shuttles/buses/rideshare between hotel and venues, how to book, times. `content.ts > transport`, `Travel`
- [ ] **Wishing well / registry**: link(s) + a gentle sentence. `content.ts > registry`, `Registry`
- [ ] **Childcare**: are kids invited (per event), babysitter details, who to contact. `content.ts > childcare`, `Travel`, FAQ
- [ ] **FAQ section** (the guide calls it essential for large or complex weddings; three events, two venues qualifies). `content.ts > faq`, `Faq`

### Nice-to-haves ("hidden gems")
- [ ] **Local recommendations**: favourite spots, ideally tied to your relationship. `content.ts > thingsToDo`, `ThingsToDo`
- [ ] **Video message**: a personal welcome. Optional; a short muted loop or a private YouTube embed in `Hero`/`OurStory`
- [ ] **Photo gallery**: milestones, engagement photos, a "then and now". `_photos/index.ts > galleryPhotos`, `Gallery`
- [ ] **Wedding party introductions**: photos + short bios. `content.ts > weddingParty`, `WeddingParty`

### Information to collect FROM guests (RSVP form fields)
- [ ] **Meal choice** (if an event offers options). `rsvps.meal_choice`
- [ ] **Dietary requirements and allergies**. `rsvps.dietary_notes`
- [ ] **Song requests** for the DJ. `party_responses.song_request`
- [ ] **Trivia questions** for a reception game (optional extra field). add to `party_responses` if wanted
- [ ] **Video messages** to play at the reception (guide suggests a private YouTube upload). Optional; link in the thank-you screen
- [ ] **Photos** for a reception slideshow. Optional; a shared album link on the thank-you screen
- [ ] **Accommodation requirements**, asked early when local options are limited. Optional checkbox: "We'd like info about the hotel block"
- [ ] **A message to the couple**. `party_responses.message`

### The guide's final checklist (everything above, plus)
- [ ] Whether the **ceremony and reception are unplugged**. `content.ts > wedding.unpluggedCeremony`, `Events`, FAQ
- [ ] **Wedding hashtag**. `content.ts > couple.hashtag`, `Footer`, FAQ

### When and how to share
- [ ] Share only **after the date and venues are locked**.
- [ ] Keep the site **easy to update** when anything changes (that is what `content.ts` is for).
- [ ] Put the URL on the **save-the-dates**, as a written link **or a QR code** pointing at `https://nyimul.com/hridee`.
- [ ] Send save-the-dates **6-12 months before** the wedding. April 2027 means that window is open now.

### Aligning your wedding style
- [ ] Digital save-the-dates and thank-you cards can **match the website's design** (same fonts, palette, photo treatment), which saves time and money. Reuse the tokens from `wedding.css`.

### Extra, because this is a Bengali wedding across three events
- [ ] A short, warm "what to expect" for each event for guests who have never been to a Holud or Nikkah: what happens, how long, when to arrive, seating.
- [ ] Dress-code colours per event (Holud yellows/oranges? decide), modesty notes if any, where to buy/rent if you want to help non-Desi guests.
- [ ] Food: halal, vegetarian options, alcohol yes/no, per event.
- [ ] Prayer space / timing around salah if relevant.
- [ ] Gift etiquette if you want to say anything (registry vs. envelopes vs. "your presence is enough").
- [ ] Who is invited to what, made obvious: the RSVP page only shows a party their own events, and the Events section can say "invitations note which events you're invited to".

---

## 5. Events and the guest-list model

### The events
| Event | Expected size | Venue (TODO confirm) |
|---|---|---|
| Gaye Holud | 150-200 | TPC Sugarloaf, Duluth, GA |
| Nikkah | 50-75 | TPC Sugarloaf, Duluth, GA |
| Reception | ~400 | Hilton Atlanta Northeast, Peachtree Corners, GA |

Not everyone is invited to every event, so **invitations are per party per event**, each with its own seat count.

### The model (see `supabase/schema.sql`)
- **party**: one invitation / household. Has a `display_name` ("The Hoque Family") and a `search_name` used for lookup.
- **guests**: the people in the party. Named people are rows with names. A "+1" or an un-named child is a row with `full_name = null` that the guest fills in when they RSVP.
- **party_events**: one row per event the party is invited to, with `max_guests` = how many seats they have *at that event*. A couple gets 2. A family of five gets 5 at the reception, maybe 5 at the Holud, and no row for the Nikkah.
- **rsvps**: one row per guest per event (attending yes/no, meal, dietary).
- **party_responses**: the once-per-party answers (song request, message).

This handles every case you described: couples (2 seats), families with kids (more seats, children can be named or left as slots), people invited to one event only, and the reception's 400 vs. the Nikkah's 50-75.

### The lookup flow (keep it to one question per screen)
1. **Find**: "Enter your first and last name as it appears on your invitation." Matches on `search_name`; needs 3+ characters; returns at most ~5 parties and only `displayName` + first names. Zero matches shows a friendly "we couldn't find that, try another spelling or email us", never "you're not invited".
2. **Pick**: if more than one party matches, tap yours.
3. **Respond**: one card per event *you* are invited to. For each named guest a big Yes / No. Extra un-named slots appear as "Guest name" fields. The UI greys out toggles beyond `max_guests`; the server re-checks it anyway. Meal choice only where the event has one; dietary notes per guest. Then once: song request, message.
4. **Confirm**: summary, Send, thank-you screen (with the hotel block link and the hashtag). To change an answer later, look yourself up again; answers are pre-filled.

Edge cases to decide:
- Two parties with the same family name (two "Rahman Family"s): show both with first names so people can tell them apart, or add a street/city hint in `display_name`.
- An optional **invite code** printed on the card gives an exact-match path for anyone the name search can't find.
- Guests who RSVP for someone else in their party: allowed by design (one person per household usually does it).
- Deadline: after `wedding.rsvpDeadline`, the form shows "RSVPs have closed, email us".

### Seeding the list
You will build the guest list in a spreadsheet anyway. Plan a one-off import script (`scripts/import-guests.ts`) that reads a CSV with columns like `party, side, guest names, holud seats, nikkah seats, reception seats, email, phone` and inserts parties, guests and party_events. Run it locally with the service-role key; never ship it.

---

## 6. Backend

**Decision: a NEW Supabase project, used only for the wedding.** Keep it separate from the mobile app's project: different data, different keys, different lifetime (you can pause or delete it after the wedding), and no risk of a wedding bug touching the app.

Why Supabase at all: it is Postgres with a dashboard, you already know it, the free tier is far beyond what 400 guests generate, and the Supabase MCP connector is attached to this Claude project if you want help running SQL later.

Setup steps:
1. Create the project (region: US East). Save the URL and the **service-role** key into `.env.local` and Vercel. Ignore the anon key; the site never uses it.
2. Run `supabase/schema.sql` in the SQL editor. RLS is enabled with no policies, so the anon key can see nothing even if it leaked.
3. `npm i @supabase/supabase-js server-only zod`
4. Uncomment `_lib/supabase.server.ts`. The `import "server-only"` line makes the build fail if that file is ever imported into client code.
5. Implement the three actions in `rsvp/actions.ts`, then the `RsvpForm` client component.
6. Import the guest list (section 5).

Why Server Actions and not an API route: a Server Action is a function that runs on the server and can be called from a form or a click handler as if it were local. Next handles the POST, serialisation and CSRF origin check. The Supabase key stays in the function. For a CSV download you will still want a Route Handler (`app/(wedding)/hridee/admin/export/route.ts`) because that returns a file, not data.

Alternative if you want zero database: see "Google Sheets as the only backend" below.

---

## 7. Seeing the data (you, your fiancée, four parents)

Options, from least to most work. They combine.

**A. Supabase dashboard.** You and your fiancée can read tables and run `select * from rsvp_overview` there. Fine for the two of you; not for parents.

**B. Shared Google Sheet mirror (recommended for the parents).** Supabase stays the source of truth. A server function writes the `rsvp_overview` view into a Google Sheet (one tab per event, plus totals) using the Google Sheets API and a *service account*: you create the service account in Google Cloud, share the sheet with its email as an editor, store its JSON key in `GOOGLE_SERVICE_ACCOUNT_JSON_B64`. Trigger it either right after every `submitRsvp` (simplest, always fresh) or on a schedule (Vercel Cron; note the Hobby plan limits how often crons run). Parents get a **view-only** link to the sheet and never touch the site. They can sort, filter, print, and make their own seating tabs in a separate sheet.

**C. Admin page at `/hridee/admin` (recommended for the two of you).** Headcounts per event (invited / yes / no / no reply), meal and dietary totals, a searchable table, a "Download CSV" button, a "Sync to Sheet" button. Gate it with a password (httpOnly cookie, checked in `proxy.ts`) or, sturdier, Supabase Auth with six allowed emails. Parents *could* use this too if you prefer one place; a password they type once on their phone is manageable.

**D. Google Sheets as the only backend (no Supabase).** The guest list lives in a "Guests" tab you maintain; RSVPs are appended to an "RSVPs" tab. How the approach differs:
- Reads: each lookup fetches the whole Guests tab through the Sheets API (fine for ~250 parties; cache it in memory for a minute).
- Writes: appending a row is safe; *editing* an existing RSVP means find-the-row-then-update, which races if two people submit at once. You would treat the tab as an append-only log and take the latest row per guest/event.
- No schema, no uniqueness, no foreign keys, no RLS: the server code has to enforce allowances and validity on its own, and anyone with edit access to the sheet can break a column and take down RSVPs.
- Quotas: Sheets API has per-minute limits; a wedding won't hit them, but a retry loop on an error could.
- You lose `rsvp_overview`, SQL totals, and the ability to query ad hoc.
- Pros: nothing to host but the site, parents see live data with zero sync code, and the guest list is edited where you already built it.

**Recommendation:** Supabase as source of truth (A for free), **B** for the parents, and **C** for yourselves when you have time. If you want the smallest possible build, do A + B and skip C.

---

## 8. Security

### Unlisted (done in the skeleton, keep it that way)
- [x] No link from nyimul.com or the portfolio nav. The wedding `Footer` doesn't link back either.
- [x] `robots: { index: false, follow: false }` in `app/(wedding)/layout.tsx` (inherited by every wedding page). Verified: `/` has no robots meta, `/hridee` does.
- [x] `X-Robots-Tag: noindex, nofollow, noarchive, noimageindex` header for `/hridee/:path*` in `next.config.ts`. Verified on `/hridee`, `/hridee/rsvp`, `/hridee/admin`, and not on `/`.
- [ ] Never add `/hridee` to a `robots.txt` or a sitemap. `robots.txt` is public; a `Disallow: /hridee` line *advertises* the URL.
- [ ] Don't post the URL on social media. Save-the-dates, WhatsApp, text.
- [ ] Vercel: Deployment Protection on Preview deployments.
- [ ] Remember that unlisted is not private: anyone with the link can open it. The RSVP lookup is the only thing that touches guest data, and it only reveals a party to someone who already knows a name on it. If that is not enough, add the password gate.

### Optional: password gate (decide before launch)
A speed bump, not a vault: one shared word printed on the invitation.
- `proxy.ts` at the repo root (Next 16's name for middleware), `matcher: ["/hridee/:path*"]`, excluding `/hridee/enter` and static files.
- No valid cookie: redirect to `/hridee/enter?next=<path>`.
- `/hridee/enter` is a one-field form. Its Server Action compares the input to `WEDDING_PASSWORD` with `crypto.timingSafeEqual`, then sets an `httpOnly`, `secure`, `sameSite=lax` cookie for ~1 year containing an HMAC of the password (not the password itself).
- Trade-off: one more step for older guests. Mitigate with clear wording ("the word is on your invitation") and the long cookie lifetime.

### Secrets
- [ ] Service-role key, admin password, Google service-account key: server only, in Vercel env vars and `.env.local`. **Never** `NEXT_PUBLIC_`.
- [ ] `_lib/supabase.server.ts` imports `server-only`. Any file that touches the key should.
- [ ] `.env*` is gitignored; `.env.example` is the only env file in git and contains no values.
- [ ] Rotate the service-role key if it is ever pasted anywhere (chat, screenshot, Slack).

### Guest data
- [ ] RLS on every table, no policies. The anon key is dead weight; don't even put it in env.
- [ ] Lookup returns the minimum: party display name + first names. No emails, phones, notes, or other parties.
- [ ] Lookup needs 3+ characters, returns at most ~5 results, and is **rate-limited per IP** (Upstash Redis free tier, or a small `lookup_attempts` table) so nobody can enumerate the guest list. Log repeated misses.
- [ ] Every Server Action validates input with zod, trims, caps lengths (names 100, messages 1000), and checks that every `guestId`/`eventId` belongs to the party being edited.
- [ ] `max_guests` is enforced on the server. The UI greying out toggles is a courtesy.
- [ ] Admin page: `force-dynamic`, behind auth, never cached, never indexed (already under `/hridee`).
- [ ] Don't show a public "who's coming" list. Don't put anyone's home address on the site, including yours (registry links only).
- [ ] Parents' Google Sheet: view-only. It contains everyone's names, emails and dietary needs.
- [ ] After the wedding: export what you want to keep, then delete the Supabase project.

### Photos
- [ ] Strip EXIF/GPS from every photo before committing (`_photos/README.md`).
- [ ] Only publish photos of other people (wedding party) with their OK.

### Headers (done)
- [x] `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` on every route.
- [ ] A Content-Security-Policy later, once you know which embeds you use (Google Maps iframe, YouTube).

---

## 9. Design direction: simple but stunning

**Look.** Paper-light background, near-black ink, one warm accent, a display serif for names and headings, a quiet sans for everything else (placeholders are Cormorant Garamond + Inter; pick the real pair with your fiancée, ideally matching the invitations). Text column max ~720px. Full-bleed photo bands between text sections. The photos *are* the design; the UI gets out of the way.

**Motion rules.**
- Exactly two effects: `Reveal` (content fades in and rises 16px as it enters the viewport, 500-700ms, ease-out, once) and `PhotoBackdrop` (a fixed photo layer behind the content that crossfades to the next photo as each section passes, ~1s). Both built on `useInView`, no animation library (consistent with the portfolio decision).
- Nothing bounces, nothing parallaxes on mobile (it stutters), no scroll hijacking, no autoplaying video with sound, no loading screens.
- Everything honours `prefers-reduced-motion` (already in `wedding.css`; `useInView` should return `true` immediately for those users).
- Opacity and transform only. Never animate `top`/`height`/`width`.

**Photo transitions on scroll (your "slowly transition as we scroll" idea).** `PhotoBackdrop` renders 6-10 photos stacked in a `fixed inset-0 -z-10` layer. Each content section carries a photo index; when a section crosses 50% of the viewport, that index becomes active and its photo fades to `opacity-100` while the previous fades out. Sections sit on translucent paper panels so text stays readable over any photo. On phones use portrait crops. Load only the active and next photo eagerly. The no-JS alternative, CSS scroll-driven animations (`animation-timeline: view()`), is lovely but patchy on older phones, so the observer approach is the default.

**For older guests specifically.**
- Base font 17px+, line-height 1.6, contrast at least 4.5:1 (check the accent on paper).
- Tap targets 44px minimum, generous spacing between them, no hover-only interactions, no carousels that need swiping to see information.
- Nav: 3 anchor links + one RSVP button. Consider a fixed bottom bar on mobile (thumb reach).
- RSVP: one question per screen, visible labels (not placeholders), a big Next button, a plain-language confirmation, and the contact email on every step.
- Dates written out ("Saturday, April 3, 2027 at 6:00 PM"), never `04/03`.
- "Add to calendar" and "Get directions" as buttons, because those are the two things people come back for.
- FAQ with native `<details>` so it works everywhere, including with JS off.

**Performance budget.** Hero visible under 2.5s on 4G: `priority` on the hero image only, `sizes` on every image, `display: swap` on fonts, no component libraries. Check with Lighthouse on a throttled mobile profile before launch.

**Test on real devices**: an older iPhone, a budget Android, and one parent.

---

## 10. Build order

**Phase 1: skeleton (done).** Route groups, wedding root layout, section stubs, content file, schema draft, this document.

**Phase 2: static content.**
- Fill `content.ts` (names, dates, venues, dress codes, FAQ answers). Confirm every TODO.
- Implement `useInView`, `Reveal`, then `Hero`, `Events` (with map link, venue link, add-to-calendar), `RsvpCta`, `OurStory`, `Travel`, `Faq`, `Footer`.
- Pick fonts and palette; set them in `wedding.css` and `layout.tsx`.

**Phase 3: photos and polish.**
- Prepare and commit photos (`_photos/README.md`), register in `index.ts`.
- `PhotoBackdrop`, `Gallery`, `WeddingParty`, `ThingsToDo`, `Registry`.
- Mobile pass at 375px; reduced-motion pass; Lighthouse pass.

**Phase 4: RSVP.**
- New Supabase project, run `schema.sql`, env vars, uncomment the server client.
- `lookupParty` / `getParty` / `submitRsvp` with zod validation and rate limiting.
- `RsvpForm` client component (4 steps, `useActionState`).
- Guest import script from your spreadsheet.
- Test with fake parties: couple, family with kids, Nikkah-only, reception-only, duplicate surname, edit-after-submit, after-deadline.

**Phase 5: visibility and launch.**
- Google Sheet mirror for parents (and/or admin page), CSV export.
- Decide on the password gate; implement `proxy.ts` + `/hridee/enter` if yes.
- Optional: confirmation email to the guest after RSVP (Resend free tier) and a notification to you.
- OG image (`app/(wedding)/hridee/opengraph-image.png`) so the link previews nicely in WhatsApp; keep the description generic.
- Vercel preview protection on, env vars set for Production, final security checklist pass.
- Save-the-dates with the URL / QR code.

**After the wedding.** Swap the RSVP page for a thank-you + photo gallery, export the data, delete the Supabase project.

---

## 11. Content to gather (the two of you, plus parents)

- Names as they should appear, in which order; the monogram/initials for the nav.
- Final dates and times for all three events; rough run-of-show for each.
- Full venue addresses, Google Maps links, venue websites, parking instructions, which entrance/ballroom.
- Dress code per event, with colour guidance and footwear notes.
- Your story: how you met, the proposal, 2-4 short paragraphs. Photos to go with each.
- Wedding party: names, roles, one-line bios, a photo each (with their permission).
- Hotel block: hotel, booking link, group code, nightly rate, cut-off date. Any second hotel or Airbnb area.
- Shuttle plan if any. Rideshare/airport notes.
- Children: invited to which events; babysitting plan; contact person.
- Registry links, or the wording you want instead.
- Favourite Atlanta spots with one line each.
- FAQ answers (the questions are already drafted in `content.ts`).
- Hashtag. Contact email (a shared wedding inbox is handy). Whether the ceremony is unplugged.
- Meal options per event (if any), so the RSVP form knows whether to ask.
- The guest list spreadsheet: party, side, guests, seats per event, email/phone.
- 6-10 engagement photos for backdrops (landscape and portrait), 1 hero, story photos, gallery set.
- RSVP deadline (typically 4-6 weeks before the first event, after talking to the caterers).

---

## 12. Open decisions

- Password gate: yes or no.
- Admin page vs. Google Sheet mirror vs. both (section 7).
- Invite codes on the invitations: yes or no.
- Which events offer a meal choice.
- Whether to collect trivia questions / video messages / slideshow photos (guide's optional extras).
- Confirmation emails: yes or no (adds an email provider).
- Fonts and palette.
- Whether `/hridee/admin` is for the two of you only or also the parents.

---

## 13. Useful references

- Next.js 16 docs ship in `node_modules/next/dist/docs/` (route groups: `01-app/03-api-reference/03-file-conventions/route-groups.md`; proxy: `01-app/01-getting-started/16-proxy.md`; images: `01-app/01-getting-started/12-images.md`; server actions: `01-app/01-getting-started/07-mutating-data.md`).
- Guide this checklist follows: https://sayi.do/articles/complete-guide-wedding-website-must-haves
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Google Sheets API with a service account: https://developers.google.com/sheets/api/guides/concepts
