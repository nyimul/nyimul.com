-- Wedding RSVP schema (DRAFT). Run this in the SQL editor of the NEW wedding-only Supabase project,
-- or save it as a migration (supabase/migrations/<timestamp>_init.sql) with the Supabase CLI.
-- app/(wedding)/_lib/types.ts mirrors these tables.

-- ---------------------------------------------------------------------------
-- Events: three rows. The ids match the `events` array in app/(wedding)/_lib/content.ts.
-- ---------------------------------------------------------------------------
create table events (
  id          text primary key,              -- 'holud' | 'nikkah' | 'reception'
  name        text not null,
  starts_at   timestamptz,
  sort_order  int  not null default 0
);

-- ---------------------------------------------------------------------------
-- Parties: one row per invitation / household. This is what guests look up.
-- ---------------------------------------------------------------------------
create table parties (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,               -- "The Hoque Family", "Ayesha & Omar"
  search_name   text not null,               -- lowercased, trimmed, accents stripped; what lookup matches on
  invite_code   text unique,                 -- optional short code printed on the invitation for exact lookup
  side          text,                        -- 'bride' | 'groom' | 'both' (handy for the admin view)
  email         text,
  phone         text,
  notes         text,                        -- private notes, never shown to guests
  created_at    timestamptz not null default now()
);

create index parties_search_name_idx on parties (search_name);

-- ---------------------------------------------------------------------------
-- Guests: the people in a party. A "+1" or an unnamed child is a row with full_name = null
-- that the guest fills in when they RSVP.
-- ---------------------------------------------------------------------------
create table guests (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references parties(id) on delete cascade,
  full_name   text,                          -- null until a +1 / child slot is named
  is_child    boolean not null default false,
  sort_order  int not null default 0
);

create index guests_party_id_idx on guests (party_id);

-- ---------------------------------------------------------------------------
-- Party invitations: WHICH events each party is invited to and HOW MANY seats they get there.
-- A family of five might have max_guests = 5 for the reception, 5 for the Holud, and no row at
-- all for the Nikkah (not invited). A couple has max_guests = 2. The server enforces this cap.
-- ---------------------------------------------------------------------------
create table party_events (
  party_id    uuid not null references parties(id) on delete cascade,
  event_id    text not null references events(id) on delete cascade,
  max_guests  int  not null check (max_guests > 0),
  primary key (party_id, event_id)
);

-- ---------------------------------------------------------------------------
-- RSVPs: one row per guest per event. unique() lets you upsert when a guest edits their reply.
-- ---------------------------------------------------------------------------
create table rsvps (
  id             uuid primary key default gen_random_uuid(),
  guest_id       uuid not null references guests(id) on delete cascade,
  event_id       text not null references events(id) on delete cascade,
  attending      boolean not null,
  meal_choice    text,                       -- only if that event offers a choice
  dietary_notes  text,                       -- allergies, halal-only, vegetarian, etc.
  updated_at     timestamptz not null default now(),
  unique (guest_id, event_id)
);

-- ---------------------------------------------------------------------------
-- Things asked once per party, not per person (guide: song requests, a message).
-- ---------------------------------------------------------------------------
create table party_responses (
  party_id      uuid primary key references parties(id) on delete cascade,
  song_request  text,
  message       text,
  submitted_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- SECURITY. Turn on Row Level Security everywhere and add NO policies.
-- Result: the public "anon" key can read and write nothing. The website only touches the
-- database from server code using the service-role key, which bypasses RLS. If a browser ever
-- got hold of the anon key it would still see an empty database.
-- ---------------------------------------------------------------------------
alter table events          enable row level security;
alter table parties         enable row level security;
alter table guests          enable row level security;
alter table party_events    enable row level security;
alter table rsvps           enable row level security;
alter table party_responses enable row level security;

-- ---------------------------------------------------------------------------
-- Handy view for the admin page / Google Sheets export: one row per guest per event.
-- ---------------------------------------------------------------------------
create view rsvp_overview as
select
  p.display_name   as party,
  p.side,
  g.full_name      as guest,
  g.is_child,
  e.name           as event,
  r.attending,
  r.meal_choice,
  r.dietary_notes,
  pr.song_request,
  pr.message,
  r.updated_at
from party_events pe
join parties p  on p.id = pe.party_id
join events  e  on e.id = pe.event_id
join guests  g  on g.party_id = p.id
left join rsvps r on r.guest_id = g.id and r.event_id = e.id
left join party_responses pr on pr.party_id = p.id
order by e.sort_order, p.display_name, g.sort_order;

-- Seed the events (edit the timestamps):
-- insert into events (id, name, starts_at, sort_order) values
--   ('holud',     'Gaye Holud', '2027-04-01 18:00-04', 1),
--   ('nikkah',    'Nikkah',     '2027-04-02 11:00-04', 2),
--   ('reception', 'Reception',  '2027-04-03 18:00-04', 3);
