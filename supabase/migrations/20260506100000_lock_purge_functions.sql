-- Revoga execute das funcoes de purge para anon/authenticated/public.
-- pg_cron roda como superuser, entao nao precisa do grant geral concedido
-- na migration inicial em "grant execute on all functions ... to anon, authenticated".
-- Mantem service_role implicitamente (bypass RLS + grant default).

revoke execute on function public.purge_old_prayers() from public, anon, authenticated;
revoke execute on function public.purge_old_audit() from public, anon, authenticated;
