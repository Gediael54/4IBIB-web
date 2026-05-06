-- Cria view publica members_public expondo apenas colunas seguras (sem PII).
-- Substitui a policy "public can read public members" que liberava SELECT
-- em todas as colunas de members (cpf, rg, allergies, medical_notes, etc).

create view public.members_public as
select
  m.id,
  m.full_name,
  m.preferred_name,
  m.photo_url,
  m.church_role,
  m.public_bio,
  m.is_volunteer,
  m.household_id
from public.members m
where m.deleted_at is null
  and m.public_directory = true;

-- security_invoker = off (default) faz a view rodar com permissoes do dono
-- (postgres), bypass de RLS. Isso e seguro porque a projecao acima ja
-- restringe as colunas expostas ao subset publico. Se setassemos
-- security_invoker = on a view dependeria de uma policy publica em
-- public.members, recriando o vazamento que esta migration corrige.

revoke all on public.members_public from public;
grant select on public.members_public to anon, authenticated;

-- A view volunteers expoe contact = phone/whatsapp/email do membro.
-- Restringe a authenticated (admins leem via policies de members).
revoke select on public.volunteers from anon;

-- Remove a policy publica que permitia anon ler PII completa de members.
drop policy if exists "public can read public members" on public.members;
