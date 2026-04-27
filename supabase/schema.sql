create extension if not exists pgcrypto;

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
  regular_meetings jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

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
  summary text not null,
  meeting_time text not null,
  contact text not null,
  color text not null default '#0f766e',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  ministry text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null,
  summary text not null,
  preacher text not null default '',
  director text not null default '',
  passage text not null default '',
  special_date text not null default '',
  google_event_id text not null default '',
  status text not null default 'scheduled',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_time_order check (ends_at > starts_at),
  constraint schedule_status_valid check (status in ('scheduled', 'suspended', 'free'))
);

-- Idempotent guards for databases provisioned before the extended schedule columns landed.
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

alter table public.schedule_items add column if not exists preacher text not null default '';
alter table public.schedule_items add column if not exists director text not null default '';
alter table public.schedule_items add column if not exists passage text not null default '';
alter table public.schedule_items add column if not exists special_date text not null default '';
alter table public.schedule_items add column if not exists google_event_id text not null default '';
alter table public.schedule_items add column if not exists status text not null default 'scheduled';

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

create unique index if not exists schedule_google_event_id_unique
  on public.schedule_items (google_event_id)
  where google_event_id <> '';

create index if not exists schedule_starts_at_idx on public.schedule_items (starts_at);

create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  message text not null,
  status text not null default 'novo' check (status in ('novo', 'em_oracao', 'concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

drop trigger if exists touch_schedule_items_updated_at on public.schedule_items;
create trigger touch_schedule_items_updated_at
before update on public.schedule_items
for each row execute function public.touch_updated_at();

drop trigger if exists touch_prayer_requests_updated_at on public.prayer_requests;
create trigger touch_prayer_requests_updated_at
before update on public.prayer_requests
for each row execute function public.touch_updated_at();

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

alter table public.admin_users enable row level security;
alter table public.church_profile enable row level security;
alter table public.announcements enable row level security;
alter table public.ministries enable row level security;
alter table public.schedule_items enable row level security;
alter table public.prayer_requests enable row level security;

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
create policy "public can create prayer requests"
on public.prayer_requests for insert
to anon, authenticated
with check (
  status = 'novo'
  and length(trim(name)) between 2 and 120
  and length(trim(message)) between 5 and 2000
  and length(contact) <= 180
);

drop policy if exists "admins can manage prayer requests" on public.prayer_requests;
create policy "admins can manage prayer requests"
on public.prayer_requests for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Bootstrap singleton row so the public site has a profile to render before the admin fills it in.
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
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
) on conflict (id) do nothing;
