-- =============================================================================
-- 4IBIB Supabase canonical schema
-- =============================================================================
-- Sections:
--   1. Extensions
--   2. Tables (final shape)
--   3. Functions
--   4. Legacy migrations (idempotent; no-op on fresh installs)
--   5. Indexes
--   6. Views
--   7. Triggers
--   8. Row Level Security and policies
--   9. Bootstrap data
-- =============================================================================


-- =============================================================================
-- 1. Extensions
-- =============================================================================

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;


-- =============================================================================
-- 2. Tables (final shape)
-- =============================================================================

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.church_profile (
  id text primary key default 'main',
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

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public' and table_name = 'church_profile' and constraint_name = 'church_profile_singleton_id'
  ) then
    alter table public.church_profile
      add constraint church_profile_singleton_id check (id = 'main');
  end if;
end $$;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  category text not null check (category in ('geral', 'evento', 'juventude', 'oracao')),
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
  google_event_id text,
  status text not null default 'scheduled',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_time_order check (ends_at > starts_at),
  constraint schedule_status_valid check (status in ('scheduled', 'suspended', 'free'))
);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  message text not null,
  status text not null default 'novo' check (status in ('novo', 'em_oracao', 'concluido')),
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
-- 3. Functions
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

create or replace function public.parse_meeting_time(value text, occurrence integer, fallback_value time)
returns time
language plpgsql
stable
as $$
declare
  match text[];
begin
  select matched
  into match
  from (
    select regexp_matches(coalesce(value, ''), '([0-9]{1,2})(?::|h)?([0-9]{2})?', 'gi') as matched
  ) as matches
  offset greatest(occurrence - 1, 0)
  limit 1;

  if match is null then
    return fallback_value;
  end if;

  return make_time(
    least(match[1]::integer, 23),
    least(coalesce(nullif(match[2], ''), '0')::integer, 59),
    0
  );
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
-- 4. Legacy migrations (idempotent; no-op on fresh installs)
-- =============================================================================
-- This whole block exists so that databases provisioned before the canonical
-- shape above can be upgraded in place. On a brand new database, every
-- statement here either matches reality or is gated behind an existence check.

-- 4.1 Old column renames -------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedule_items' and column_name = 'leader'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedule_items' and column_name = 'preacher'
  ) then
    alter table public.schedule_items rename column leader to preacher;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedule_items' and column_name = 'special_date'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedule_items' and column_name = 'occasion_label'
  ) then
    alter table public.schedule_items rename column special_date to occasion_label;
  end if;
end $$;

-- 4.2 Add columns that legacy databases were missing --------------------------
alter table public.ministries add column if not exists slug text;
alter table public.schedule_items add column if not exists preacher text not null default '';
alter table public.schedule_items add column if not exists director text not null default '';
alter table public.schedule_items add column if not exists passage text not null default '';
alter table public.schedule_items add column if not exists occasion_label text not null default '';
alter table public.schedule_items add column if not exists google_event_id text;
alter table public.schedule_items add column if not exists status text not null default 'scheduled';
alter table public.schedule_items add column if not exists ministry_id uuid;

-- 4.3 Backfill, deduplicate and lock down ministries.slug ---------------------
update public.ministries
set slug = public.ministry_slug(name)
where slug is null or slug = '';

with duplicate_slugs as (
  select
    id,
    slug,
    row_number() over (partition by slug order by created_at, id) as duplicate_rank
  from public.ministries
)
update public.ministries as ministry
set slug = ministry.slug || '-' || left(ministry.id::text, 8)
from duplicate_slugs
where ministry.id = duplicate_slugs.id
  and duplicate_slugs.duplicate_rank > 1;

alter table public.ministries alter column slug set default '';
alter table public.ministries alter column slug set not null;

-- The slug trigger and unique index live in this section because the
-- ministry_id backfill in 4.4 calls upsert_ministry_id, which relies on
-- on conflict (slug) to be idempotent.
drop trigger if exists set_ministries_slug on public.ministries;
create trigger set_ministries_slug
before insert or update of name on public.ministries
for each row execute function public.set_ministry_slug();

create unique index if not exists ministries_slug_unique on public.ministries (slug);

-- 4.4 Backfill schedule_items.ministry_id from the legacy text column ---------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedule_items' and column_name = 'ministry'
  ) then
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
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'schedule_items'
      and constraint_name = 'schedule_items_ministry_id_fkey'
  ) then
    alter table public.schedule_items
      add constraint schedule_items_ministry_id_fkey
      foreign key (ministry_id) references public.ministries(id) on delete restrict;
  end if;
end $$;

alter table public.schedule_items alter column ministry_id set not null;
alter table public.schedule_items drop column if exists ministry;

-- 4.5 google_event_id: drop empty-string default and allow NULL ---------------
update public.schedule_items
set google_event_id = null
where google_event_id = '';

alter table public.schedule_items alter column google_event_id drop not null;
alter table public.schedule_items alter column google_event_id drop default;

-- 4.6 schedule_items.status check constraint guard ----------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_schema = 'public' and table_name = 'schedule_items' and constraint_name = 'schedule_status_valid'
  ) then
    alter table public.schedule_items
      add constraint schedule_status_valid check (status in ('scheduled', 'suspended', 'free'));
  end if;
end $$;

-- 4.7 church_profile.regular_meetings (jsonb) -> recurring_meetings table -----
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'church_profile' and column_name = 'regular_meetings'
  ) then
    insert into public.recurring_meetings (
      id,
      profile_id,
      title,
      weekday,
      starts_at,
      ends_at,
      description,
      sort_order
    )
    select
      case
        when meeting.item ->> 'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (meeting.item ->> 'id')::uuid
        else gen_random_uuid()
      end,
      profile.id,
      coalesce(nullif(meeting.item ->> 'title', ''), 'Reuniao'),
      coalesce(nullif(meeting.item ->> 'weekday', ''), ''),
      public.parse_meeting_time(meeting.item ->> 'time', 1, '00:00'::time),
      public.parse_meeting_time(
        meeting.item ->> 'time',
        2,
        public.parse_meeting_time(meeting.item ->> 'time', 1, '00:00'::time) + interval '1 hour'
      ),
      coalesce(meeting.item ->> 'description', ''),
      meeting.ordinality::integer - 1
    from public.church_profile as profile
    cross join lateral jsonb_array_elements(profile.regular_meetings) with ordinality as meeting(item, ordinality)
    where profile.regular_meetings is not null
      and jsonb_typeof(profile.regular_meetings) = 'array'
    on conflict do nothing;
  end if;
end $$;

alter table public.church_profile drop column if exists regular_meetings;


-- =============================================================================
-- 5. Indexes
-- =============================================================================
-- ministries_slug_unique lives in section 4.3 because the migrations need it.

drop index if exists public.schedule_google_event_id_unique;
create unique index schedule_google_event_id_unique
  on public.schedule_items (google_event_id)
  where google_event_id is not null;

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
-- 6. Views
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
  schedule_items.google_event_id,
  schedule_items.status,
  schedule_items.featured,
  schedule_items.created_at,
  schedule_items.updated_at
from public.schedule_items
join public.ministries on ministries.id = schedule_items.ministry_id;


-- =============================================================================
-- 7. Triggers
-- =============================================================================
-- The set_ministries_slug trigger lives in section 4.3.

-- 7.1 updated_at touch --------------------------------------------------------
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

-- 7.2 audit log ---------------------------------------------------------------
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
-- 8. Row Level Security and policies
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

drop policy if exists "public can create prayer requests" on public.prayer_requests;

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
-- 9. Bootstrap data
-- =============================================================================

-- Singleton church_profile row so the public site has something to render
-- before an admin fills it in. Only rewrites blank fields.
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
) on conflict (id) do update set
  address = case
    when trim(public.church_profile.address) = '' then excluded.address
    else public.church_profile.address
  end,
  whatsapp = case
    when trim(public.church_profile.whatsapp) = '' then excluded.whatsapp
    else public.church_profile.whatsapp
  end,
  city = case
    when trim(public.church_profile.city) = '' then excluded.city
    else public.church_profile.city
  end
where trim(public.church_profile.address) = ''
  or trim(public.church_profile.whatsapp) = ''
  or trim(public.church_profile.city) = '';

-- Default recurring meetings, only inserted if no rows exist for the singleton.
insert into public.recurring_meetings (
  id,
  profile_id,
  title,
  weekday,
  starts_at,
  ends_at,
  description,
  sort_order
)
select
  seed.id,
  seed.profile_id,
  seed.title,
  seed.weekday,
  seed.starts_at,
  seed.ends_at,
  seed.description,
  seed.sort_order
from (
  values
    ('00000000-0000-4000-8000-000000000101'::uuid, 'main', 'Culto de louvor', 'Quinta', '19:30'::time, '21:00'::time, '', 10),
    ('00000000-0000-4000-8000-000000000102'::uuid, 'main', 'Escola Biblica', 'Domingo', '09:30'::time, '11:00'::time, '', 20),
    ('00000000-0000-4000-8000-000000000103'::uuid, 'main', 'Culto solene', 'Domingo', '17:00'::time, '19:00'::time, '', 30)
) as seed(id, profile_id, title, weekday, starts_at, ends_at, description, sort_order)
where not exists (
  select 1 from public.recurring_meetings where profile_id = 'main'
);
