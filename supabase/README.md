# Supabase

Banco de dados gerenciado via **Supabase CLI + migrations versionadas**.

## Estrutura

```
supabase/
  config.toml             # config local (Postgres porta, JWT secret dev, etc)
  migrations/             # migrations aditivas, imutaveis depois de aplicadas
    20260504000000_initial_schema.sql
    ...
  seed.sql                # DML aplicado em `supabase db reset` (dev local)
  cron.sql                # script manual pra ativar pg_cron + agendar purge
  sources/                # planilhas xlsx que alimentam o seed
```

## Workflow

### Mudanca no schema

1. Cria nova migration:

   ```bash
   npx supabase migration new <nome_descritivo>
   ```

   Gera `supabase/migrations/<timestamp>_<nome>.sql` vazio.

2. Edita o arquivo com `ALTER TABLE`, `CREATE FUNCTION`, etc. **Aditivo** sempre que possivel — evite `DROP TABLE` em prod com dados.

3. Testa local (precisa Docker):

   ```bash
   npx supabase start          # sobe Postgres local
   npx supabase db reset       # zera + aplica todas migrations + seed.sql
   ```

4. Linka com prod (so a primeira vez por maquina):

   ```bash
   npx supabase link --project-ref <ref>
   ```

5. Aplica em prod:
   ```bash
   npx supabase db push
   ```
   Ou cola o conteudo da migration nova no SQL Editor do Supabase manualmente.

### Atualizar seed (members + schedule)

```bash
npm run seed:schedule
```

Le `sources/Escala-de-cultos.xlsx` + `sources/escala-som.xlsx` e regenera o
bloco entre os marcadores `BEGIN SEED`/`END SEED` em `seed.sql`.

### pg_cron (manual)

`cron.sql` ativa `pg_cron` e agenda `purge_old_prayers()` mensalmente.
Roda 1x no SQL Editor do Supabase apos habilitar pg_cron no painel.

## Convencoes

- Migrations sao **imutaveis** depois de aplicadas em qualquer ambiente. Pra
  corrigir uma migration ja aplicada, crie outra que reverta ou ajuste.
- `seed.sql` e idempotente (todos `INSERT ... ON CONFLICT DO NOTHING/UPDATE`).
- Owners iniciais (`gediael54@gmail.com`, `agtlislopes@gmail.com`) seedados
  pela migration inicial via `select id from auth.users where email in (...)` —
  so populam se as contas auth ja existem.

## Marcando baseline como ja aplicada em prod

Se voce ja aplicou o `schema.sql` legacy em prod e agora esta migrando pro
workflow de migrations, marque a migration baseline como ja aplicada (sem
reaplicar):

```bash
npx supabase migration repair --status applied 20260504000000
```

Daqui em diante, migrations novas sao aplicadas normalmente via `db push`.
