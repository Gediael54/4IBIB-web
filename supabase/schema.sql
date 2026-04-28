-- =============================================================================
-- 4IBIB Supabase canonical schema
-- =============================================================================
-- Sections:
--   1. Extensions
--   2. Enum types
--   3. Tables (final shape, all constraints inline)
--   4. Functions
--   5. Schema upgrades for existing databases (idempotent; no-op on fresh)
--   6. Indexes
--   7. Views
--   8. Triggers
--   9. Row Level Security and policies
--   10. Bootstrap data (idempotent on re-runs)
--   11. Schedule seed (auto-generated; do not edit between SEED markers)
-- =============================================================================
-- The whole script runs inside a single transaction so a failure rolls back
-- without leaving partial migrations or dropped policies behind.

begin;


-- =============================================================================
-- 1. Extensions
-- =============================================================================

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;


-- =============================================================================
-- 2. Enum types
-- =============================================================================
-- Native enums for columns whose values are a fixed, stable vocabulary.
-- Storage is 4 bytes per value, validation is enforced by the type itself
-- (no CHECK constraint needed) and adding a new option later is a one-line
-- `alter type ... add value`.

do $$ begin
  if not exists (select 1 from pg_type where typname = 'admin_role' and typnamespace = 'public'::regnamespace) then
    create type public.admin_role as enum ('owner', 'editor');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'announcement_category' and typnamespace = 'public'::regnamespace) then
    create type public.announcement_category as enum ('geral', 'evento', 'juventude', 'oracao');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'schedule_status' and typnamespace = 'public'::regnamespace) then
    create type public.schedule_status as enum ('scheduled', 'suspended', 'free');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'prayer_status' and typnamespace = 'public'::regnamespace) then
    create type public.prayer_status as enum ('novo', 'em_oracao', 'concluido');
  end if;
end $$;


-- =============================================================================
-- 3. Tables
-- =============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.admin_role not null,
  created_at timestamptz not null default now()
);

create table if not exists public.church_profile (
  id text primary key default 'main' constraint church_profile_singleton_id check (id = 'main'),
  name text not null,
  short_name text not null,
  tagline text not null,
  city text not null,
  pastor_name text not null,
  address text not null,
  email text not null,
  whatsapp text not null,
  instagram_url text not null default '',
  youtube_url text not null default '',
  maps_url text not null default '',
  hero_verse text not null,
  mission text not null,
  founded_text text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  category public.announcement_category not null,
  published_at timestamptz not null default now(),
  pinned boolean not null default false,
  cta_label text not null default '',
  cta_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null default '',
  summary text not null,
  meeting_time text not null,
  contact text not null,
  color text not null default '#0f766e',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_meetings (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.church_profile(id) on delete cascade,
  title text not null,
  weekday text not null,
  starts_at time not null,
  ends_at time not null,
  description text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_meeting_time_order check (ends_at > starts_at)
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  ministry_id uuid not null references public.ministries(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null,
  summary text not null,
  preacher text not null default '',
  director text not null default '',
  passage text not null default '',
  occasion_label text not null default '',
  status public.schedule_status not null default 'scheduled',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_time_order check (ends_at > starts_at)
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  message text not null,
  status public.prayer_status not null default 'novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.prayer_request_rate_limits (
  id uuid primary key default gen_random_uuid(),
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  changed_by uuid,
  changed_at timestamptz not null default now(),
  old_row jsonb,
  new_row jsonb
);


-- =============================================================================
-- 4. Functions
-- =============================================================================

create or replace function public.ministry_slug(value text)
returns text
language sql
stable
as $$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(lower(extensions.unaccent(coalesce(value, ''))), '[^a-z0-9]+', '-', 'g')),
      ''
    ),
    'geral'
  );
$$;

create or replace function public.set_ministry_slug()
returns trigger
language plpgsql
as $$
begin
  new.slug = public.ministry_slug(new.name);
  return new;
end;
$$;

create or replace function public.upsert_ministry_id(ministry_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := nullif(trim(coalesce(ministry_name, '')), '');
  normalized_slug text;
  result_id uuid;
begin
  if normalized_name is null then
    normalized_name := 'Geral';
  end if;

  normalized_slug := public.ministry_slug(normalized_name);

  insert into public.ministries (name, summary, meeting_time, contact)
  values (normalized_name, '', '', '')
  on conflict (slug) do nothing
  returning id into result_id;

  if result_id is null then
    select id
    into result_id
    from public.ministries
    where slug = normalized_slug
    limit 1;
  end if;

  return result_id;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.log_content_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_row jsonb;
  target_id text;
begin
  if tg_op = 'DELETE' then
    target_row = to_jsonb(old);
    target_id = old.id::text;
  else
    target_row = to_jsonb(new);
    target_id = new.id::text;
  end if;

  insert into public.content_audit_log (
    table_name,
    row_id,
    action,
    changed_by,
    old_row,
    new_row
  ) values (
    tg_table_name,
    target_id,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then target_row else null end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
      and role = 'owner'
  );
$$;


-- =============================================================================
-- 5. Schema upgrades for existing databases (idempotent; no-op on fresh)
-- =============================================================================
-- `create table if not exists` above is a no-op on tables that already exist,
-- so any column that was added to the canonical shape after the table was
-- first created has to be applied here. Every statement is guarded so this
-- whole block is safe on a brand-new database (no row matches the guard).

-- 5.1 Renames of columns that changed name --------------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'schedule_items'
               and column_name = 'leader')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'schedule_items'
                       and column_name = 'preacher') then
    alter table public.schedule_items rename column leader to preacher;
  end if;
end $$;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'schedule_items'
               and column_name = 'special_date')
     and not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'schedule_items'
                       and column_name = 'occasion_label') then
    alter table public.schedule_items rename column special_date to occasion_label;
  end if;
end $$;

-- 5.2 Add missing columns -------------------------------------------------
-- Every column with a default in the canonical CREATE TABLE is repeated here
-- with `add column if not exists` so an older shape is upgraded in place.

alter table public.church_profile add column if not exists instagram_url text not null default '';
alter table public.church_profile add column if not exists youtube_url text not null default '';
alter table public.church_profile add column if not exists maps_url text not null default '';

alter table public.announcements add column if not exists pinned boolean not null default false;
alter table public.announcements add column if not exists cta_label text not null default '';
alter table public.announcements add column if not exists cta_url text not null default '';

alter table public.ministries add column if not exists slug text not null default '';
alter table public.ministries add column if not exists color text not null default '#0f766e';

alter table public.schedule_items add column if not exists preacher text not null default '';
alter table public.schedule_items add column if not exists director text not null default '';
alter table public.schedule_items add column if not exists passage text not null default '';
alter table public.schedule_items add column if not exists occasion_label text not null default '';
alter table public.schedule_items add column if not exists status text not null default 'scheduled';
alter table public.schedule_items add column if not exists ministry_id uuid;
alter table public.schedule_items add column if not exists featured boolean not null default false;

alter table public.prayer_requests add column if not exists contact text not null default '';
alter table public.prayer_requests add column if not exists status text not null default 'novo';

-- 5.3 Backfill ministries.slug and dedupe ---------------------------------
update public.ministries
set slug = public.ministry_slug(name)
where slug is null or slug = '';

with duplicate_slugs as (
  select id, slug,
         row_number() over (partition by slug order by created_at, id) as duplicate_rank
  from public.ministries
)
update public.ministries as m
set slug = m.slug || '-' || left(m.id::text, 8)
from duplicate_slugs
where m.id = duplicate_slugs.id and duplicate_slugs.duplicate_rank > 1;

-- 5.4 Slug trigger and unique index (must exist before ministry_id backfill,
-- which calls upsert_ministry_id and uses on conflict (slug)) ---------------
drop trigger if exists set_ministries_slug on public.ministries;
create trigger set_ministries_slug
before insert or update of name on public.ministries
for each row execute function public.set_ministry_slug();

-- Drop any pre-existing unique constraint or differently-named unique index on
-- ministries.slug so the canonical index name and shape are guaranteed.
do $$
declare
  cons_name text;
begin
  for cons_name in
    select c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.conrelid = 'public.ministries'::regclass
      and c.contype = 'u'
      and a.attname = 'slug'
  loop
    execute format('alter table public.ministries drop constraint if exists %I', cons_name);
  end loop;
end $$;

drop index if exists public.ministries_slug_unique;
create unique index ministries_slug_unique on public.ministries (slug);

-- 5.5 schedule_items.ministry_id: backfill, FK, NOT NULL, drop legacy ------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'schedule_items'
               and column_name = 'ministry') then
    execute $sql$
      update public.schedule_items
      set ministry_id = public.upsert_ministry_id(ministry)
      where ministry_id is null
    $sql$;
  end if;
end $$;

update public.schedule_items
set ministry_id = public.upsert_ministry_id('Geral')
where ministry_id is null;

do $$
begin
  if not exists (select 1 from information_schema.table_constraints
                 where table_schema = 'public' and table_name = 'schedule_items'
                   and constraint_name = 'schedule_items_ministry_id_fkey') then
    alter table public.schedule_items
      add constraint schedule_items_ministry_id_fkey
      foreign key (ministry_id) references public.ministries(id) on delete restrict;
  end if;
end $$;

alter table public.schedule_items alter column ministry_id set not null;
alter table public.schedule_items drop column if exists ministry;

-- 5.6 Drop legacy schedule_items.google_event_id ------------------------
-- The system does not need to track external Google Calendar IDs anymore;
-- the seed re-runs idempotently via deterministic ids. The schedule_items_app
-- view used to expose this column, so it has to go before the alter table.
-- Section 7 recreates the view with the canonical column list.
drop view if exists public.schedule_items_app cascade;
alter table public.schedule_items drop column if exists google_event_id;

-- 5.7 Convert text + check columns to enum types --------------------------
-- Drops the (named or auto-named) check constraint, casts the column to the
-- new enum type, and re-applies the default. Skipped if the column is
-- already the enum type.

do $$
declare
  cons_name text;
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'schedule_items' and column_name = 'status') = 'text' then
    for cons_name in
      select c.conname from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.conrelid = 'public.schedule_items'::regclass
        and c.contype = 'c' and a.attname = 'status'
    loop
      execute format('alter table public.schedule_items drop constraint %I', cons_name);
    end loop;
    alter table public.schedule_items alter column status drop default;
    alter table public.schedule_items alter column status type public.schedule_status using status::public.schedule_status;
    alter table public.schedule_items alter column status set default 'scheduled'::public.schedule_status;
  end if;
end $$;

do $$
declare
  cons_name text;
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'announcements' and column_name = 'category') = 'text' then
    for cons_name in
      select c.conname from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.conrelid = 'public.announcements'::regclass
        and c.contype = 'c' and a.attname = 'category'
    loop
      execute format('alter table public.announcements drop constraint %I', cons_name);
    end loop;
    alter table public.announcements alter column category type public.announcement_category using category::public.announcement_category;
  end if;
end $$;

do $$
declare
  cons_name text;
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'prayer_requests' and column_name = 'status') = 'text' then
    for cons_name in
      select c.conname from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.conrelid = 'public.prayer_requests'::regclass
        and c.contype = 'c' and a.attname = 'status'
    loop
      execute format('alter table public.prayer_requests drop constraint %I', cons_name);
    end loop;
    alter table public.prayer_requests alter column status drop default;
    alter table public.prayer_requests alter column status type public.prayer_status using status::public.prayer_status;
    alter table public.prayer_requests alter column status set default 'novo'::public.prayer_status;
  end if;
end $$;

do $$
declare
  cons_name text;
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'admin_users' and column_name = 'role') = 'text' then
    for cons_name in
      select c.conname from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
      where c.conrelid = 'public.admin_users'::regclass
        and c.contype = 'c' and a.attname = 'role'
    loop
      execute format('alter table public.admin_users drop constraint %I', cons_name);
    end loop;
    alter table public.admin_users alter column role type public.admin_role using role::public.admin_role;
  end if;
end $$;

-- 5.8 church_profile singleton constraint --------------------------------
do $$
begin
  if not exists (select 1 from information_schema.table_constraints
                 where table_schema = 'public' and table_name = 'church_profile'
                   and constraint_name = 'church_profile_singleton_id') then
    alter table public.church_profile
      add constraint church_profile_singleton_id check (id = 'main');
  end if;
end $$;

-- 5.9 Drop legacy church_profile.regular_meetings (data lives in
-- recurring_meetings now) -------------------------------------------------
alter table public.church_profile drop column if exists regular_meetings;


-- =============================================================================
-- 6. Indexes
-- =============================================================================
-- ministries_slug_unique lives in section 5.4 because the upgrades depend on
-- it before this section runs.

-- Tear down any leftover index from the legacy google_event_id column.
drop index if exists public.schedule_google_event_id_unique;

create index if not exists schedule_starts_at_idx on public.schedule_items (starts_at);
create index if not exists schedule_scheduled_starts_at_idx
  on public.schedule_items (starts_at)
  where status = 'scheduled';
create index if not exists schedule_ministry_id_idx on public.schedule_items (ministry_id);

create index if not exists recurring_meetings_profile_sort_idx
  on public.recurring_meetings (profile_id, sort_order);

create index if not exists announcements_pinned_published_at_idx
  on public.announcements (published_at desc)
  where pinned = true;

create index if not exists prayer_requests_created_at_idx on public.prayer_requests (created_at desc);
create index if not exists prayer_rate_limits_ip_created_at_idx
  on public.prayer_request_rate_limits (ip_hash, created_at desc);

create index if not exists content_audit_log_changed_at_idx
  on public.content_audit_log (changed_at desc);
create index if not exists content_audit_log_table_row_idx
  on public.content_audit_log (table_name, row_id, changed_at desc);


-- =============================================================================
-- 7. Views
-- =============================================================================

create or replace view public.schedule_items_app
with (security_invoker = true)
as
select
  schedule_items.id,
  schedule_items.title,
  schedule_items.ministry_id,
  ministries.name as ministry,
  schedule_items.starts_at,
  schedule_items.ends_at,
  schedule_items.location,
  schedule_items.summary,
  schedule_items.preacher,
  schedule_items.director,
  schedule_items.passage,
  schedule_items.occasion_label,
  schedule_items.status,
  schedule_items.featured,
  schedule_items.created_at,
  schedule_items.updated_at
from public.schedule_items
join public.ministries on ministries.id = schedule_items.ministry_id;


-- =============================================================================
-- 8. Triggers
-- =============================================================================

-- 8.1 Slug auto-populate trigger lives in section 5.4 (it must exist before
-- the ministry_id backfill runs).

-- 8.2 updated_at touch ------------------------------------------------------
drop trigger if exists touch_church_profile_updated_at on public.church_profile;
create trigger touch_church_profile_updated_at
before update on public.church_profile
for each row execute function public.touch_updated_at();

drop trigger if exists touch_announcements_updated_at on public.announcements;
create trigger touch_announcements_updated_at
before update on public.announcements
for each row execute function public.touch_updated_at();

drop trigger if exists touch_ministries_updated_at on public.ministries;
create trigger touch_ministries_updated_at
before update on public.ministries
for each row execute function public.touch_updated_at();

drop trigger if exists touch_recurring_meetings_updated_at on public.recurring_meetings;
create trigger touch_recurring_meetings_updated_at
before update on public.recurring_meetings
for each row execute function public.touch_updated_at();

drop trigger if exists touch_schedule_items_updated_at on public.schedule_items;
create trigger touch_schedule_items_updated_at
before update on public.schedule_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_prayer_requests_updated_at on public.prayer_requests;
create trigger touch_prayer_requests_updated_at
before update on public.prayer_requests
for each row execute function public.touch_updated_at();

-- 8.3 Audit log -------------------------------------------------------------
drop trigger if exists audit_church_profile on public.church_profile;
create trigger audit_church_profile
after insert or update or delete on public.church_profile
for each row execute function public.log_content_audit();

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements
after insert or update or delete on public.announcements
for each row execute function public.log_content_audit();

drop trigger if exists audit_ministries on public.ministries;
create trigger audit_ministries
after insert or update or delete on public.ministries
for each row execute function public.log_content_audit();

drop trigger if exists audit_recurring_meetings on public.recurring_meetings;
create trigger audit_recurring_meetings
after insert or update or delete on public.recurring_meetings
for each row execute function public.log_content_audit();

drop trigger if exists audit_schedule_items on public.schedule_items;
create trigger audit_schedule_items
after insert or update or delete on public.schedule_items
for each row execute function public.log_content_audit();

drop trigger if exists audit_prayer_requests on public.prayer_requests;
create trigger audit_prayer_requests
after insert or update or delete on public.prayer_requests
for each row execute function public.log_content_audit();


-- =============================================================================
-- 9. Row Level Security and policies
-- =============================================================================

alter table public.admin_users enable row level security;
alter table public.church_profile enable row level security;
alter table public.announcements enable row level security;
alter table public.ministries enable row level security;
alter table public.recurring_meetings enable row level security;
alter table public.schedule_items enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.prayer_request_rate_limits enable row level security;
alter table public.content_audit_log enable row level security;

drop policy if exists "admins can read own admin row" on public.admin_users;
create policy "admins can read own admin row"
on public.admin_users for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "owners can manage admin users" on public.admin_users;
create policy "owners can manage admin users"
on public.admin_users for all
to authenticated
using (public.is_owner())
with check (public.is_owner());

drop policy if exists "public can read church profile" on public.church_profile;
create policy "public can read church profile"
on public.church_profile for select
to anon, authenticated
using (true);

drop policy if exists "admins can write church profile" on public.church_profile;
create policy "admins can write church profile"
on public.church_profile for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read announcements" on public.announcements;
create policy "public can read announcements"
on public.announcements for select
to anon, authenticated
using (true);

drop policy if exists "admins can write announcements" on public.announcements;
create policy "admins can write announcements"
on public.announcements for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read ministries" on public.ministries;
create policy "public can read ministries"
on public.ministries for select
to anon, authenticated
using (true);

drop policy if exists "admins can write ministries" on public.ministries;
create policy "admins can write ministries"
on public.ministries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read recurring meetings" on public.recurring_meetings;
create policy "public can read recurring meetings"
on public.recurring_meetings for select
to anon, authenticated
using (true);

drop policy if exists "admins can write recurring meetings" on public.recurring_meetings;
create policy "admins can write recurring meetings"
on public.recurring_meetings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read schedule" on public.schedule_items;
create policy "public can read schedule"
on public.schedule_items for select
to anon, authenticated
using (true);

drop policy if exists "admins can write schedule" on public.schedule_items;
create policy "admins can write schedule"
on public.schedule_items for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can manage prayer requests" on public.prayer_requests;
create policy "admins can manage prayer requests"
on public.prayer_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins can read audit log" on public.content_audit_log;
create policy "admins can read audit log"
on public.content_audit_log for select
to authenticated
using (public.is_admin());


-- =============================================================================
-- 10. Bootstrap data
-- =============================================================================

insert into public.church_profile (
  id,
  name,
  short_name,
  tagline,
  city,
  pastor_name,
  address,
  email,
  whatsapp,
  hero_verse,
  mission,
  founded_text
) values (
  'main',
  '4a Igreja Batista Independente Betel',
  '4a Betel',
  '',
  'Caruaru, PE',
  '',
  '478 Rua Jose Victor de Albuquerque',
  '',
  '+55 81 98122-0651',
  '',
  '',
  ''
) on conflict (id) do nothing;

insert into public.recurring_meetings (id, profile_id, title, weekday, starts_at, ends_at, description, sort_order)
values
  ('00000000-0000-4000-8000-000000000101'::uuid, 'main', 'Culto de louvor', 'Quinta', '19:30'::time, '21:00'::time, '', 10),
  ('00000000-0000-4000-8000-000000000102'::uuid, 'main', 'Escola Biblica', 'Domingo', '09:30'::time, '11:00'::time, '', 20),
  ('00000000-0000-4000-8000-000000000103'::uuid, 'main', 'Culto solene', 'Domingo', '17:00'::time, '19:00'::time, '', 30)
on conflict (id) do nothing;


-- =============================================================================
-- 11. Schedule seed (auto-generated from supabase/sources/Escala-de-cultos.xlsx)
-- =============================================================================
-- Run `npm run seed:schedule` to regenerate everything between the SEED markers
-- below. Do not edit by hand: changes will be overwritten.

-- BEGIN SEED ------------------------------------------------------------------
with schedule_seed (
  id, title, ministry_name, starts_at, ends_at, location, summary,
  preacher, director, passage, occasion_label, status
) as (
  values
    ('ba44b02a-cfbc-4aef-8062-170f638bb036'::uuid, 'Culto Solene', 'Culto', '2026-01-04T20:00:00.000Z'::timestamptz, '2026-01-04T22:00:00.000Z'::timestamptz, 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Aparecido Regino', 'Marcos 1', '', 'scheduled'),
    ('d7604ab2-8705-4b94-be5c-e9b03d696bbb'::uuid, 'Culto de Oração', 'Culto', '2026-01-06T22:30:00.000Z', '2026-01-07T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('d358acbe-cbb6-42a5-9613-020a64b2654b'::uuid, 'Culto de oração', 'Culto', '2026-01-08T22:30:00.000Z', '2026-01-09T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('7ad5ca3e-78b5-4238-8edc-a58592e7bd5a'::uuid, 'Culto Solene', 'Culto', '2026-01-11T20:00:00.000Z', '2026-01-11T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Gilmar Fonseca', 'Marcos 2', '', 'scheduled'),
    ('3a07e811-1f09-4037-9181-af0dd0789b5f'::uuid, 'Culto de oração', 'Culto', '2026-01-13T22:30:00.000Z', '2026-01-14T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('2f41e84e-2d05-4ad0-82f8-ebedca15e573'::uuid, 'Culto de oração', 'Culto', '2026-01-15T22:30:00.000Z', '2026-01-16T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('ac4e3d34-8940-42a4-b179-5b620f919267'::uuid, 'Culto Solene', 'Culto', '2026-01-18T20:00:00.000Z', '2026-01-18T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Graça Lira', 'Marcos 3', '', 'scheduled'),
    ('b5c18ca8-8494-4ac9-bbf9-81601c1a4d0b'::uuid, 'Culto de oração', 'Culto', '2026-01-20T22:30:00.000Z', '2026-01-21T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('99523b3e-e026-4093-ab74-7c05ea608dad'::uuid, 'Culto de oração', 'Culto', '2026-01-22T22:30:00.000Z', '2026-01-23T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('104bdb47-36c4-46ab-992a-2bff27b48440'::uuid, 'Culto Solene', 'Culto', '2026-01-25T20:00:00.000Z', '2026-01-25T22:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Diac. Juliana Goberto', 'Marcos 4', '', 'scheduled'),
    ('bd84faab-6d2d-41e3-993e-301d13828ae3'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-01-25T12:30:00.000Z', '2026-01-25T14:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', '', '', '', 'scheduled'),
    ('29fb035a-5aad-4ec7-8c41-85861981a2e3'::uuid, 'Culto de oração', 'Culto', '2026-01-27T22:30:00.000Z', '2026-01-28T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('d1ee4f6e-6e5d-4e13-9670-624709a10340'::uuid, 'Culto de Doutrina', 'Culto', '2026-01-29T22:30:00.000Z', '2026-01-30T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('ccd3ab08-8e99-40e4-9c14-b94b9824fdbd'::uuid, 'Culto Solene', 'Culto', '2026-02-01T20:00:00.000Z', '2026-02-01T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Salete de Kássia', 'Marcos 5', '', 'scheduled'),
    ('47411d82-4a0f-470c-87c4-75594bd8ec46'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-02-01T12:30:00.000Z', '2026-02-01T14:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', '', '', '', 'scheduled'),
    ('475f3bcb-4984-4a54-a87b-f234fecd652b'::uuid, 'Culto de Oração', 'Culto', '2026-02-03T22:30:00.000Z', '2026-02-03T23:30:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('503e2b31-b80b-412c-aa30-c9ac09dd1afe'::uuid, 'Culto de Doutrina', 'Culto', '2026-02-05T22:30:00.000Z', '2026-02-06T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('743b2e47-98af-4f4a-88a8-e203bda968ae'::uuid, 'Culto Solene', 'Culto', '2026-02-08T20:00:00.000Z', '2026-02-08T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Lisiane Flavia Lopes', 'Marcos 6', '', 'scheduled'),
    ('221ca9a4-3202-4741-8a25-88d6c1d22c65'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-02-08T12:30:00.000Z', '2026-02-08T14:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', '', '', '', 'scheduled'),
    ('2c660258-054d-430f-9dcd-52844f35ab01'::uuid, 'Culto na praça', 'Culto', '2026-02-10T22:30:00.000Z', '2026-02-11T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('abc8ccdf-ad26-40bf-adf7-344b0d3f333c'::uuid, 'Culto de Doutrina', 'Culto', '2026-02-12T22:30:00.000Z', '2026-02-13T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('3a67f304-4513-4767-b8e9-b8226b9ae2ac'::uuid, 'Culto Solene', 'Culto', '2026-02-15T20:00:00.000Z', '2026-02-15T22:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Diac. Simone Oliveira', 'Marcos 7', 'CARNAVAL', 'scheduled'),
    ('889c7f10-4a4b-4ea7-bcd8-dce156e14f7a'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-02-15T12:30:00.000Z', '2026-02-15T14:00:00.000Z', 'Templo principal', '', '', '', '', 'CARNAVAL', 'suspended'),
    ('ed360fb3-cc1d-4bab-9736-07c1f3debe97'::uuid, 'Culto de Oração', 'Culto', '2026-02-17T22:30:00.000Z', '2026-02-18T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'suspended'),
    ('4fcb03e1-756f-4d04-98bd-3eda330eea92'::uuid, 'Culto de Doutrina', 'Culto', '2026-02-19T22:30:00.000Z', '2026-02-20T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('6f46c231-9a62-4375-ac15-1c3b31c58bf7'::uuid, 'Culto Solene', 'Culto', '2026-02-22T20:00:00.000Z', '2026-02-22T22:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Diac. Adeildo Natalício', '', '', 'scheduled'),
    ('17fbcda2-9356-4349-9590-077873ce73d2'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-02-22T12:30:00.000Z', '2026-02-22T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('d2f26a62-9220-49fe-883a-5f88136fcd70'::uuid, 'Culto na praça', 'Culto', '2026-02-24T22:30:00.000Z', '2026-02-25T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('8b9481dc-90af-4e27-9919-5663a8f5bee9'::uuid, 'Culto de Doutrina', 'Culto', '2026-02-26T22:30:00.000Z', '2026-02-27T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('8804896b-cdbd-4aa0-b5fc-355d910bcc34'::uuid, 'Culto Solene', 'Culto', '2026-03-01T20:00:00.000Z', '2026-03-01T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Ana Amélia', 'Marcos 9', '', 'scheduled'),
    ('8b5cc8e7-ac18-4d6f-a074-21e294be8fac'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-03-01T12:30:00.000Z', '2026-03-01T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('cdf2ce0a-12f1-4c78-9b5e-a89688f1bf01'::uuid, 'Culto de Oração', 'Culto', '2026-03-03T22:30:00.000Z', '2026-03-04T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('66f4006d-3fdc-46e2-ba4c-6cfd6306b494'::uuid, 'Culto de Doutrina', 'Culto', '2026-03-05T22:30:00.000Z', '2026-03-06T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('9e4d47b5-4be1-4e04-9cb9-b4b63aa62a72'::uuid, 'Culto Solene', 'Culto', '2026-03-08T20:00:00.000Z', '2026-03-08T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Ana Dupont', 'Marcos 10', 'Dia Internacional da Mulher', 'scheduled'),
    ('363422a9-5c7d-4c90-856d-7ffa2a84c36b'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-03-08T12:30:00.000Z', '2026-03-08T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('8f356395-b1e7-4f97-bead-95ebc4cbb9b2'::uuid, 'Culto na praça', 'Culto', '2026-03-10T22:30:00.000Z', '2026-03-11T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('7a1431c2-bbb1-4103-8c52-1c1e1b7e5c79'::uuid, 'Culto de Doutrina', 'Culto', '2026-03-12T22:30:00.000Z', '2026-03-13T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('82a2398f-2a51-4870-be97-21d186145cfa'::uuid, 'Culto Solene', 'Culto', '2026-03-15T20:00:00.000Z', '2026-03-15T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Aparecido Regino', 'Marcos 11', '', 'scheduled'),
    ('cdfb604f-ce66-44a0-abcb-ad53730516fe'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-03-15T12:30:00.000Z', '2026-03-15T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('b86bfb80-bb77-4025-bc48-9fb41e682b94'::uuid, 'Culto de Oração', 'Culto', '2026-03-17T22:30:00.000Z', '2026-03-18T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('04fdbaf6-0cb0-4a6a-aabe-e6f680c8c2fe'::uuid, 'Culto de Doutrina', 'Culto', '2026-03-19T22:30:00.000Z', '2026-03-20T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('199a6fe0-cf37-44e7-bfdd-33d9e4705f38'::uuid, 'Culto Solene', 'Culto', '2026-03-22T20:00:00.000Z', '2026-03-22T22:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Gilmar Fonseca', 'Marcos 12', '', 'scheduled'),
    ('f9409446-e951-43bd-8926-9e0459036785'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-03-22T12:30:00.000Z', '2026-03-22T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('1fad60b1-b723-4d49-9534-3d32358b9811'::uuid, 'Culto na praça', 'Culto', '2026-03-24T22:30:00.000Z', '2026-03-25T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('25609950-3c5c-4eab-bdc3-06a6a9bc0e74'::uuid, 'Culto de Doutrina', 'Culto', '2026-03-26T22:30:00.000Z', '2026-03-27T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('63b4597b-0824-4467-b8fa-794c9051debb'::uuid, 'Culto Solene', 'Culto', '2026-03-29T20:00:00.000Z', '2026-03-29T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Graça Lira', 'Marcos 13', '', 'scheduled'),
    ('05571ebf-b7e3-4129-836b-0557b01bec1a'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-03-29T12:30:00.000Z', '2026-03-29T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('dbba7c7b-582f-489c-a7ad-a4f09ef2ad64'::uuid, 'Culto de Oração', 'Culto', '2026-03-31T22:30:00.000Z', '2026-04-01T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('9ba427a7-3d4a-43fa-ba0d-77dc35e30c2d'::uuid, 'Culto de Louvor', 'Culto', '2026-04-02T22:30:00.000Z', '2026-04-03T00:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', '', '', '', 'scheduled'),
    ('81ece1a8-e76b-4662-850b-0378569ed63f'::uuid, 'Culto Solene', 'Culto', '2026-04-05T20:00:00.000Z', '2026-04-05T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Juliana Goberto', 'Marcos 14', 'PÁSCOA', 'scheduled'),
    ('728e473e-e1ce-4cb4-99c3-95aed2b97a38'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-04-05T12:30:00.000Z', '2026-04-05T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('9a8c2080-54b2-44b1-aead-31fbbfa92c0c'::uuid, 'Culto na praça', 'Culto', '2026-04-07T22:30:00.000Z', '2026-04-08T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('c1abca0d-4c8e-4ff2-9e5e-9875dce83464'::uuid, 'Culto de Louvor', 'Culto', '2026-04-09T22:30:00.000Z', '2026-04-10T00:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Dilma Martins', '', '', 'scheduled'),
    ('73d6418d-61c7-4cb0-843e-e7e5022b183b'::uuid, 'Culto Solene', 'Culto', '2026-04-12T20:00:00.000Z', '2026-04-12T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Salete de Kássia', 'Marcos 15', '', 'scheduled'),
    ('8c809dc1-b76c-4cec-a20e-f9a591bdd0da'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-04-12T12:30:00.000Z', '2026-04-12T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('69c5b529-dd4d-41e6-bf16-c0efcdcc4f1f'::uuid, 'Culto de Oração', 'Culto', '2026-04-14T22:30:00.000Z', '2026-04-15T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('0a826f7d-6d51-440e-93cd-a8c97ed12903'::uuid, 'Culto de Louvor', 'Culto', '2026-04-16T22:30:00.000Z', '2026-04-17T00:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Semin. Ruth Alves', '', '', 'scheduled'),
    ('c6a11dc9-d5b3-4c19-8159-af4f3d504487'::uuid, 'Culto Solene', 'Culto', '2026-04-19T20:00:00.000Z', '2026-04-19T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Lisiane Flavia Lopes', 'Marcos 16', '', 'scheduled'),
    ('a6d79f70-ee50-499f-b646-8c43c35751bf'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-04-19T12:30:00.000Z', '2026-04-19T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('8256af3b-7277-455b-8661-ff8b03450cfd'::uuid, 'Culto na praça', 'Culto', '2026-04-21T22:30:00.000Z', '2026-04-22T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('c45984de-f0b9-4c0c-899f-036ae7e1019c'::uuid, 'Culto de Louvor', 'Culto', '2026-04-23T22:30:00.000Z', '2026-04-24T00:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Ir. Edjane', '', '', 'scheduled'),
    ('824a1a41-ad59-4126-ac5a-478cd5b24914'::uuid, 'Culto Solene', 'Culto', '2026-04-26T20:00:00.000Z', '2026-04-26T22:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Diac. Simone Oliveira', 'Apocalipse 1', '', 'scheduled'),
    ('ae88d427-6956-4107-b6f9-f54f2ee57c97'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-04-26T12:30:00.000Z', '2026-04-26T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('d6bea712-f921-4754-8495-2895f79a037d'::uuid, 'Culto de Oração', 'Culto', '2026-04-28T22:30:00.000Z', '2026-04-29T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('11a8944f-60d3-4478-9a86-9e50ac7d6c38'::uuid, 'Culto de Louvor', 'Culto', '2026-04-30T22:30:00.000Z', '2026-05-01T00:00:00.000Z', 'Templo principal', '', 'Ir. Ana Claudia', 'ADOLESCENTES', '', '', 'scheduled'),
    ('538dfa16-460a-4ae9-b0a6-321bfc259fdc'::uuid, 'Culto Solene', 'Culto', '2026-05-03T20:00:00.000Z', '2026-05-03T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Adeildo Natalício', 'Apocalipse 2', 'MÊS DE MISSÕES', 'scheduled'),
    ('22137808-5d7e-4134-a477-2960b0f6b827'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-05-03T12:30:00.000Z', '2026-05-03T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('25e060a4-2d17-4685-8b70-39be94123471'::uuid, 'Encontro de Mulheres', 'Mulheres', '2026-05-05T22:30:00.000Z', '2026-05-06T00:00:00.000Z', 'Templo principal', '', '', 'Sem. Ruth Alves', '', '', 'scheduled'),
    ('8721485a-8ddd-48b0-8ff3-6aa8cd0ecf6a'::uuid, 'Culto de Louvor', 'Culto', '2026-05-07T22:30:00.000Z', '2026-05-08T00:00:00.000Z', 'Templo principal', '', 'Diac. Adeildo Natalício', 'Ir. Fabiana', '', '', 'scheduled'),
    ('53718f62-dd8b-4ef8-90bf-ca7e5fe76a88'::uuid, 'Culto Solene', 'Culto', '2026-05-10T20:00:00.000Z', '2026-05-10T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Ana Amélia', 'Apocalipse 3', 'MÊS DE MISSÕES (Dia das mães)', 'scheduled'),
    ('cd6b5fa3-ceac-4b17-8a6d-18a87421bd17'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-05-10T12:30:00.000Z', '2026-05-10T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('3f3d6465-6109-40e3-9f19-e9693fce1cc9'::uuid, 'Livre', 'Geral', '2026-05-12T22:30:00.000Z', '2026-05-13T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('44a394b7-fbc7-4d85-b51b-63853b8a6df2'::uuid, 'Culto de Louvor', 'Culto', '2026-05-14T22:30:00.000Z', '2026-05-15T00:00:00.000Z', 'Templo principal', '', 'Diac. Aparecido Regino', 'Semin. Gediael Kallebe', '', '', 'scheduled'),
    ('b21fbcf3-eb6c-44ff-84a1-b6854c44e0cd'::uuid, 'Culto Solene', 'Culto', '2026-05-17T20:00:00.000Z', '2026-05-17T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Ana Dupont', 'Apocalipse 4', 'MÊS DE MISSÕES', 'scheduled'),
    ('51ad34b8-dccb-4628-941c-946375c1c501'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-05-17T12:30:00.000Z', '2026-05-17T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('6c036101-272c-4b28-bec0-c8d316a57867'::uuid, 'Culto na praça', 'Culto', '2026-05-19T22:30:00.000Z', '2026-05-20T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('1c21d2b4-b60d-46a7-a2d3-d8c234911bf1'::uuid, 'Culto de Louvor', 'Culto', '2026-05-21T22:30:00.000Z', '2026-05-22T00:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Graça Lira', '', '', 'scheduled'),
    ('d761ebf7-5e2c-49ea-9c2d-b3c03bb06a73'::uuid, 'Culto Solene', 'Culto', '2026-05-24T20:00:00.000Z', '2026-05-24T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Aparecido Regino', 'Apocalipse 5', 'MÊS DE MISSÕES', 'scheduled'),
    ('1db554d6-110e-4521-9158-65eb607c0e3c'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-05-24T12:30:00.000Z', '2026-05-24T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('c68fb5ca-888c-4f07-946c-d43dafeb1df5'::uuid, 'Livre', 'Geral', '2026-05-26T22:30:00.000Z', '2026-05-27T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('da180909-557e-4984-bc76-f044dedbb3ed'::uuid, 'Culto de Louvor', 'Culto', '2026-05-28T22:30:00.000Z', '2026-05-29T00:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'VARÕES', '', '', 'scheduled'),
    ('127ffadd-aed8-4890-8b90-60a09a230c02'::uuid, 'Culto Solene', 'Culto', '2026-05-31T20:00:00.000Z', '2026-05-31T22:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Gilmar Fonseca', 'Apocalipse 6', 'MÊS DE MISSÕES', 'scheduled'),
    ('e4d8badb-333d-4a5d-9786-5dac7a3f4851'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-05-31T12:30:00.000Z', '2026-05-31T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('838005be-dcf5-4fcf-a75c-5814048cb8e8'::uuid, 'Encontro de Mulheres', 'Mulheres', '2026-06-02T22:30:00.000Z', '2026-06-03T00:00:00.000Z', 'Templo principal', '', '', 'Sem. Ruth Alves', '', '', 'scheduled'),
    ('34362e7e-5d89-4a9d-abff-ec1454886190'::uuid, 'Culto de Louvor', 'Culto', '2026-06-04T22:30:00.000Z', '2026-06-05T00:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Salete de Kássia', '', '', 'scheduled'),
    ('4b3915c9-3de5-41dd-9592-8f605f97ce5d'::uuid, 'Culto Solene', 'Culto', '2026-06-07T20:00:00.000Z', '2026-06-07T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Graça Lira', 'Apocalipse 7', '', 'scheduled'),
    ('6a7c88ae-cc8f-4584-9c38-e16356f06325'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-06-07T12:30:00.000Z', '2026-06-07T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('32c55f33-31e3-4aef-9038-a893beb9b724'::uuid, 'Livre', 'Geral', '2026-06-09T22:30:00.000Z', '2026-06-10T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('0981fce4-5b77-40cf-9555-475d3d11bd38'::uuid, 'Culto de Louvor', 'Culto', '2026-06-11T22:30:00.000Z', '2026-06-12T00:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Ir. Ana Amélia', '', '', 'scheduled'),
    ('3ee15c80-725f-417a-971d-9fc19d51769d'::uuid, 'Culto Solene', 'Culto', '2026-06-14T20:00:00.000Z', '2026-06-14T22:00:00.000Z', 'Templo principal', '', 'Convidado', 'Pr. Augusto Lopes', 'Apocalipse 8', '', 'scheduled'),
    ('3586482c-bedb-4b63-a05b-f0a78fad91c6'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-06-14T12:30:00.000Z', '2026-06-14T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('89458630-d469-4fcf-8613-982553c75697'::uuid, 'Culto na praça', 'Culto', '2026-06-16T22:30:00.000Z', '2026-06-17T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('417511c8-4b75-4ced-bd8e-42959e55decc'::uuid, 'Culto de Louvor', 'Culto', '2026-06-18T22:30:00.000Z', '2026-06-19T00:00:00.000Z', 'Templo principal', '', 'Ir. Ana Claudia', 'Ir. Lisiane Flavia Lopes', '', '', 'scheduled'),
    ('52a35d26-0a78-4019-8911-aa2a0f701347'::uuid, 'Culto Solene', 'Culto', '2026-06-21T20:00:00.000Z', '2026-06-21T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Juliana Goberto', 'Apocalipse 9', '', 'scheduled'),
    ('59bfb205-a12a-4eb7-9baa-2f6758d6a9a1'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-06-21T12:30:00.000Z', '2026-06-21T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('92713dce-8e38-44bc-b2c2-c3c62b3cb4da'::uuid, 'Livre', 'Geral', '2026-06-23T22:30:00.000Z', '2026-06-24T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('2da86afb-fbc6-4c79-b3ff-ba5aa78d94b5'::uuid, 'Culto de Louvor', 'Culto', '2026-06-25T22:30:00.000Z', '2026-06-26T00:00:00.000Z', 'Templo principal', '', 'Diac. Adeildo Natalício', 'UFBB', '', '', 'scheduled'),
    ('bdf14e60-d735-41c6-9110-df272cd1be57'::uuid, 'Culto Solene', 'Culto', '2026-06-28T20:00:00.000Z', '2026-06-28T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Salete de Kássia', 'Apocalipse 10', '', 'scheduled'),
    ('7fa624f4-f6db-47f9-9ef5-6b52805f34e8'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-06-28T12:30:00.000Z', '2026-06-28T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('175f440c-7885-41c0-9623-79391472b257'::uuid, 'Culto na praça', 'Culto', '2026-06-30T22:30:00.000Z', '2026-07-01T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('ea470efd-34ca-4062-9f92-94305b6ce5a6'::uuid, 'Culto de Louvor', 'Culto', '2026-07-02T22:30:00.000Z', '2026-07-03T00:00:00.000Z', 'Templo principal', '', 'Diac. Aparecido Regino', 'Diac. Luciano', '', '', 'scheduled'),
    ('59dc1ef7-9a5c-4998-a98c-285c4005ff4e'::uuid, 'Culto Solene', 'Culto', '2026-07-05T20:00:00.000Z', '2026-07-05T22:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Ir. Lisiane Flavia Lopes', 'Apocalipse 11', '', 'scheduled'),
    ('39578a03-a1e6-4d1d-8a57-d66da3caab61'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-07-05T12:30:00.000Z', '2026-07-05T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('c84b4f83-0c9c-44a0-941a-13b81ae51c1d'::uuid, 'Encontro de Mulheres', 'Mulheres', '2026-07-07T22:30:00.000Z', '2026-07-08T00:00:00.000Z', 'Templo principal', '', '', 'Sem. Ruth Alves', '', '', 'scheduled'),
    ('4027d3d0-a9ac-44ea-b52a-fa0720d04bba'::uuid, 'Culto de Louvor', 'Culto', '2026-07-09T22:30:00.000Z', '2026-07-10T00:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Juliana Goberto', '', '', 'scheduled'),
    ('3f1778c2-6ef5-4cd6-9efa-3f2f6804f0b5'::uuid, 'Culto Solene', 'Culto', '2026-07-12T20:00:00.000Z', '2026-07-12T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Simone Oliveira', 'Apocalipse 12', '', 'scheduled'),
    ('4304f15a-8979-4919-976e-67f0a8f8fbba'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-07-12T12:30:00.000Z', '2026-07-12T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('4a6e2386-a448-4a47-b0e2-b794fc017737'::uuid, 'Culto na praça', 'Culto', '2026-07-14T22:30:00.000Z', '2026-07-15T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('d8ae478f-702b-4f39-9e75-e4e0c9c27a18'::uuid, 'Culto de Louvor', 'Culto', '2026-07-16T22:30:00.000Z', '2026-07-17T00:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Gilmar Fonseca', '', '', 'scheduled'),
    ('51ebb801-ed64-4212-b553-844f487a772e'::uuid, 'Culto Solene', 'Culto', '2026-07-19T20:00:00.000Z', '2026-07-19T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Adeildo Natalício', 'Apocalipse 13', '', 'scheduled'),
    ('05d35f1d-31c7-415c-bf03-1f9bbc27091a'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-07-19T12:30:00.000Z', '2026-07-19T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('d7377c8f-f96b-4d9e-baed-36c0d4efd7d0'::uuid, 'Livre', 'Geral', '2026-07-21T22:30:00.000Z', '2026-07-22T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('cb9b58bd-f6d5-4e96-b86b-44348ee5d806'::uuid, 'Culto de Louvor', 'Culto', '2026-07-23T22:30:00.000Z', '2026-07-24T00:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Simone Oliveira', '', '', 'scheduled'),
    ('a93f70ab-4654-42bf-b442-a00cd2fbd1e6'::uuid, 'Culto Solene', 'Culto', '2026-07-26T20:00:00.000Z', '2026-07-26T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Ana Amélia', 'Apocalipse 14', '', 'scheduled'),
    ('1b5ca4e5-5894-49de-99a3-b2ae47d84af8'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-07-26T12:30:00.000Z', '2026-07-26T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('f306dd8d-0a2e-4d4e-ad58-d2adcb271b19'::uuid, 'Culto na praça', 'Culto', '2026-07-28T22:30:00.000Z', '2026-07-29T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('c7b79ea8-008c-4388-9c59-624c3b97019e'::uuid, 'Culto de Louvor', 'Culto', '2026-07-30T22:30:00.000Z', '2026-07-31T00:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'GRUPO DE LOUVOR', '', '', 'scheduled'),
    ('7217851f-78e5-4eb6-b0eb-d7441c217a16'::uuid, 'Culto Solene', 'Culto', '2026-08-02T20:00:00.000Z', '2026-08-02T22:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Ana Dupont', 'Apocalipse 15', 'MÊS DA FAMÍLIA', 'scheduled'),
    ('62735bc2-6d5f-487f-8668-a9c08c664602'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-08-02T12:30:00.000Z', '2026-08-02T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('80e133e6-f1c8-4bbf-a3e6-8bce6f97f106'::uuid, 'Encontro de Mulheres', 'Mulheres', '2026-08-04T22:30:00.000Z', '2026-08-05T00:00:00.000Z', 'Templo principal', '', '', 'Sem. Ruth Alves', '', '', 'scheduled'),
    ('f5ad729a-1254-460d-9129-b5abfeae7893'::uuid, 'Culto de Louvor', 'Culto', '2026-08-06T22:30:00.000Z', '2026-08-07T00:00:00.000Z', 'Templo principal', '', 'Ir. Ana Claudia', 'Ir. Naim', '', '', 'scheduled'),
    ('e35e373e-39e2-470f-9af2-c04133d14fbe'::uuid, 'Culto Solene', 'Culto', '2026-08-09T20:00:00.000Z', '2026-08-09T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Aparecido Regino', 'Apocalipse 16', 'MÊS DA FAMÍLIA (dia dos pais)', 'scheduled'),
    ('a80b9c62-a3ae-4215-9cc9-6689ca44b7bd'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-08-09T12:30:00.000Z', '2026-08-09T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('3de5f3f5-c1f3-490f-acfb-95051ffb2455'::uuid, 'Culto na praça', 'Culto', '2026-08-11T22:30:00.000Z', '2026-08-12T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('2120bc79-eca2-40ec-8882-2ddcad9ab97b'::uuid, 'Culto de Louvor', 'Culto', '2026-08-13T22:30:00.000Z', '2026-08-14T00:00:00.000Z', 'Templo principal', '', 'Diac. Adeildo Natalício', 'Ir. Dilma Martins', '', '', 'scheduled'),
    ('8bf362c7-1f13-42f5-940b-88adb3460441'::uuid, 'Culto Solene', 'Culto', '2026-08-16T20:00:00.000Z', '2026-08-16T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Gilmar Fonseca', 'Apocalipse 17', 'MÊS DA FAMÍLIA', 'scheduled'),
    ('64753bd6-e17f-4a0d-a9bf-acf321f339a5'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-08-16T12:30:00.000Z', '2026-08-16T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('a1162b11-fd1e-493d-bac1-ad1ba538d9ac'::uuid, 'Livre', 'Geral', '2026-08-18T22:30:00.000Z', '2026-08-19T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('9361479a-4777-4e51-93db-067398cfa8d7'::uuid, 'Culto de Louvor', 'Culto', '2026-08-20T22:30:00.000Z', '2026-08-21T00:00:00.000Z', 'Templo principal', '', 'Diac. Aparecido Regino', 'Semin. Ruth Alves', '', '', 'scheduled'),
    ('aa466af6-02e1-4ea6-87f3-3f7e882f14fe'::uuid, 'Culto Solene', 'Culto', '2026-08-23T20:00:00.000Z', '2026-08-23T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Graça Lira', 'Apocalipse 18', 'MÊS DA FAMÍLIA', 'scheduled'),
    ('dd6b29cb-e529-4e38-b203-35407abdf419'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-08-23T12:30:00.000Z', '2026-08-23T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('b8ea90fe-e72c-4abb-b44f-54c1dda83300'::uuid, 'Culto na praça', 'Culto', '2026-08-25T22:30:00.000Z', '2026-08-26T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('3a7399b6-08aa-42d1-9929-514b14d34688'::uuid, 'Culto de Louvor', 'Culto', '2026-08-27T22:30:00.000Z', '2026-08-28T00:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Edjane', '', '', 'scheduled'),
    ('ae68a769-344c-4aa3-b02f-39b102ea9735'::uuid, 'Culto Solene', 'Culto', '2026-08-30T20:00:00.000Z', '2026-08-30T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Juliana Goberto', 'Apocalipse 19', 'MÊS DA FAMÍLIA', 'scheduled'),
    ('607e93ef-6a20-4fa2-8b6c-1f6dd3b92104'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-08-30T12:30:00.000Z', '2026-08-30T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('b87486bb-5eb5-4a5a-a966-c362c6f7d552'::uuid, 'Encontro de Mulheres', 'Mulheres', '2026-09-01T22:30:00.000Z', '2026-09-02T00:00:00.000Z', 'Templo principal', '', '', 'Sem. Ruth Alves', '', '', 'scheduled'),
    ('7b8a7d90-73df-41da-8e8c-1f2378ef23b3'::uuid, 'Culto de Louvor', 'Culto', '2026-09-03T22:30:00.000Z', '2026-09-04T00:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'ADOLESCENTES', '', '', 'scheduled'),
    ('ddd77fee-938b-458b-8708-2a06d0284d76'::uuid, 'Culto Solene', 'Culto', '2026-09-06T20:00:00.000Z', '2026-09-06T22:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Diac. Salete de Kássia', 'Apocalipse 20', '', 'scheduled'),
    ('606a37cb-6360-48ae-81fd-e4fbcd9c6594'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-09-06T12:30:00.000Z', '2026-09-06T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('1dc9df6d-269a-49dc-a1ac-2aabd9de8996'::uuid, 'Culto na praça', 'Culto', '2026-09-08T22:30:00.000Z', '2026-09-09T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('a71be06a-83d4-44b1-993a-97375d53bab3'::uuid, 'Culto de Louvor', 'Culto', '2026-09-10T22:30:00.000Z', '2026-09-11T00:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Fabiana', '', '', 'scheduled'),
    ('e83f4a49-1fa9-4e4f-b957-d6e48d496fc1'::uuid, 'Culto Solene', 'Culto', '2026-09-13T20:00:00.000Z', '2026-09-13T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Lisiane Flavia Lopes', 'Apocalipse 21', '', 'scheduled'),
    ('8a6586c7-58b7-4fda-b9b6-e12997ca3dd6'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-09-13T12:30:00.000Z', '2026-09-13T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('c4a3e44a-3b10-4ab0-9bd8-09a275ab05b1'::uuid, 'Livre', 'Geral', '2026-09-15T22:30:00.000Z', '2026-09-16T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('f9243e2f-fbef-4aa7-9914-b58d4ac0a28a'::uuid, 'Culto de Louvor', 'Culto', '2026-09-17T22:30:00.000Z', '2026-09-18T00:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Semin. Gediael Kallebe', '', '', 'scheduled'),
    ('457cd919-94d8-41d6-b281-fe52bf9be7a3'::uuid, 'Culto Solene', 'Culto', '2026-09-20T20:00:00.000Z', '2026-09-20T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Simone Oliveira', 'Apocalipse 22', '', 'scheduled'),
    ('f3e0690a-30ce-4fdd-aae4-2ff01afe87a5'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-09-20T12:30:00.000Z', '2026-09-20T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('f849a92d-e679-4f1f-b6af-6791cf818bcc'::uuid, 'Culto na praça', 'Culto', '2026-09-22T22:30:00.000Z', '2026-09-23T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('aa3b5688-cee8-4f54-a3ed-1b0619a7f059'::uuid, 'Culto de Louvor', 'Culto', '2026-09-24T22:30:00.000Z', '2026-09-25T00:00:00.000Z', 'Templo principal', '', 'Ir. Ana Claudia', 'Diac. Graça Lira', '', '', 'scheduled'),
    ('ceca69c9-d6fc-46ab-9746-24a2747f9192'::uuid, 'Culto Solene', 'Culto', '2026-09-27T20:00:00.000Z', '2026-09-27T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Adeildo Natalício', '2 Coríntios 1', '', 'scheduled'),
    ('313deb0a-a40e-4783-b973-ffbdbe4ee83f'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-09-27T12:30:00.000Z', '2026-09-27T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('c699dc3d-4b72-4814-a5c3-0d46e9757bc8'::uuid, 'Livre', 'Geral', '2026-09-29T22:30:00.000Z', '2026-09-30T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('874a37ff-9fda-4f18-a283-c4eec0d9b3d4'::uuid, 'Culto de Louvor', 'Culto', '2026-10-01T22:30:00.000Z', '2026-10-02T00:00:00.000Z', 'Templo principal', '', 'Diac. Adeildo Natalício', 'VARÕES', '', '', 'scheduled'),
    ('f4e4b933-948e-4ec9-9fd0-00831610e511'::uuid, 'Culto Solene', 'Culto', '2026-10-04T20:00:00.000Z', '2026-10-04T22:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Ana Amélia', '2 Coríntios 2', 'MÊS DE MISSÕES', 'scheduled'),
    ('9a9c2c51-f8cd-45d8-b974-b541485b933d'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-10-04T12:30:00.000Z', '2026-10-04T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('409fe0a2-a167-4624-802e-a583d98cdc73'::uuid, 'Encontro de Mulheres', 'Mulheres', '2026-10-06T22:30:00.000Z', '2026-10-07T00:00:00.000Z', 'Templo principal', '', '', 'Sem. Ruth Alves', '', '', 'scheduled'),
    ('2f1841de-e4e9-4209-a9f4-689abe797db6'::uuid, 'Culto de Louvor', 'Culto', '2026-10-08T22:30:00.000Z', '2026-10-09T00:00:00.000Z', 'Templo principal', '', 'Diac. Aparecido Regino', 'Diac. Salete de Kássia', '', '', 'scheduled'),
    ('d3342c6d-64e3-4f2d-b89f-6d95f7df30fb'::uuid, 'Culto Solene', 'Culto', '2026-10-11T20:00:00.000Z', '2026-10-11T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Ana Dupont', '2 Coríntios 3', 'MÊS DE MISSÕES', 'scheduled'),
    ('17f5c96e-d07f-4bd0-9090-f18f1dc944e5'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-10-11T12:30:00.000Z', '2026-10-11T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('0ba6db9b-40df-403d-b274-b2c87f2a0c3c'::uuid, 'Livre', 'Geral', '2026-10-13T22:30:00.000Z', '2026-10-14T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('e5702a20-badd-4cf9-b43e-e05e708c201c'::uuid, 'Culto de Louvor', 'Culto', '2026-10-15T22:30:00.000Z', '2026-10-16T00:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Ana Amélia', '', '', 'scheduled'),
    ('8140d0ad-181f-4065-9446-590562b45c6f'::uuid, 'Culto Solene', 'Culto', '2026-10-18T20:00:00.000Z', '2026-10-18T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Aparecido Regino', '2 Coríntios 4', 'MÊS DE MISSÕES', 'scheduled'),
    ('bf77ec45-2ae1-4e19-adff-5f7209e88d6f'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-10-18T12:30:00.000Z', '2026-10-18T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('f7feb116-8a00-4748-9cc1-ae459ba61e24'::uuid, 'Culto na praça', 'Culto', '2026-10-20T22:30:00.000Z', '2026-10-21T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('1c536cbd-e51f-42de-a871-a9bc013bd12e'::uuid, 'Culto de Louvor', 'Culto', '2026-10-22T22:30:00.000Z', '2026-10-23T00:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Lisiane Flavia Lopes', '', '', 'scheduled'),
    ('465625a5-993d-4e86-bf0f-03ab34b61194'::uuid, 'Culto Solene', 'Culto', '2026-10-25T20:00:00.000Z', '2026-10-25T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Gilmar Fonseca', '2 Coríntios 5', 'MÊS DE MISSÕES', 'scheduled'),
    ('9afb1512-9b6f-46b7-997b-7a16a5651b5a'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-10-25T12:30:00.000Z', '2026-10-25T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('1313c13c-3879-4c57-aaee-35ee695d28f1'::uuid, 'Livre', 'Geral', '2026-10-27T22:30:00.000Z', '2026-10-28T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('08aea36e-dd9c-479a-aa51-f835d78ff081'::uuid, 'Culto de Louvor', 'Culto', '2026-10-29T22:30:00.000Z', '2026-10-30T00:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'UFBB', '', '', 'scheduled'),
    ('a795add0-f448-4e14-98c4-ad3db2283c86'::uuid, 'Culto Solene', 'Culto', '2026-11-01T20:00:00.000Z', '2026-11-01T22:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Diac. Graça Lira', '2 Coríntios 6', '', 'scheduled'),
    ('4f37cd9b-031e-487c-993f-88773409fe4d'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-11-01T12:30:00.000Z', '2026-11-01T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('7977d505-8712-4479-ae11-26226c618006'::uuid, 'Culto na praça', 'Culto', '2026-11-03T22:30:00.000Z', '2026-11-04T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('4dd2d277-c662-4591-81c9-1f834c1f5d07'::uuid, 'Culto de Louvor', 'Culto', '2026-11-05T22:30:00.000Z', '2026-11-06T00:00:00.000Z', 'Templo principal', '', 'Semin. Ruth Alves', 'Diac. Luciano', '', '', 'scheduled'),
    ('51e6293c-bbf6-463e-bee5-e5544369e561'::uuid, 'Culto Solene', 'Culto', '2026-11-08T20:00:00.000Z', '2026-11-08T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Diac. Juliana Goberto', '2 Coríntios 7', '', 'scheduled'),
    ('7423e57e-df7d-4cf5-93f8-5f5a9b9015f0'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-11-08T12:30:00.000Z', '2026-11-08T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('dbf4376e-d4fe-4b73-836e-014177e5aa31'::uuid, 'Livre', 'Geral', '2026-11-10T22:30:00.000Z', '2026-11-11T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('45d81398-d7c2-43f4-9eb0-b0a8002cbdfc'::uuid, 'Culto de Louvor', 'Culto', '2026-11-12T22:30:00.000Z', '2026-11-13T00:00:00.000Z', 'Templo principal', '', 'Ir. Ana Claudia', 'Diac. Juliana Goberto', '', '', 'scheduled'),
    ('3dc18f5f-1981-4c2c-ba03-d3cae2362108'::uuid, 'Culto Solene', 'Culto', '2026-11-15T20:00:00.000Z', '2026-11-15T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Salete de Kássia', '2 Coríntios 8', '', 'scheduled'),
    ('a7094fae-2c38-4bbe-8ae5-fbc96344af9b'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-11-15T12:30:00.000Z', '2026-11-15T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('0d55e2a3-1c1f-43a7-92cc-3a74eae78c06'::uuid, 'Culto na praça', 'Culto', '2026-11-17T22:30:00.000Z', '2026-11-18T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('63eaea59-dc5a-47fa-a4e5-fbc434f71905'::uuid, 'Culto de Louvor', 'Culto', '2026-11-19T22:30:00.000Z', '2026-11-20T00:00:00.000Z', 'Templo principal', '', 'Diac. Adeildo Natalício', 'Ir. Gilmar Fonseca', '', '', 'scheduled'),
    ('89fffd66-0020-490c-b85d-0457afe7be4d'::uuid, 'Culto Solene', 'Culto', '2026-11-22T20:00:00.000Z', '2026-11-22T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Lisiane Flavia Lopes', '2 Coríntios 9', '', 'scheduled'),
    ('03acc603-db58-46ab-81bd-723b5f672d5c'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-11-22T12:30:00.000Z', '2026-11-22T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('30ef3899-69cf-4705-aa7d-bbf2932c9359'::uuid, 'Livre', 'Geral', '2026-11-24T22:30:00.000Z', '2026-11-25T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('99b7acba-3d07-4edd-a43f-4f5a3b927395'::uuid, 'Culto de Louvor', 'Culto', '2026-11-26T22:30:00.000Z', '2026-11-27T00:00:00.000Z', 'Templo principal', '', 'Diac. Aparecido Regino', 'Diac. Simone Oliveira', '', '', 'scheduled'),
    ('b8895cdf-a168-4492-a9d9-b2a64571fa0f'::uuid, 'Culto Solene', 'Culto', '2026-11-29T20:00:00.000Z', '2026-11-29T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Diac. Simone Oliveira', '2 Coríntios 10', '', 'scheduled'),
    ('9a0df09e-f601-490e-908b-b12c9232cd72'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-11-29T12:30:00.000Z', '2026-11-29T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('4669e861-8990-4095-8b90-f0e0c5fe3639'::uuid, 'Culto na praça', 'Culto', '2026-12-01T22:30:00.000Z', '2026-12-02T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('e85a3e45-11ea-4104-9baa-ca327233132c'::uuid, 'Culto de Louvor', 'Culto', '2026-12-03T22:30:00.000Z', '2026-12-04T00:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'GRUPO DE LOUVOR', '', '', 'scheduled'),
    ('5c4f7f30-4cf1-41e7-8bc1-64e5ff9d6f40'::uuid, 'Culto Solene', 'Culto', '2026-12-06T20:00:00.000Z', '2026-12-06T22:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Diac. Adeildo Natalício', '2 Coríntios 11', '', 'scheduled'),
    ('4b9c0114-cb75-4314-b4f0-bc48aaa76846'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-12-06T12:30:00.000Z', '2026-12-06T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('0f6bbb09-60d1-4c16-979d-4cd3add577d2'::uuid, 'Livre', 'Geral', '2026-12-08T22:30:00.000Z', '2026-12-09T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('f1416671-bcfb-4bca-aea8-fc9221e015b6'::uuid, 'Culto de Louvor', 'Culto', '2026-12-10T22:30:00.000Z', '2026-12-11T00:00:00.000Z', 'Templo principal', '', 'Semin. Gediael Kallebe', 'Ir. Naim', '', '', 'scheduled'),
    ('dbebae07-6196-47fa-9626-d2589c38f2e4'::uuid, 'Culto Solene', 'Culto', '2026-12-13T20:00:00.000Z', '2026-12-13T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Ana Amélia', '2 Coríntios 12', '', 'scheduled'),
    ('ce60ffc8-4224-45a3-9ab1-dddaa1b81c75'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-12-13T12:30:00.000Z', '2026-12-13T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('06782ced-93df-4e47-afe0-ee4a36bc306e'::uuid, 'Culto na praça', 'Culto', '2026-12-15T22:30:00.000Z', '2026-12-16T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('094eb326-02d6-4e28-ae68-add2885e8aff'::uuid, 'Culto de Louvor', 'Culto', '2026-12-17T22:30:00.000Z', '2026-12-18T00:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Dilma Martins', '', '', 'scheduled'),
    ('811ef0e8-cb92-4eea-8d14-5b2c9fa5e36a'::uuid, 'Culto Solene', 'Culto', '2026-12-20T20:00:00.000Z', '2026-12-20T22:00:00.000Z', 'Templo principal', '', 'Pb. George Alves', 'Ir. Ana Dupont', '2 Coríntios 13', 'CULTO DE NATAL', 'scheduled'),
    ('035bb897-99db-43df-abee-171325efd676'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-12-20T12:30:00.000Z', '2026-12-20T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('7e101c2d-7a65-401d-b362-3a4dbf830b3a'::uuid, 'Livre', 'Geral', '2026-12-22T22:30:00.000Z', '2026-12-23T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('1186fbf4-f211-4c8f-9e7e-afeb6a77892e'::uuid, 'Culto de Louvor', 'Culto', '2026-12-24T22:30:00.000Z', '2026-12-25T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('c24aeb3a-4860-45b4-97ef-6af091de0d16'::uuid, 'Culto Solene', 'Culto', '2026-12-27T20:00:00.000Z', '2026-12-27T22:00:00.000Z', 'Templo principal', '', 'Pr. Augusto Lopes', 'Ir. Lisiane Flavia Lopes', '', '', 'scheduled'),
    ('c4db7cb0-539f-43f2-a029-91a708226463'::uuid, 'Escola Bíblica', 'Escola Biblica', '2026-12-27T12:30:00.000Z', '2026-12-27T14:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', '', 'scheduled'),
    ('0e7d2e3b-8918-4f55-b656-1f6b4cf45bab'::uuid, 'Livre', 'Geral', '2026-12-29T22:30:00.000Z', '2026-12-30T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'free'),
    ('35c3a5b9-e496-435c-b328-6dc039dfd509'::uuid, 'Culto de Louvor', 'Culto', '2026-12-31T22:30:00.000Z', '2027-01-01T00:00:00.000Z', 'Templo principal', '', '', '', '', '', 'scheduled'),
    ('119185b4-4a3c-48df-b04b-be0366bd0a23'::uuid, 'Escola Bíblica de Férias', 'Escola Biblica', '2026-07-25T18:00:00.000Z', '2026-07-25T21:00:00.000Z', 'Templo principal', '', '', 'DEPARTAMENTO INFANTIL', '', 'EBF', 'scheduled'),
    ('8bb3c622-ef0b-46fa-8bea-534337eda6c9'::uuid, 'Culto dos VARÕES', 'Culto', '2026-08-15T22:30:00.000Z', '2026-08-16T00:00:00.000Z', 'Templo principal', '', '', 'Diac. Adeildo Natalício', '', 'CULTO DOS VARÕES', 'scheduled'),
    ('59d28c64-496e-4099-94f5-e3dd9c5365a4'::uuid, 'Culto da FAMÍLIA', 'Culto', '2026-08-29T22:30:00.000Z', '2026-08-30T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', 'CULTO DA FAMÍLIA', 'scheduled'),
    ('1b2ef60f-e5ce-442c-a59b-f0c1a9b95176'::uuid, 'CULTO UFBB', 'Culto', '2026-10-17T22:30:00.000Z', '2026-10-18T00:00:00.000Z', 'Templo principal', '', '', 'UFBB', '', 'CULTO PARA MULHERES', 'scheduled'),
    ('5d58c74b-f491-438d-8be5-28b4a34ee492'::uuid, 'Culto dos VARÕES', 'Culto', '2026-11-07T22:30:00.000Z', '2026-11-08T00:00:00.000Z', 'Templo principal', '', '', 'Diac. Adeildo Natalício', '', 'CULTO DOS VARÕES', 'scheduled'),
    ('ad26241d-7f99-43c5-9a63-728dcf28d36f'::uuid, 'CULTO DE NATAL', 'Culto', '2026-12-20T22:00:00.000Z', '2026-12-21T00:00:00.000Z', 'Templo principal', '', '', 'Pr. Augusto Lopes', '', 'CULTO E CEIA DE NATAL', 'scheduled'),
    ('7dd5a2fe-5593-455d-b0bc-445d02bfaebc'::uuid, 'CULTO ESPECIAL DE AGRADECIMENTO', 'Culto', '2026-12-27T20:00:00.000Z', '2026-12-27T22:00:00.000Z', 'Templo principal', '', '', '', '', 'CULTO ESPECIAL DE AGRADECIMENTO', 'scheduled')
)
insert into public.schedule_items as si
  (id, title, ministry_id, starts_at, ends_at, location, summary,
   preacher, director, passage, occasion_label, status, featured)
select
  ss.id,
  ss.title,
  public.upsert_ministry_id(ss.ministry_name),
  ss.starts_at,
  ss.ends_at,
  ss.location,
  ss.summary,
  ss.preacher,
  ss.director,
  ss.passage,
  ss.occasion_label,
  ss.status,
  false
from schedule_seed ss
on conflict (id) do update set
  title = excluded.title,
  ministry_id = excluded.ministry_id,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  location = excluded.location,
  summary = excluded.summary,
  preacher = excluded.preacher,
  director = excluded.director,
  passage = excluded.passage,
  occasion_label = excluded.occasion_label,
  status = excluded.status
where si.title is distinct from excluded.title
   or si.ministry_id is distinct from excluded.ministry_id
   or si.starts_at is distinct from excluded.starts_at
   or si.ends_at is distinct from excluded.ends_at
   or si.location is distinct from excluded.location
   or si.summary is distinct from excluded.summary
   or si.preacher is distinct from excluded.preacher
   or si.director is distinct from excluded.director
   or si.passage is distinct from excluded.passage
   or si.occasion_label is distinct from excluded.occasion_label
   or si.status is distinct from excluded.status;
-- END SEED --------------------------------------------------------------------


commit;

