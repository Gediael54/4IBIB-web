-- Habilita pg_cron e agenda purges mensais:
-- - prayers concluidos > 18 meses (public.purge_old_prayers)
-- - content_audit_log entries > 24 meses (public.purge_old_audit)
-- Execute uma vez no SQL Editor do Supabase. As funcoes vivem em
-- supabase/migrations/ e ja arquivam/removem registros antigos.

create extension if not exists pg_cron;

select cron.schedule(
  'purge-old-prayers-monthly',
  '0 3 1 * *',
  $$select public.purge_old_prayers()$$
);

select cron.schedule(
  'purge-old-audit-monthly',
  '30 3 1 * *',
  $$select public.purge_old_audit()$$
);
