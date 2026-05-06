-- Atualiza log_content_audit para nao gravar PII de members em
-- content_audit_log. PII e removida das colunas old_row/new_row antes do
-- insert. revert_audit_entry usa apenas o whitelist do allowed_tables, mas
-- como members esta na lista, um revert de UPDATE em members nao recuperara
-- os campos redacted -- aceitavel: o admin reverte campos publicos e os
-- privados ficam como estao (precisariam ser editados manualmente).

create or replace function public.redact_member_pii(row jsonb)
returns jsonb
language sql
stable
as $$
  select coalesce(row, '{}'::jsonb)
    - 'cpf'
    - 'rg'
    - 'rg_issuer'
    - 'allergies'
    - 'medical_notes'
    - 'baptism_location'
    - 'emergency_contact_name'
    - 'emergency_contact_phone'
    - 'phone'
    - 'whatsapp'
    - 'email'
    - 'address_zip'
    - 'address_street'
    - 'address_number'
    - 'address_complement'
    - 'address_neighborhood'
    - 'address_city'
    - 'address_state'
    - 'birth_date'
    - 'consent_medical_data_at'
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
  payload_old jsonb;
  payload_new jsonb;
begin
  if tg_op = 'DELETE' then
    target_row = to_jsonb(old);
    target_id = old.id::text;
  else
    target_row = to_jsonb(new);
    target_id = new.id::text;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    payload_old := to_jsonb(old);
    if tg_table_name = 'members' then
      payload_old := public.redact_member_pii(payload_old);
    end if;
  else
    payload_old := null;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    payload_new := target_row;
    if tg_table_name = 'members' then
      payload_new := public.redact_member_pii(payload_new);
    end if;
  else
    payload_new := null;
  end if;

  insert into public.content_audit_log (
    table_name, row_id, action, changed_by, old_row, new_row
  ) values (
    tg_table_name,
    target_id,
    tg_op,
    auth.uid(),
    payload_old,
    payload_new
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
