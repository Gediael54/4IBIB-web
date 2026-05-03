-- Habilita pg_cron e agenda purge mensal de prayers concluidos > 18 meses.
-- Execute uma vez no SQL Editor do Supabase. A funcao public.purge_old_prayers()
-- vive em supabase/schema.sql e ja arquiva/anonimiza pedidos antigos.

create extension if not exists pg_cron;

select cron.schedule(
  'purge-old-prayers-monthly',
  '0 3 1 * *',
  $$select public.purge_old_prayers()$$
);
