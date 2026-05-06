-- rotation_rules define padroes de escala recorrente: "Carlos no som a cada
-- 2 cultos de domingo", "Maria como dirigente toda primeira semana do mes".
-- O algoritmo de geracao da escala anual aplica essas regras em ordem de
-- prioridade, respeitando volunteer_unavailable_dates.

create type public.rotation_role as enum ('preacher', 'director', 'sound');

create type public.rotation_frequency as enum (
  'every_week',
  'every_2_weeks',
  'every_3_weeks',
  'every_4_weeks',
  'monthly_first',
  'monthly_second',
  'monthly_third',
  'monthly_fourth',
  'monthly_last',
  'quarterly'
);

create table public.rotation_rules (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  role public.rotation_role not null,
  frequency public.rotation_frequency not null,
  weekday smallint not null check (weekday between 0 and 6),
  ministry text not null default '',
  priority integer not null default 0,
  active boolean not null default true,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index rotation_rules_member_idx on public.rotation_rules (member_id) where deleted_at is null;
create index rotation_rules_active_idx on public.rotation_rules (active) where deleted_at is null;
create index rotation_rules_weekday_idx on public.rotation_rules (weekday) where deleted_at is null and active = true;

create trigger touch_rotation_rules_updated_at
  before update on public.rotation_rules
  for each row execute function public.touch_updated_at();

create trigger audit_rotation_rules
  after insert or update or delete on public.rotation_rules
  for each row execute function public.log_content_audit();

alter table public.rotation_rules enable row level security;

create policy "admins can read rotation rules"
  on public.rotation_rules for select
  to authenticated
  using (public.is_admin());

create policy "admins can insert rotation rules"
  on public.rotation_rules for insert
  to authenticated
  with check (public.is_admin());

create policy "admins can update rotation rules"
  on public.rotation_rules for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke delete on public.rotation_rules from anon, authenticated;

create or replace function public.archive_rotation_rule(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  if not public.check_admin_rate_limit('archive_rotation_rule') then
    raise exception 'Limite de operacoes destrutivas excedido. Aguarde um instante.';
  end if;
  update public.rotation_rules set deleted_at = now() where id = p_id and deleted_at is null;
end; $$;

create or replace function public.restore_rotation_rule(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Acesso negado.'; end if;
  update public.rotation_rules set deleted_at = null where id = p_id;
end; $$;

revoke execute on function public.archive_rotation_rule(uuid) from public;
revoke execute on function public.restore_rotation_rule(uuid) from public;
grant execute on function public.archive_rotation_rule(uuid) to authenticated;
grant execute on function public.restore_rotation_rule(uuid) to authenticated;

-- Inclui rotation_rules na lista de tabelas reversiveis via revert_audit_entry.

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
    'commemorative_dates', 'rotation_rules'
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

comment on table public.rotation_rules is 'Regras de rotacao de voluntarios para gerar a escala anual.';
