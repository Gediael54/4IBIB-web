-- Purge content_audit_log entries older than 24 months.
create or replace function public.purge_old_audit()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  affected int;
begin
  with purged as (
    delete from public.content_audit_log
    where changed_at < now() - interval '24 months'
    returning 1
  )
  select count(*) into affected from purged;
  return affected;
end;
$$;
