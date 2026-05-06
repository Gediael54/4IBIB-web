-- commemorative_dates armazena datas comemorativas que aparecem como
-- badges no site. type='month' cobre o mes inteiro (ex.: "Mes de Missoes"
-- em julho). type='day' cobre apenas o dia especifico (ex.: "Dia das Maes"
-- em 10 de maio). day_of_month e usado apenas quando type='day'.
-- A tabela e publica para leitura (anon) e protegida por RLS para escrita.

create type public.commemoration_type as enum ('month', 'day');

create table public.commemorative_dates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.commemoration_type not null,
  month smallint not null check (month between 1 and 12),
  day_of_month smallint null check (day_of_month between 1 and 31),
  description text not null default '',
  color text not null default '#0f766e',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  constraint commemorative_dates_day_required
    check ((type = 'day' and day_of_month is not null) or (type = 'month' and day_of_month is null))
);

create index commemorative_dates_month_idx on public.commemorative_dates (month) where deleted_at is null;
create index commemorative_dates_active_idx on public.commemorative_dates (deleted_at) where deleted_at is null;

create trigger touch_commemorative_dates_updated_at
  before update on public.commemorative_dates
  for each row execute function public.touch_updated_at();

create trigger audit_commemorative_dates
  after insert or update or delete on public.commemorative_dates
  for each row execute function public.log_content_audit();

alter table public.commemorative_dates enable row level security;

create policy "public can read commemorative dates"
  on public.commemorative_dates for select
  using (deleted_at is null);

create policy "admins can read all commemorative dates"
  on public.commemorative_dates for select
  to authenticated
  using (public.is_admin());

create policy "admins can insert commemorative dates"
  on public.commemorative_dates for insert
  to authenticated
  with check (public.is_admin());

create policy "admins can update commemorative dates"
  on public.commemorative_dates for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke delete on public.commemorative_dates from anon, authenticated;

create or replace function public.archive_commemorative_date(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  if not public.check_admin_rate_limit('archive_commemorative_date') then
    raise exception 'Limite de operacoes destrutivas excedido. Aguarde um instante.';
  end if;
  update public.commemorative_dates set deleted_at = now() where id = p_id and deleted_at is null;
end; $$;

create or replace function public.restore_commemorative_date(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  update public.commemorative_dates set deleted_at = null where id = p_id;
end; $$;

revoke execute on function public.archive_commemorative_date(uuid) from public;
revoke execute on function public.restore_commemorative_date(uuid) from public;
grant execute on function public.archive_commemorative_date(uuid) to authenticated;
grant execute on function public.restore_commemorative_date(uuid) to authenticated;

-- Adiciona commemorative_dates a allowed_tables de revert_audit_entry para
-- permitir undo de operacoes via audit log. A funcao e re-criada com a lista
-- atualizada (mudanca aditiva, mantem comportamento das demais tabelas).

create or replace function public.revert_audit_entry(entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.content_audit_log%rowtype;
  allowed_tables text[] := array[
    'announcements', 'schedule_items', 'prayer_requests',
    'church_profile', 'ministries', 'recurring_meetings',
    'members', 'households', 'member_relationships',
    'commemorative_dates'
  ];
  cols text;
  vals text;
  set_clause text;
  payload jsonb;
begin
  if not public.is_admin() then
    raise exception 'Acesso negado: apenas admins podem reverter alteracoes.';
  end if;

  select * into entry from public.content_audit_log where id = entry_id;
  if not found then
    raise exception 'Entrada de audit log nao encontrada: %', entry_id;
  end if;

  if not (entry.table_name = any(allowed_tables)) then
    raise exception 'Tabela nao autorizada para revert: %', entry.table_name;
  end if;

  if entry.action = 'INSERT' then
    execute format('delete from public.%I where id = $1', entry.table_name)
      using entry.row_id;
  elsif entry.action = 'UPDATE' then
    payload := entry.old_row;
    if payload is null then
      raise exception 'old_row ausente em UPDATE; impossivel reverter.';
    end if;
    select string_agg(
      format('%I = (jsonb_populate_record(null::public.%I, $1)).%I', key, entry.table_name, key),
      ', '
    )
      into set_clause
      from jsonb_object_keys(payload) as key
      where key <> 'id';
    if set_clause is null then return; end if;
    execute format('update public.%I set %s where id = $2', entry.table_name, set_clause)
      using payload, entry.row_id;
  elsif entry.action = 'DELETE' then
    payload := entry.old_row;
    if payload is null then
      raise exception 'old_row ausente em DELETE; impossivel reverter.';
    end if;
    select
      string_agg(format('%I', key), ', '),
      string_agg(format('(jsonb_populate_record(null::public.%I, $1)).%I', entry.table_name, key), ', ')
      into cols, vals
      from jsonb_object_keys(payload) as key;
    execute format('insert into public.%I (%s) values (%s)', entry.table_name, cols, vals)
      using payload;
  else
    raise exception 'Acao desconhecida: %', entry.action;
  end if;
end;
$$;

comment on table public.commemorative_dates is 'Datas comemorativas (mes ou dia especifico) exibidas no site publico.';
