-- Cria volunteers_public sem o campo contact (whatsapp/phone/email),
-- substituindo a leitura anon que foi revogada na migration anterior.
-- A view volunteers (com contact) permanece restrita a authenticated/admin.
-- Resultado: site publico volta a listar voluntarios sem expor PII.

create view public.volunteers_public as
select
  m.id,
  m.full_name as name,
  case
    when array_length(m.volunteer_ministries, 1) > 0 then m.volunteer_ministries[1]
    else 'geral'
  end as role,
  0 as sort_order,
  m.photo_url,
  m.volunteer_ministries as ministries,
  m.volunteer_unavailable_dates as unavailable_dates,
  m.volunteer_notes as notes,
  m.created_at,
  m.updated_at
from public.members m
where m.is_volunteer = true and m.deleted_at is null;

revoke all on public.volunteers_public from public;
grant select on public.volunteers_public to anon, authenticated;

comment on view public.volunteers_public is 'Voluntarios publicos sem PII de contato (anon-friendly).';
