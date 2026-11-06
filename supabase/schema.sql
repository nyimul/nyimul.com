-- Wedding RSVP schema. Run this whole file ONCE in the SQL editor of the NEW wedding-only
-- Supabase project (WEDDING.md > section 6 has the step-by-step).
-- app/(wedding)/_lib/store/types.ts mirrors these tables, and app/(wedding)/_lib/store/supabase.ts
-- is the only code that queries them. Guests and invitations arrive from the family's Google
-- Sheet through POST /hridee/sync; nobody needs to type rows in here.

create extension if not exists unaccent with schema extensions;

-- Helper functions live in a schema the Data API does not expose, so nobody can call them
-- over HTTP. Only triggers use them.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Events: three rows. The ids match the `events` array in app/(wedding)/_lib/content.ts.
-- content.ts is what guests see; this table exists so party_events and rsvps have
-- something to reference.
-- ---------------------------------------------------------------------------
create table events (
  id          text primary key,              -- 'nikkah' | 'holud' | 'reception'
  name        text not null,
  starts_at   timestamptz,
  sort_order  int  not null default 0
);

insert into events (id, name, starts_at, sort_order) values
  ('nikkah',    'Nikkah',     '2027-04-09 09:30-04', 1),
  ('holud',     'Gaye Holud', '2027-04-09 18:30-04', 2),
  ('reception', 'Reception',  '2027-04-10 19:00-04', 3);

-- ---------------------------------------------------------------------------
-- Parties: one row per invitation / household. This is what guests look up at /hridee/enter.
-- ---------------------------------------------------------------------------
create table parties (
  id            uuid primary key default gen_random_uuid(),
  display_name  text not null,               -- "The Hoque Family", "Ayesha & Omar"
  -- Kept up to date by the triggers below: the display name plus every guest's full name,
  -- lowercased, accents stripped, punctuation turned into spaces, joined with " | ".
  -- The lookup matches the typed name (normalised the same way in _lib/names.ts) against it.
  search_name   text not null default '',
  invite_code   text unique,                 -- optional short code printed on the invitation
  -- Set when the party's row leaves the Google Sheet. The site then ignores the party, but its
  -- guests and RSVPs stay, so putting the row back restores everything.
  archived_at   timestamptz,
  -- The sheet's "Others need a named guest": open spots can't come to an event unless someone
  -- named on the invitation is coming to it. Off by default.
  others_need_named  boolean not null default false,
  -- Which family's tab the row is on. Decides the event colors this party sees.
  family        text not null default 'nyimul' check (family in ('nyimul', 'hridee')),
  created_at    timestamptz not null default now()
  -- Phone numbers, addresses and private notes live in the Google Sheet only, never here.
);

create index parties_search_name_idx on parties (search_name);

-- ---------------------------------------------------------------------------
-- Guests: the people in a party. A "+1" or an unnamed child is a SLOT: is_slot = true and
-- full_name = null until the guest types a name on the RSVP form. Only slot names can be
-- changed by guests; everyone else's name is fixed.
-- ---------------------------------------------------------------------------
create table guests (
  id          uuid primary key default gen_random_uuid(),
  party_id    uuid not null references parties(id) on delete cascade,
  full_name   text,
  is_slot     boolean not null default false,
  is_child    boolean not null default false,
  sort_order  int not null default 0,
  check (is_slot or full_name is not null)
);

create index guests_party_id_idx on guests (party_id);

-- ---------------------------------------------------------------------------
-- Party invitations: WHICH events each party is invited to and HOW MANY seats they get there.
-- This is what decides which events a guest sees on the site. A family of five might have
-- max_guests = 5 for the reception, 5 for the Holud, and no row at all for the Nikkah
-- (not invited, so the site never shows it to them). The server enforces the seat cap.
-- ---------------------------------------------------------------------------
create table party_events (
  party_id    uuid not null references parties(id) on delete cascade,
  event_id    text not null references events(id) on delete cascade,
  max_guests  int  not null check (max_guests > 0),
  -- null: the whole invitation. Set: only these guests (the sheet says "Farid Karim" under
  -- Nikkah, so the RSVP form offers the Nikkah to Farid alone).
  guest_ids   uuid[],
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
-- Rate limiting for the entrance (password tries and name lookups), per IP.
-- Old rows are harmless; delete them whenever you like.
-- ---------------------------------------------------------------------------
create table lookup_attempts (
  id          bigint generated always as identity primary key,
  ip          text not null,
  kind        text not null,                 -- 'password' | 'lookup'
  created_at  timestamptz not null default now()
);

create index lookup_attempts_ip_kind_idx on lookup_attempts (ip, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- search_name maintenance. Fires on every change to a party's name or its guests, so it is
-- correct whether rows come from the import script, the RSVP form or the Supabase dashboard.
-- ---------------------------------------------------------------------------
create or replace function private.refresh_party_search_name(p_party uuid) returns void
language sql security definer set search_path = '' as $$
  update public.parties p
  set search_name = coalesce((
    select string_agg(n, ' | ')
    from (
      select trim(regexp_replace(lower(extensions.unaccent(p.display_name)), '[^a-z0-9]+', ' ', 'g')) as n
      union all
      select trim(regexp_replace(lower(extensions.unaccent(g.full_name)), '[^a-z0-9]+', ' ', 'g'))
      from public.guests g
      where g.party_id = p.id and g.full_name is not null
    ) names
    where n <> ''
  ), '')
  where p.id = p_party;
$$;

create or replace function private.parties_search_name_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.refresh_party_search_name(new.id);
  return null;
end $$;

create or replace function private.guests_search_name_trg() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'INSERT' then
    perform private.refresh_party_search_name(old.party_id);
  end if;
  if tg_op <> 'DELETE' and (tg_op = 'INSERT' or new.party_id is distinct from old.party_id
                            or new.full_name is distinct from old.full_name) then
    perform private.refresh_party_search_name(new.party_id);
  end if;
  return null;
end $$;

create trigger parties_search_name
  after insert or update of display_name on parties
  for each row execute function private.parties_search_name_trg();

create trigger guests_search_name
  after insert or update or delete on guests
  for each row execute function private.guests_search_name_trg();

-- ---------------------------------------------------------------------------
-- SECURITY. Turn on Row Level Security everywhere and add NO policies.
-- Result: the public keys can read and write nothing. The website only touches the database
-- from server code using the secret key (sb_secret_..., the service_role role), which bypasses
-- RLS. If a browser ever got hold of the publishable key it would still see nothing.
-- ---------------------------------------------------------------------------
alter table events          enable row level security;
alter table parties         enable row level security;
alter table guests          enable row level security;
alter table party_events    enable row level security;
alter table rsvps           enable row level security;
alter table party_responses enable row level security;
alter table lookup_attempts enable row level security;

-- ---------------------------------------------------------------------------
-- Handy view for the Supabase SQL editor (`select * from rsvp_overview`): one row per guest per
-- event, current invitations only. The family sees the same thing in the sheet's RSVPs tab.
-- security_invoker makes the view obey RLS. Without it, a view runs as its owner and the
-- anon key could read every guest through it, even with RLS on the tables.
-- ---------------------------------------------------------------------------
create view rsvp_overview with (security_invoker = true) as
select
  p.display_name   as party,
  g.full_name      as guest,
  g.is_child,
  e.name           as event,
  pe.max_guests,
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
where p.archived_at is null
  and (pe.guest_ids is null or g.id = any(pe.guest_ids))
order by e.sort_order, p.display_name, g.sort_order;

-- ---------------------------------------------------------------------------
-- WHO CAN REACH THESE TABLES OVER THE API. Since mid-2026 new Supabase projects no longer grant
-- new tables to the API roles automatically, so grant exactly what the website needs:
--   service_role (the website's secret key): everything, still only from server code.
--   anon / authenticated (public keys): nothing at all, on top of RLS with no policies.
-- ---------------------------------------------------------------------------
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Example party, to copy when testing by hand. Normally the Google Sheet sync creates these.
-- ---------------------------------------------------------------------------
-- with p as (
--   insert into parties (display_name) values ('The Karim Family') returning id
-- ), g as (
--   insert into guests (party_id, full_name, is_slot, is_child, sort_order)
--   select id, x.full_name, x.is_slot, x.is_child, x.sort_order from p,
--     (values ('Farid Karim', false, false, 1), ('Nadia Karim', false, false, 2),
--             (null, true, true, 3)) as x(full_name, is_slot, is_child, sort_order)
-- )
-- insert into party_events (party_id, event_id, max_guests)
-- select id, e, 3 from p, unnest(array['holud', 'reception']) as e;
