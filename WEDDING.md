# Wedding website: nyimul.com/hridee

The complete plan for the wedding site. Everything decided so far, everything still to decide, the full content checklist, and the rules the site has to follow. Read this before touching anything under `app/(wedding)/`.

Status (Nov 2026): skeleton in place. The entrance (password + name), per-party pages, the RSVP form and the Google Sheet sync are built, tested against the demo guest list, and live on Supabase with the family's sheet connected (sections 6 and 7). Most content is still TODO.

---

## 1. Principles

1. **Simple first.** The audience includes grandparents on old phones. If a feature makes the site harder to use, it loses. One long page plus a separate RSVP page. Big type, big buttons, few nav items.
2. **Stunning second.** The engagement photos do the heavy lifting. Typography-led layout, one accent colour, lots of air. Two kinds of motion only: content fading in as you scroll, and the monogram gliding from the hero into the corner.
3. **Mobile first.** Design at 375px wide, then widen. Most guests will open the link from WhatsApp or a text.
4. **Unlisted.** Not linked from nyimul.com, not indexed, not advertised anywhere except the invitations. `nyimul.com/hridee` is the home of all wedding things; the portfolio never mentions it and vice versa.
5. **Secure.** Nothing under /hridee is visible without the invitation password and a name lookup. Guest data (names, emails, dietary needs, who is coming) never reaches the browser except the slice a guest needs to see their own party, and a guest never sees an event they aren't invited to. Secrets live on the server only.
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
      content.ts                   ALL wedding copy/facts (names, events, venues, FAQ, registry...). server-only
      types.ts                     shared TS types; RSVP types mirror supabase/schema.sql
      format.ts                    formatDate / formatTime / isRsvpClosed
      ui.ts                        shared button/input/card class strings (the look of every control)
      calendar.ts                  builds the .ics for "Add to calendar" (Atlanta times -> UTC)
      names.ts                     name normaliser for the lookup (must match the SQL trigger)
      sessionToken.ts              sign/verify the session cookie (used by proxy.ts too)
      session.ts                   getSession / requirePartyId / start and end a session (server-only)
      party.ts                     getCurrentParty, eventsFor, visibleTo: the per-party filtering
      rateLimit.ts                 per-IP limits for password tries and name lookups
      store/                       ALL database access: supabase.ts (real) and demo.ts (fake guest list)
      sheet/                       the Google Sheet sync: rows.ts (read a row), plan.ts (what changes),
                                   report.ts (Summary/RSVPs/Messages tabs), sync.ts (one round trip)
      supabase.server.ts           server-only Supabase client (secret key)
    _hooks/useInView.ts            IntersectionObserver hook powering Reveal (renders visible first, so no-JS is safe)
    _hooks/monogramDock.ts         the hero's RSVP button telling Nav "dock the monogram now"
    _photos/                       web-sized engagement photos + index.ts manifest (alt text, focal points)
    hridee/
      page.tsx                     nyimul.com/hridee: composes the sections below
      _components/                 one file per section: Nav (monogram + bar), Hero, Events, RsvpCta, OurStory,
                                   Travel, Faq, WeddingParty, ThingsToDo, Registry, Gallery, ClosingPhoto, Footer;
                                   plus Section (chapter photo + title), Photo (art-directed full-bleed photo),
                                   Reveal (fade-in wrapper), SiteHeader (bar for the RSVP page), HeroRsvpButton
      icon.png, apple-icon.png     the monogram on paper, as favicon
      calendar/[file]/route.ts     GET /hridee/calendar/<event>.ics: "Add to calendar", invited events only
      enter/                       nyimul.com/hridee/enter: password, name, "is this you?" (the only open page)
      rsvp/page.tsx, RsvpForm.tsx  nyimul.com/hridee/rsvp: one screen per invited event, extras, review
      rsvp/actions.ts              Server Action submitRsvp (the party comes from the session, never the browser)
      sync/route.ts                POST nyimul.com/hridee/sync: the Google Sheet's door (secret, not session)
proxy.ts                           sends anyone without a guest session to /hridee/enter
scripts/wedding-sheet.gs           Apps Script pasted into the family's Google Sheet (section 7)
scripts/export-wedding-photos.py   makes the web-sized, metadata-free photos in _photos/ from the originals
supabase/schema.sql                database schema: tables, search_name triggers, grants, RLS locked down
.env.example                       every env var the site uses; copy to .env.local
next.config.ts                     X-Robots-Tag noindex for /hridee + baseline security headers + image formats
```

How it works, in one paragraph: a folder named `(something)` is a **route group**. It organises files without appearing in the URL. Any `layout.tsx` with no layout above it is a **root layout**, and a project can have several. There is no `app/layout.tsx` any more, so `(portfolio)/layout.tsx` and `(wedding)/layout.tsx` are two independent roots, each owning its own `<html>`, `<body>`, fonts and CSS. Verified: `/` and `/hridee` load different stylesheets. Folders starting with `_` are **private folders**: Next never turns them into routes, so `_components`, `_lib`, `_photos` are safe places for code and assets.

Caveats to remember:
- Navigating between the two sites is a full page load, not a client-side transition. Irrelevant here: nothing links between them.
- Never create the same URL in both groups (e.g. `(portfolio)/hridee` and `(wedding)/hridee`); the build errors.
- 404s work without a top-level layout (verified). If you ever want a *custom* 404 shared by both sites, Next 16 has an experimental `app/global-not-found.tsx` for exactly this case.

### Running and deploying

- `npm run dev` then open `http://localhost:3000/hridee`. You'll land on the entrance.
- **Always open the dev site as `http://localhost:3000/hridee`** (or a host listed in `allowedDevOrigins` in `next.config.ts`). From any other host (`127.0.0.1`, the computer's name, a changed Wi-Fi IP) Next serves the page but refuses the live-reload connection, and the dev page then never starts its JavaScript: it shows, but the monogram never docks, sections never fade in, and reloading does not help. Production is not affected. `127.0.0.1` and the Wi-Fi IP are listed; if the IP changes, update it there (Next restarts the dev server by itself when the config changes).
- **On your phone**, open the "Network" URL the dev server prints (`http://192.168.1.171:3000/hridee` on this Wi-Fi).
- **Without touching the real database:** set `WEDDING_DEMO_DATA=1` and `WEDDING_PASSWORD=demo` (in `.env.local`, or on the command line, which wins over the file), so the site runs on a fake guest list (`_lib/store/demo.ts`). Try "Omar Rahman" (all three events), "Farid Karim" (5 invites, 2 of them open spots, and the Nikkah for Farid only), "Sam Lee" (Reception only, with a +1 who can only come with Sam), "Ayesha Rahman" (two matches, so you get the picker) and "Fareed Kareem" (a close spelling). Demo RSVPs vanish when the dev server restarts. The demo list refuses to run on Vercel.
- Hosting: Vercel, same project as the portfolio. The wedding site is just more routes.
- Env vars: Vercel > Project > Settings > Environment Variables. Set them for Production and Preview separately. Local dev uses `.env.local` (gitignored). `.env.example` lists them all.
- Turn on **Deployment Protection** for Preview deployments in Vercel so half-finished versions of the wedding site aren't on a public URL.
- `git add -A` will see the moves into `(portfolio)/` as renames, not delete+add, so history is preserved.

---

## 3. Photos

Full guidance is in `app/(wedding)/_photos/README.md`. The short version:

- The originals live outside the repo (the "Wedding Website Pics" folder on the desktop) and never go in git: 12-38 MB each, and the phone photos carry GPS coordinates.
- `scripts/export-wedding-photos.py` makes the web copies in `app/(wedding)/_photos/`: 2400px long edge for full-bleed photos, 1600px for story/gallery, JPEG ~82, every EXIF/XMP/GPS tag dropped, colour profile kept, named by purpose (`hero-a.jpg`, `events.jpg`, `gallery-01.jpg`...). It checks its own output. To add or swap a photo: one line in its PLAN, re-run it, then point `_photos/index.ts` at the file.
- `_photos/index.ts` is the only place photos are imported. It also holds the alt text and the focal point per breakpoint (`position` / `positionDesktop`).
- Importing (`import hero from "./hero-a.jpg"`) rather than using `public/` gives intrinsic sizes (no layout jumps), blur placeholders, forever-cached URLs and on-demand AVIF/WebP resizing from `next/image`.
- Only the hero and the entrance photo load eagerly (`loading="eager"` + `fetchPriority="high"`; Next 16 deprecated `priority`). Everything else lazy-loads, with a real `alt` and a correct `sizes`.
- Phones get portrait files and wide screens landscape ones where a pair exists (`Photo.tsx` builds a `<picture>` from `getImageProps`).
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
- [x] **Childcare**: children are welcome at every event, so there's nothing beyond the FAQ answer. `content.ts > faq`
- [ ] **FAQ section** (the guide calls it essential for large or complex weddings; three events, two venues qualifies). `content.ts > faq`, `Faq`

### Nice-to-haves ("hidden gems")
- [ ] **Local recommendations**: favourite restaurants, cafes and things to do, mainly for out-of-town guests. Food and Cafes are in (Nov 2026); things to do still empty. `content.ts > recommendations` (each row opens Google Maps, nearest the hotel first, by `minutes`), `recommendationsMapUrl` (a shared Google Maps list gives the one-button map), `ThingsToDo`
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
- [x] **Wedding hashtag**: none for now (removed from `content.ts`). To bring one back, add `couple.hashtag` and show it in `Footer`.

### When and how to share
- [ ] Share only **after the date and venues are locked**.
- [ ] Keep the site **easy to update** when anything changes (that is what `content.ts` is for).
- [ ] Put the URL on the **save-the-dates**, as a written link **or a QR code** pointing at `https://nyimul.com/hridee`.
- [x] Send save-the-dates **6-12 months before** the wedding. Sent.

### Aligning your wedding style
- [ ] Digital save-the-dates and thank-you cards can **match the website's design** (same fonts, palette, photo treatment), which saves time and money. Reuse the tokens from `wedding.css`.

### Extra, because this is a Bengali wedding across three events
- [ ] A short, warm "what to expect" for each event for guests who have never been to a Holud or Nikkah: what happens, how long, when to arrive, seating.
- [ ] Colors to wear: up to 7 per event, per family's side, in `content.ts > eventColors` (hex or rgb). The palettes from Coolors are in. Also: modesty notes if any, where to buy/rent if you want to help non-Desi guests.
- [ ] Food: halal, vegetarian options, alcohol yes/no, per event.
- [ ] Prayer space / timing around salah if relevant.
- [ ] Gift etiquette if you want to say anything (registry vs. envelopes vs. "your presence is enough").
- [x] Who is invited to what: every page shows a signed-in party only their own events (home page, FAQ, RSVP). Tag event-specific content in `content.ts` with `eventIds`.

---

## 5. Events and the guest-list model

### The events
| Event | Expected size | Venue (TODO confirm) |
|---|---|---|
| Gaye Holud | 150-200 | TPC Sugarloaf, Duluth, GA |
| Nikkah | 50-75 | TPC Sugarloaf, Duluth, GA |
| Reception | ~400 | Hilton Atlanta Northeast, Peachtree Corners, GA |

Not everyone is invited to every event, so **invitations are per party per event**, each with its own seat count. The `party_events` rows decide what each guest sees on the site: no row for the Nikkah means the Nikkah never appears for that party, anywhere.

### The model (see `supabase/schema.sql`)
- **party**: one invitation / household, which is one row of the family's Google Sheet (its Website ID is the party id). Has a `display_name` ("The Hoque Family"), a `search_name` used for lookup, `archived_at`, set when the row leaves the sheet, `others_need_named`, the sheet's "Others need a named guest", and `family`, the tab the row is on, which decides the event colors that party sees.
- **guests**: the people in the party. Named people are rows with names. Every invite without a name (the sheet's Invites number minus the names listed) is an **open spot**: `is_slot = true`, `full_name = null`. On the RSVP form the family says how many of those are coming and may type their names. Only open spots' names are editable by guests.
- **search_name** on parties is kept up to date by a trigger (display name plus every guest's name, normalised). Never edit it by hand.
- **party_events**: one row per event the party is invited to, with `max_guests` = how many seats they have *at that event*. A couple gets 2. A family of five gets 5 at the reception, maybe 5 at the Holud, and no row for the Nikkah. `guest_ids` is null for the whole invitation, or lists the only guests invited to that event (the sheet had "Farid Karim" under Nikkah instead of an x). `max_guests` always equals the people invited to that event.
- **rsvps**: one row per guest per event (attending yes/no, meal, dietary).
- **party_responses**: the once-per-party answers (song request, message).

This handles every case you described: couples (2 seats), families with kids (more seats, children can be named or left as slots), people invited to one event only, and the reception's 400 vs. the Nikkah's 50-75.

### The entrance (`/hridee/enter`, one question per screen)
1. **Password**: the word printed on the invitation. Case, spaces and punctuation are ignored. After 10 wrong tries per IP in 15 minutes, a "wait or email us" message.
2. **Find**: "Enter your first and last name. Or the name of someone in your family." Everyone gets the same evite, with the site address and the password, so nothing tells a guest how the sheet spells their name. Needs two words. Each typed word must match a word of the same person's name (or the row's family name), in any order, so middle names and "Karim Farid" work, and "Sa Lee" doesn't find "Sam Lee". If nothing matches exactly, close spellings count: one typo, two in long words ("Mohammed" / "Muhammad"), or the same consonants ("Chowdhury" / "Chaudhry", "Fareed" / "Farid"). An exact match always hides the close ones, so typing your name correctly never shows other families. The matching is `matchName` in `_lib/names.ts`. Returns at most 5 parties and only `displayName` + first names. 30 searches per IP per 15 minutes. Zero matches shows a friendly "check the spelling, or try someone else in your family, or email us", never "you're not invited". Close spellings are handled, but nicknames aren't, and a family member who isn't named on the row can't find it by their own name. So list the names people actually go by, and as many of the family as you know: each name on a row is one more way to find it.
3. **Pick**: "Is this you?" or "Which one is you?", always shown, even for one match.
4. The visitor now has a signed session cookie for that party, good for a year. Every page is their version. "Not {party}? Switch" in the footer signs out, for shared family phones.

### The RSVP flow (`/hridee/rsvp`)
No lookup: the party comes from the session.
1. **One screen per invited event**, showing only the guests invited to it: Coming / Can't make it for each named person, then one counter for the open spots ("How many others are coming? Up to 3") with optional name boxes. The two never affect each other: a named person's seat is theirs, so "Can't make it" doesn't free it up for someone else, and the counter's limit is the same whatever anyone answers. So by default, if everyone named says no, the family can still send others. The exception is a row marked "Others need a named guest": for each event, the counter stays locked at 0 until someone named says Coming, and the server enforces that too. An event for only some of the party says so: "We've saved 1 seat for Farid Karim." The server re-checks who may come to which event, and `max_guests`, anyway.
2. **Extras**: dietary needs for everyone coming, a song request, a message.
3. **Please confirm**: "You are RSVP'ing 4 people" for each event, with the names. Then **Confirm and send**, then a thank-you. Coming back later shows "You already replied" with every answer pre-filled.

Still TODO: meal choice (once you know which events offer one), and the hotel block link on the thank-you screen.

Edge cases to decide:
- Two parties with the same family name (two "Rahman Family"s): the picker shows first names under each. If that's not enough, add a hint to `display_name` ("The Rahman Family (Chicago)").
- Guests who RSVP for someone else in their party: allowed by design (one person per household usually does it).
- Deadline: after `wedding.rsvpDeadline`, the form shows "RSVPs have closed, email us".

### Where the list comes from
The family's Google Sheet (section 7). Every 10 minutes it sends both families' guest lists to `/hridee/sync`, which creates and updates parties, guests (open spots with `is_slot = true`) and `party_events`. There is no import script and nothing to type into Supabase. Phone numbers, addresses and private notes stay in the sheet and never reach the database.

---

## 6. Backend: Supabase

**Decision: a NEW Supabase project, used only for the wedding.** Keep it separate from the mobile app's project: different data, different keys, different lifetime (delete it after the wedding), and no risk of a wedding bug touching the app. Only you ever log into it. The family works in the Google Sheet (section 7).

What it holds: the guest list as the sheet last sent it, plus everything guests answer. It is the safe copy of the RSVPs. The sheet's RSVPs tab is rebuilt from it, so nothing a family member does in the sheet can lose an answer.

### Set it up (one time, about 15 minutes)

1. **Create the project.** Go to https://supabase.com/dashboard and click **New project**.
   - Name: anything, e.g. `hridee-wedding`.
   - Database password: click **Generate a password** and save it in your password manager. The website never uses it.
   - Region: **East US (North Virginia)**. Plan: **Free**.
   - If the form shows security or Data API options, leave the **Data API enabled**. The website talks to the database through it.
   - Click **Create new project** and wait a minute or two until it says it's ready.
2. **Create the tables.** Left sidebar > **SQL Editor** > **New query**. Paste the whole of `supabase/schema.sql`, then click **Run**. You should see "Success. No rows returned". Run it only once. A second run fails with "already exists", which just means it already worked.
3. **Check it.** Left sidebar > **Table Editor**. You should see 7 tables: `events` (with 3 rows: Nikkah, Gaye Holud, Reception), `parties`, `guests`, `party_events`, `rsvps`, `party_responses` and `lookup_attempts`. Then open **Advisors > Security Advisor**. There should be no errors. Notices saying "RLS Enabled No Policy" are expected, because having no policies is the design (section 8).
4. **Copy two values.**
   - **Project URL**: Project Settings > **Data API**, or the **Connect** button at the top. It looks like `https://abcdefghijkl.supabase.co`, with nothing after `.co`. If the dashboard shows it ending in `/rest/v1/`, leave that part off.
   - **Secret key**: Project Settings > **API Keys** > **Secret keys**, the one named `default`, starting with `sb_secret_`. If that page only offers a **Create new API keys** button, click it first. Don't use the publishable key. Don't use a legacy `service_role` key either: those stop working at the end of 2026.
5. **Point your laptop at it.** In `.env.local`, fill in `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, delete the `WEDDING_DEMO_DATA=1` line, and restart `npm run dev`. The site now uses the real database, which is empty. Nobody can sign in until the sheet sends invitations (section 7).
6. **Give Vercel the same settings.** Vercel > your project > Settings > **Environment Variables**. Add these for **Production**, and for **Preview** too if you'll test on preview URLs:

   | Name | Value |
   |---|---|
   | `SUPABASE_URL` | the Project URL |
   | `SUPABASE_SECRET_KEY` | the `sb_secret_...` key |
   | `WEDDING_PASSWORD` | the word printed on the invitations |
   | `WEDDING_SESSION_SECRET` | a NEW random value, not the one in `.env.local` |
   | `WEDDING_SHEET_SECRET` | a NEW random value; you paste it into the sheet in section 7 |

   Make each random value with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. Never use the `NEXT_PUBLIC_` prefix. Environment variables only reach new deployments, so redeploy after adding them.
7. **Lock your Supabase account.** Account > Security: turn on multi-factor authentication.

Notes:
- The free plan pauses a project after about a week with almost no database activity. The sheet's 10-minute sync counts as activity, so once section 7 is done it stays awake. If it ever pauses, the dashboard has a **Restore** button and nothing is lost.
- The schema grants table access to the website's key explicitly. Since mid-2026, new Supabase projects no longer do that automatically. Without those lines, every query fails with "permission denied" (error 42501).
- For ad-hoc questions, run `select * from rsvp_overview` in the SQL Editor. It gives one row per guest per event.
- All database code is in `_lib/store/supabase.ts`. The schema has been tested against a local Postgres, and the sync logic against the demo store. The Supabase queries themselves haven't run against a live project yet, so do the test in section 7, step 8, before sending invitations.

Why Server Actions and not an API route for guests: a Server Action is a function that runs on the server and can be called from a form as if it were local. Next handles the POST, serialisation and the CSRF origin check, and the key stays in the function. The one Route Handler, `/hridee/sync`, exists because its caller is the Google Sheet, not a page.

---

## 7. The family's Google Sheet (you, your fiancée, four parents)

**Decision: one Google Sheet is the only thing the family touches.** They edit the guest list there, and RSVPs, headcounts and messages appear there by themselves. Nobody but you logs into Supabase or Vercel, and there is no admin page on the website. The family's "admin access" is just being an editor on the sheet with their normal Google accounts.

### How it works

```
Google Sheet ("Nyimul's Family" and "Hridee's Family" tabs)
  |  every 10 minutes, or Website > Publish now
  |  Apps Script (scripts/wedding-sheet.gs, pasted into the sheet)
  |     POST https://www.nyimul.com/hridee/sync    Authorization: Bearer WEDDING_SHEET_SECRET
  |     sends only: which tab, family name, guest names, invites, the event cells,
  |     "Others need a named guest", Website ID
  v
app/(wedding)/_lib/sheet/: read each row, work out the changes, apply them to Supabase
  |  answers with a note per row, plus the Summary / RSVPs / Messages tabs
  v
Sheet: "Website notes" column filled in; tabs rewritten only when something changed
```

Tabs the script creates:

| Tab | Who writes it | What it is |
|---|---|---|
| Read me | the script, once; then it's yours to edit | a short how-to for the parents |
| Nyimul's Family | Nyimul's side | one row per invitation |
| Hridee's Family | Hridee's side | one row per invitation, same columns |
| Summary | the website | a status line, then one table per family and one for everyone: per event, invitations, replied, people invited, coming, not coming, no reply yet |
| RSVPs | the website | one row per person per event, family first: reply, dietary needs, date. Has a filter |
| Messages | the website | song requests and notes to the two of you, with the family |

The columns can be in any order. The family can add their own columns, like Phone, Address or Invited by, and those never leave the sheet.

| Family name | Guest names | Invites | Nikkah | Holud | Reception | Others need a named guest | Website notes | Website ID |
|---|---|---|---|---|---|---|---|---|
| The Karim Family | Farid Karim, Nadia Karim | 5 | Farid Karim | x | x | | ✓ On the website | (automatic) |
| Sam Lee | Sam Lee | 2 | | | x | x | ✓ On the website | (automatic) |
| Ayesha & Omar Rahman | Ayesha Rahman, Omar Rahman | | x | x | x | | ✓ On the website | (automatic) |

- **Family name**: how the website greets them ("Welcome, The Karim Family"). Guests can also search it. For one person or a couple, use their names.
- **Guest names**: the people you know by name, first and last, separated by commas. Everyone named can find the invitation by searching their own name. `(child)` after a name marks a child.
- **Invites**: how many people in total. The ones without a name are "open spots": the family says on the RSVP form how many of them are coming, and can name them if they like. Blank means just the people named.
- **Event columns**:
  - `x` (or `yes`, or a ticked checkbox): invited, with all their invites.
  - Names, like `Farid Karim` or `Farid and Nadia`: only those people are invited to this event. A first name is enough if it's unique. `Farid Karim, +1` adds one open spot.
  - A number isn't accepted, because it doesn't say who. The row's note explains.
- **Others need a named guest**: usually blank, which lets a family send others even if everyone named says no. An x means the others can only come to an event if someone named is coming to it. It applies to every event on that row, checked event by event.
  - Blank or 0: not invited, so that party never sees that event anywhere on the site.
- **Website notes**:
  - `✓ On the website` means the row is live.
  - `✓ ... Check:` means it's live, but something looks off: a one-word name, fewer invites than names (it then counts the names), or an x in Others need a named guest added after only the others said yes.
  - `Not on the website yet:` or `Not updated:` means something must be fixed first, and the cell turns red. Until then, the website keeps the earlier version.
- **Website ID**: the link between the row and the database. The script fills it in. Never type in it.

What happens when the family...

| ...does this | The website |
|---|---|
| adds a row | creates the invitation; they can sign in within 10 minutes |
| fixes a name's spelling | updates it and keeps that person's RSVP |
| adds or removes a person | adds them, or removes them along with their RSVP |
| raises Invites | adds open spots |
| lowers Invites | removes open spots nobody used. If that leaves too little room for people not in Guest names who already said yes, it refuses and removes nobody. The row's note turns red, stays until it's sorted out, and says the lowest Invites that fits. Once the family changes their RSVP, or Invites goes back up, the row updates by itself |
| adds a name to Guest names that a guest already typed on their RSVP | treats them as the same person and keeps their RSVP, rather than counting them twice |
| changes who an event is for | updates it and drops the RSVPs of people no longer invited to that event |
| adds an x under Others need a named guest | applies it to the next RSVP. If only the others already said yes to an event, that answer stays and the row's note points it out |
| clears an event's cell | takes that event off their invitation and drops those RSVPs |
| deletes a row, or clears its name and guest names | hides the invitation, so they can't sign in, but keeps their RSVP. Bringing the row back restores everything, whether through File > Version history or by retyping the same name and a guest |
| deletes more than 10 rows at once | refuses and changes nothing, and the status line explains. Undo with Version history, or you use Website > Publish and allow removals |
| copies a row to start a new one (on either tab) | gives the copy its own Website ID |
| moves a row to the other family's tab (cut and paste) | keeps the invitation and its RSVPs; it now counts for the other family and sees that side's event colors |
| sorts one column only, so IDs no longer match their rows | refuses those rows with a note saying to undo the sort; nothing changes |
| renames a header or a tab | sends nothing; the status line names what's missing |

**Website > Publish and allow removals.** A normal publish refuses to take more than 10 invitations off the website at once, or to empty both lists, because that's almost always an accident (deleted block of rows, half-sorted sheet). This menu item publishes anyway, after a confirmation. Use it only when you really removed that many on purpose. Invitations taken off keep their RSVPs.

It also pushes through any row refused for lowering Invites, removing those people, and their RSVPs are gone for good. It applies to every row at that moment, so check for red notes first.

### Set it up (one time, about 20 minutes)

Before you start, set up Supabase (section 6). Then **deploy** the website, including `/hridee/sync`, with the Vercel variables from section 6, step 6. The sheet calls the live website and can't reach your laptop.

You have two ways to deploy:
- **Merge this branch to `main`.** The site is password-gated, so it's safe to be live early.
- **Use a Vercel preview URL.** If that preview has Deployment Protection on, create a "Protection Bypass for Automation" secret in Vercel. Then add it to the script as a Script Property named `VERCEL_BYPASS`, under Apps Script > Project Settings > Script Properties.

1. **Create the spreadsheet in your own Google account.** Open https://sheets.new and name it, e.g. "Wedding guest list". Your account owns it, and the 10-minute updates run as you.
2. **Add the script.** In the sheet, open **Extensions > Apps Script**. Delete the sample code in `Code.gs` and paste the whole of `scripts/wedding-sheet.gs`. Click **Save** (the disk icon), name the project "Wedding website", and close that tab.
3. **Reload the spreadsheet.** After a few seconds, a **Website** menu appears at the end of the menu bar.
4. **Click Website > Set up / change settings.** Google asks for permission the first time:
   - **Authorization required** > **Continue** (or **Review permissions**) > pick your account.
   - **Google hasn't verified this app** > **Advanced** > **Go to Wedding website (unsafe)** > **Allow**. This warning appears for every personal script. The script asks to edit this one spreadsheet, connect to an external service (your website), run while you're away (the 10-minute updates) and show dialogs.
   - If nothing else happens after you allow it, click **Website > Set up** again.
5. **Answer the two questions.**
   - **Website address**: `https://www.nyimul.com` (the bare `nyimul.com` redirects to www, and the sync can't follow redirects), or the preview URL. If the site ever redirects, the status line names the address to use.
   - **Sheet secret**: paste the same `WEDDING_SHEET_SECRET` you put in Vercel.
6. **Check the first run.** The script creates the Read me, Nyimul's Family, Hridee's Family, Summary, RSVPs and Messages tabs, adds the 10-minute timer, and publishes once. The first line of the **Summary** tab should start with "✓ Up to date". If it starts with ⚠, the message says what's wrong (see the table below).
7. **Add one real row: yours.** For example, on Nyimul's Family: "Nyimul & Hridee", your two names, and an x under all three events. Click **Website > Publish now**. The row's Website notes cell should say ✓ On the website.
8. **Test it end to end on your phone.**
   - Open nyimul.com/hridee, type the password, then your name. You should see your events.
   - Send an RSVP.
   - Click **Website > Publish now**, or wait 10 minutes. The RSVPs tab should show your answer, and the Summary should count it.
   - This is also the first real test of the Supabase code.
9. **Share it.** Use the **Share** button to add your fiancée and the four parents as **Editors**. Never choose "Anyone with the link": the sheet holds everyone's names, and later their dietary needs and messages. Tell the family to read the Read me tab. They never need the Website menu. If one of them clicks it, Google asks them for the same permissions, and they can just close that.

You can fill in the guest lists before the website is deployed. The first publish sends everything.

### Starting over while testing

The sheet holds the guest list and the database holds the answers, so you only ever need to empty the database. In Supabase, open **SQL Editor**, run this, and confirm the warning:

```sql
truncate parties, lookup_attempts cascade;
```

Then click **Website > Publish now**. Every row in the sheet is rebuilt with the same Website ID and no RSVPs, song requests or messages. `lookup_attempts` is the "too many tries" counter, so that clears too. Save the query in the SQL Editor to reuse it.

- **Never run this once invitations are out.** It erases real RSVPs, and there's no undo. That's why it isn't a button in the sheet, where any family member could press it.
- Deleting a row and retyping it doesn't reset anything: the row reconnects to its old invitation, RSVP included. That's the safety net working.
- To change who's invited, just edit the row. No reset needed.
- To sign in from scratch on your phone, tap "Switch" in the footer, or use a private tab.
- To try changes to the site before deploying, run it on the fake guest list. It never touches the sheet or Supabase, and restarting gives fresh data. In a PowerShell window (close it afterwards, because the setting stays for that window): `$env:WEDDING_DEMO_DATA=1; $env:WEDDING_PASSWORD="demo"; npm run dev`

### Changing the script later

The sheet runs its own copy of the script, so a change to `scripts/wedding-sheet.gs` reaches it only when you paste it again:

1. If the change touches both sides (like a new column), deploy the website first. Until you paste the new script, the old one is refused with "The sheet sent something the website couldn't read" and nothing changes, so that gap is harmless. The other order isn't: an old website ignores columns it doesn't know.
2. In the sheet: **Extensions > Apps Script**, select everything in `Code.gs`, paste the new file, **Save**.
3. Back in the sheet, click **Website > Set up** (leave both answers blank to keep them). That adds any new tabs or columns.

Set up writes the Read me tab only when there isn't one, so your own wording is never overwritten. To get the script's latest text instead, delete the Read me tab and run Set up.

The first version had a single "Guest List" tab. Set up turns it into Nyimul's Family (renaming Guests to Guest names and inserting Invites after it, keeping every row and Website ID) and adds an empty Hridee's Family tab. Move Hridee's family's rows there with cut and paste, which keeps their IDs and RSVPs. Set up also renames the old "Name on invite" header to "Family name". The rows under it don't change.

### When the status line shows ⚠

| Message | Fix |
|---|---|
| The sheet isn't connected yet | Website > Set up |
| The sheet's secret doesn't match the website's | Run Set up again and paste the value from Vercel. If you just changed it in Vercel, redeploy first |
| WEDDING_SHEET_SECRET is missing on the website | Add it in Vercel, then redeploy |
| The website address redirects to ... | Run Set up with that address |
| Couldn't reach ... / answered with an error (404) | Either the address is wrong, or the deployed site doesn't have `/hridee/sync` yet |
| The website couldn't update its database | Check Supabase. Either the project is paused (click Restore), or the key in Vercel is wrong. Vercel > Logs shows the detail |
| missing these column headers | Put the exact header text back in row 1, or run Set up to re-add it |
| There is no "Hridee's Family" tab | A tab was renamed or deleted. Rename it back, or run Set up to create it |
| The sheet sent something the website couldn't read | The script and the website are different versions. Deploy, then paste the latest script (see above) |
| N invitations would be taken off the website | Undo with File > Version history, or use Website > Publish and allow removals if it's on purpose |

To change the secret, set a new `WEDDING_SHEET_SECRET` in Vercel and redeploy. Then run Website > Set up and paste it. Anyone holding the secret can read every RSVP and rewrite the guest list, so keep it only in Vercel and the script.

---

## 8. Security

### Unlisted (done in the skeleton, keep it that way)
- [x] No link from nyimul.com or the portfolio nav. The wedding `Footer` doesn't link back either.
- [x] `robots: { index: false, follow: false }` in `app/(wedding)/layout.tsx` (inherited by every wedding page). Verified: `/` has no robots meta, `/hridee` does.
- [x] `X-Robots-Tag: noindex, nofollow, noarchive, noimageindex` header for `/hridee/:path*` in `next.config.ts`. Verified on `/hridee` and `/hridee/rsvp`, and not on `/`.
- [ ] Never add `/hridee` to a `robots.txt` or a sitemap. `robots.txt` is public; a `Disallow: /hridee` line *advertises* the URL.
- [ ] Don't post the URL on social media. Save-the-dates, WhatsApp, text.
- [ ] Vercel: Deployment Protection on Preview deployments.
- [x] Unlisted is not private, so the site is gated: nothing renders without the invitation password and a name lookup (below).

### The gate: password + name (decided, built)
A shared word on the invitation, then "who are you?". It isn't a vault, since anyone holding an invitation knows the word. It does make the link useless to strangers and lets every page be personal.
- `proxy.ts` at the repo root (Next 16's name for middleware) matches `/hridee` and `/hridee/:path*`. Without a valid guest session, everything except `/hridee/enter`, `/hridee/sync` (which checks its own secret) and the OG/icon files for link previews redirects to `/hridee/enter?next=<path>`.
- The session is one cookie, `hridee_session`: `httpOnly`, `secure` in production, `sameSite=lax`, path `/hridee`. Its value is a small JSON payload (stage, party id, issued-at) signed with HMAC-SHA256 using `WEDDING_SESSION_SECRET`, so editing it breaks the signature. The password stage lasts 1 hour; the party stage lasts a year.
- The proxy is only the first check. Every page and Server Action checks the session again itself, because the Next docs warn that proxy matchers can silently stop covering Server Actions after a refactor.
- Pages are filtered on the server, and `content.ts` is `server-only`. A Reception-only guest's HTML and JavaScript contain nothing about the Nikkah or the Holud (verified).
- Static photos under `/_next/static` are not behind the gate. Their URLs are content hashes nobody can guess, which is fine for engagement photos.
- Trade-off: two steps before older guests see anything. Mitigated with big type, one question per screen, the year-long session, and the contact email on every step.

### Secrets
- [ ] `SUPABASE_SECRET_KEY`, `WEDDING_PASSWORD`, `WEDDING_SESSION_SECRET`, `WEDDING_SHEET_SECRET`: server only, in Vercel env vars and `.env.local`. **Never** `NEXT_PUBLIC_`. The sheet secret also lives in the Apps Script's Script Properties, which the sheet's editors can see. That's acceptable because it only grants what they already have in the sheet.
- [ ] Use different `WEDDING_SESSION_SECRET` and `WEDDING_SHEET_SECRET` values in Vercel from the ones in `.env.local`. Rotating the session secret signs every guest out; they just sign in again.
- [ ] `_lib/supabase.server.ts` imports `server-only`. Any file that touches the key should.
- [ ] `.env*` is gitignored; `.env.example` is the only env file in git and contains no values.
- [ ] Rotate the Supabase secret key if it is ever pasted anywhere (chat, screenshot, Slack): API Keys > create a new secret key, update Vercel, redeploy, then delete the old key.

### Guest data
- [x] RLS on every table, no policies, and no table grants at all for `anon`/`authenticated` (tested on a local Postgres). The publishable key is dead weight; don't even put it in env.
- [x] Lookup returns the minimum: party display name + first names. No emails, phones, notes, or other parties.
- [x] Lookup only works after the password, needs a first and last name, returns at most 5 results, and is **rate-limited per IP** via the `lookup_attempts` table. Vercel overwrites `x-forwarded-for`, so the IP can't be spoofed there.
- [x] Every Server Action validates input with zod, trims, caps lengths (names 100, messages 1000), takes the party from the session, and checks that every `guestId`/`eventId` belongs to that party (tested with tampered requests).
- [x] Who may come to which event, and `max_guests`, are enforced on the server (tested with tampered requests). Seats always equal the people invited, so the form has nothing to grey out.
- [x] No admin page on the website. The family's view is the Google Sheet, protected by Google sharing.
- [x] `/hridee/sync` needs `Authorization: Bearer WEDDING_SHEET_SECRET` (constant-time compare). It refuses to run if the secret is missing or under 32 characters, validates the body with zod, and answers a wrong secret with nothing but an error (tested).
- [ ] Don't show a public "who's coming" list. Don't put anyone's home address on the site, including yours (registry links only).
- [ ] The family's Google Sheet: shared with exactly six Google accounts as editors, never "anyone with the link". It contains everyone's names, dietary needs and messages.
- [ ] After the wedding: export what you want to keep, then delete the Supabase project.

### Photos
- [ ] Strip EXIF/GPS from every photo before committing (`_photos/README.md`).
- [ ] Only publish photos of other people (wedding party) with their OK.

### Headers (done)
- [x] `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` on every route.
- [ ] A Content-Security-Policy later, once you know which embeds you use (Google Maps iframe, YouTube).

---

## 9. Design direction: simple but stunning

Built in Nov 2026 (the direction mockup is `design-direction.html` next to the photo originals). Everything below is what is live under `app/(wedding)/`.

**Look.** Warm paper background (`#FBF8F3`), navy ink (`#1E2130`), one accent: the navy of Nyimul's kurta (`#2B3261`) for buttons, links and selected states, with a sage tint from Hridee's saree (`#E3E9DF`) for borders and soft fills, and sage (`#8FA58A`) for the italic "&" only. All text passes 4.5:1 on paper. Fonts: Playfair Display for names and headings (it echoes the high-contrast serif of the monogram) and Source Sans 3 for everything else, both self-hosted through `next/font`. Tokens live in `wedding.css`; the shared button, input and card classes in `_lib/ui.ts`. Text column max ~672px. The photos *are* the design; the UI gets out of the way.

**The monogram.** Ink on light backgrounds everywhere. On the home page it starts big and centred in the sky of the hero photo; when the hero scrolls away, or the hero's RSVP button is tapped, it glides into the top-left corner and the bar (Events, Travel, FAQ, RSVP) fades in behind it. One fixed element and one transform transition (`.monogram-dock` in `wedding.css`, driven by `Nav.tsx`). The RSVP page and the footer keep it small, the entrance shows it as a crest under the photo, and `hridee/icon.png` + `apple-icon.png` make it the favicon.

**Chapters, not backdrops.** Each section of the home page opens with one full-width photo that carries its title (`Section.tsx`), then its content on solid paper. This replaced the earlier idea of a fixed crossfading photo layer behind translucent panels: the same feeling while scrolling, but text is always on paper (readable for older eyes) and there is no fixed full-screen layer to stutter on old phones. Order: hero, Events, the RSVP band (deadline and button written in the sky above the two of you), Our Story, Travel & Stay, Questions, then Wedding Party, Our Favorite Food/Cafes in Atlanta and Registry (hidden until there is content), Gallery (oldest first, no captions), the waving photo, footer.

**Motion rules.**
- Exactly two effects: `Reveal` (content fades in and rises 16px as it enters the viewport, 700ms, ease-out, once) and the monogram docking above. No animation library. `useInView` renders everything visible on the server and only hides below-the-fold blocks after JavaScript runs, so a slow phone never stares at an empty page.
- Nothing bounces, nothing parallaxes, no scroll hijacking, no autoplaying video, no loading screens. The hero and the forms are never inside a `Reveal`.
- Everything honours `prefers-reduced-motion` (`wedding.css` zeroes every transition; `useInView` and the hero button check it too).
- Opacity and transform only. Never animate `top`/`height`/`width`.

**For older guests specifically.**
- Base font 18px, line-height 1.55, contrast at least 4.5:1.
- Buttons and inputs 56px tall and full width on phones, the two card buttons 48px, bar links 44px. No hover-only interactions, no carousels.
- Nav: 4 anchor links + one RSVP button, shown once the hero has scrolled away.
- RSVP: one question per screen with a "Step 2 of 5" line and a progress bar, visible labels, Coming / Can't make it as two big toggles with a check mark on the chosen one, a big Next button, a plain-language confirmation, and the contact email on every step.
- Dates written out ("Friday, April 9, 2027"), never `04/09`.
- "Get directions" (a Google Maps search for the address, or `venue.mapsUrl` when set) and "Add to calendar" (an .ics from `/hridee/calendar/<event>.ics`, served only for events the party is invited to, 3 hours long unless `endTime` is set) on every event card.
- FAQ with native `<details>` so it works everywhere, including with JS off.

**Performance budget.** Hero visible under 2.5s on 4G: eager loading on the hero image only, `sizes` on every image, `display: swap` on fonts, no component libraries. Check with Lighthouse on a throttled mobile profile before launch.

**Test on real devices**: an older iPhone, a budget Android, and one parent. Headless screenshots of every demo guest at 375px and 1440px were checked on Nov 6 2026.

**If styles look stale in dev** (old colours after a CSS change), stop the server and delete `.next/dev`: Turbopack's cache once kept serving the previous `wedding.css`.

---

## 10. Build order

**Phase 1: skeleton (done).** Route groups, wedding root layout, section stubs, content file, schema draft, this document.

**Phase 2: static content.**
- [ ] Fill `content.ts` (names, dates, venues, dress codes, FAQ answers, story, things to do). Confirm every TODO.
- [x] `useInView`, `Reveal`, `Hero`, `Events` (map link, venue link, add-to-calendar), `RsvpCta`, `OurStory`, `Travel`, `Faq`, `Footer`.
- [x] Fonts and palette in `wedding.css` and `layout.tsx` (section 9).

**Phase 3: photos and polish.**
- [x] Photos exported and registered (`scripts/export-wedding-photos.py`, `_photos/index.ts`).
- [x] `Section` chapter openers (instead of `PhotoBackdrop`), `Gallery`, `WeddingParty`, `ThingsToDo`, `Registry`, `ClosingPhoto`, the monogram docking.
- [x] Mobile pass at 375px (headless screenshots of each demo guest, both families' sides).
- [ ] Reduced-motion pass on a device; Lighthouse pass; the three real devices in section 9.

**Phase 4: gate + RSVP.**
- [x] Password + name entrance, signed session, `proxy.ts`, per-party home page and FAQ.
- [x] `submitRsvp` with zod validation, ownership and seat checks; `RsvpForm` (one screen per event, extras, review).
- [x] Demo guest list for local preview. Tested: all three tiers, duplicate name, close spellings, edit-after-submit, seat limit, an event for one person, open spots with and without names, the confirm step, tampered requests, rate limit.
- [x] Google Sheet sync: `/hridee/sync`, `_lib/sheet/`, `scripts/wedding-sheet.gs`. Tested against the demo store (copied rows, cleared IDs, renames, removals, the mass-removal guard, bad cells, slot names), and with the Apps Script run against a fake Sheets API.
- [ ] New Supabase project, run `schema.sql`, env vars (section 6).
- [ ] Deploy, create the sheet (section 7), and do the end-to-end test in section 7, step 8, against the real database.
- [ ] Test after the deadline (set `rsvpDeadline` to yesterday locally).
- [ ] Right before invitations go out: run the reset in section 7, so test RSVPs don't stay in the counts.

**Phase 5: visibility and launch.**
- Share the sheet with the family (section 7, step 9). For caterers or seating charts, use File > Download > CSV on the RSVPs tab.
- Optional: confirmation email to the guest after RSVP (Resend free tier) and a notification to you.
- OG image (`app/(wedding)/hridee/opengraph-image.png`) so the link previews nicely in WhatsApp; keep the description generic.
- Vercel preview protection on, env vars set for Production, final security checklist pass.
- Save-the-dates with the URL / QR code.

**After the wedding.** Swap the RSVP page for a thank-you + photo gallery, delete the sheet's 10-minute trigger (Apps Script > Triggers), keep a copy of the sheet, and delete the Supabase project.

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
- Whether the ceremony is unplugged.
- Meal options per event (if any), so the RSVP form knows whether to ask.
- The guest list, typed straight into the family's Google Sheet (section 7), each family on its own tab: family name, guest names, invites, an x per event, plus any private columns you like.
- [x] Engagement photos, hero, story photos, gallery set (section 3). Still wanted: a photo of each wedding party member.

---

## 12. Open decisions

- Which events offer a meal choice.
- Whether to collect trivia questions / video messages / slideshow photos (guide's optional extras).
- Confirmation emails: yes or no (adds an email provider).
- How long each event runs (`endTime` in `content.ts`); the calendar entries assume 3 hours until then.

---

## 13. Useful references

- Next.js 16 docs ship in `node_modules/next/dist/docs/` (route groups: `01-app/03-api-reference/03-file-conventions/route-groups.md`; proxy: `01-app/01-getting-started/16-proxy.md`; images: `01-app/01-getting-started/12-images.md`; server actions: `01-app/01-getting-started/07-mutating-data.md`).
- Guide this checklist follows: https://sayi.do/articles/complete-guide-wedding-website-must-haves
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Apps Script (the sheet's script): https://developers.google.com/apps-script/guides/sheets
- Supabase API keys (publishable / secret): https://supabase.com/docs/guides/getting-started/api-keys
- Supabase's mid-2026 change to table grants: https://github.com/orgs/supabase/discussions/45329
