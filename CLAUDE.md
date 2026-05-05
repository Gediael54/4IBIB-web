# 4IBIB Web — Contexto do projeto

Site publico + painel admin da **4ª Igreja Batista Independente Betel** (igreja batista, perfil reformado, nao neopentecostal). Em producao desde 2026-05; release atual e `v1.0.0` via `semantic-release`.

## Stack

- **Frontend**: React 19 + Vite 7 + TypeScript estrito (5 workspaces npm).
- **Backend**: Supabase (Postgres + Auth + RLS). Sem fallback mock — dev contra Supabase real ou local via Docker.
- **Hospedagem**: Cloudflare Pages (site em `/`, admin em `/admin/`); Cloudflare Functions em `functions/api/*`.
- **Schema versionado**: Supabase CLI + migrations aditivas em `supabase/migrations/`. NAO existe mais `schema.sql` canonico.

## Layout do repo

```
apps/
  site/                 # site publico
  admin/                # painel CMS (deploy /admin/)
packages/
  core/                 # tipos de dominio + helpers puros (100% cobertura)
  supabase/             # adapter Supabase (100% cobertura)
  db/                   # types.ts gerado via `supabase gen types`
supabase/
  config.toml           # config do Supabase CLI
  migrations/           # versionadas, aditivas, imutaveis
  seed.sql              # DML aplicado em `supabase db reset`
  cron.sql              # ativa pg_cron + agenda purges (manual, 1x)
  sources/              # planilhas xlsx do seed
  tests/                # tests reais via Vitest+pg (helpers/rls/triggers/rpcs)
functions/api/          # Cloudflare Pages Functions (prayer, health, auth)
scripts/                # build, seed, fotos, logos
docs/
  adr/                  # 5 ADRs (decisoes arquiteturais)
  architecture.md       # diagramas C4 (Mermaid)
  onboarding.md         # quickstart pra novo dev
.github/workflows/      # ci, db-validate, lighthouse, release, dependabot
```

`apps/*` consomem **somente** `@4ibib/core` (tipos) + `@4ibib/supabase` (adapter). Nada de detalhes de Supabase vazando pra UI.

## Comandos

```bash
npm install
npm run dev:site         # http://localhost:5173
npm run dev:admin        # http://localhost:5174
npm test                 # vitest + cobertura (gate 100% em core/supabase)
npm run typecheck        # 5 workspaces
npm run build            # gera dist/ pra Cloudflare Pages
npm run analyze          # ANALYZE=true npm run build (gera stats.html)
npm run license-check    # bloqueia GPL/AGPL nas deps de prod
npm run seed:schedule    # regenera SEED block em supabase/seed.sql
npm run db:types         # regenera packages/db/types.ts via Supabase CLI
npm run test:db          # tests SQL reais (precisa Postgres rodando)
```

## Convencoes

- **Sem comentarios explicando WHAT** — codigo auto-explicativo. Comentario so pra WHY nao-obvio.
- **Strings em PT-BR sem acentos** (compatibilidade ampla).
- **Cobertura 100%** em `core` + `supabase` (gate em `vitest.config.ts`).
- **`.env`** fica na raiz; cada app aponta `envDir: "../.."`.
- **Conventional commits obrigatorio** — `commitlint` valida via Husky `commit-msg`. `semantic-release` calcula versao a partir disso.
- **Commits**: skill `commit` em `~/.claude/skills/commit/SKILL.md` — sem `Co-Authored-By`, staging individual.

## Variaveis de ambiente

```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_PRAYER_ENDPOINT=/api/prayer
VITE_TURNSTILE_SITE_KEY=0x...
VITE_SENTRY_DSN=https://...

TURNSTILE_SECRET_KEY=0x...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_ACCESS_TOKEN=sbp_...    # PAT pra Supabase CLI (db push, gen types)
```

Variaveis com prefixo `VITE_` vao pro bundle (publico). Service role e access token **nunca** vao pro front.

## Seguranca Supabase

- RLS habilitado em todas tabelas com policies via `is_admin()` + `is_owner()` (security definer).
- DELETE direto bloqueado em members/announcements/schedule*items/prayer_requests/ministries — soft delete via RPCs `archive*_`/`restore\__`.
- Rate limit por `admin_users.user_id`: 30 mutations destrutivas/min via `check_admin_rate_limit`.
- LGPD: cron mensal `purge_old_prayers` (18m) + `purge_old_audit` (24m). RPC `anonymize_member` substitui PII.
- Owners atuais (auth.users): `gediael54@gmail.com`, `agtlislopes@gmail.com`.

Detalhes em [`docs/adr/0002-supabase-rls-as-authz-boundary.md`](docs/adr/0002-supabase-rls-as-authz-boundary.md) e [`docs/architecture.md`](docs/architecture.md).

## Decisoes confirmadas

- **Horarios oficiais**: louvor quinta 19:30-21:00; escola biblica domingo 09:30-11:00; culto solene domingo 17:00-19:00.
- **SEO canonico**: `https://4ibib-web.pages.dev/`.
- **Contato oficial**: `478 Rua Jose Victor de Albuquerque`; WhatsApp `+55 81 98122-0651`; email `4ibibetel@gmail.com`.
- **Robots**: `/admin` fora de indexacao.
- **Form de oracao**: Cloudflare Turnstile + rate-limit server-side.
- **Redes sociais**: Instagram `https://www.instagram.com/4igrejabatista/`, YouTube `https://www.youtube.com/@4aibibetel864`.
- **URL antiga** `https://4ibibetel.lovestoblog.com` redireciona via `.htaccess` 301 + index.php fallback pra preservar QR codes ja distribuidos.

## Pendencias

### Manual no painel (depende do usuario)

- **Rotacionar legacy service_role JWT** — Supabase Dashboard → Settings → API.
- **Habilitar 2FA Auth MFA** — Supabase Dashboard → Authentication → Providers.
- **Provider email Resend** — criar conta → adicionar `RESEND_API_KEY` no `.env` + Cloudflare → wirear em `functions/api/login-alert.js`.

### Backlog aberto

- **#51** Inscricoes em eventos com formulario publico (depende de definir destino).
- **#52** Pregacoes/estudos: vincular YouTube a eventos passados, com preview.
- **#53** PIX/doacoes: chave copia-e-cola + QR estatico.
- **#54** Newsletter/mailing list.
- **#55** Notificacao ao publicar aviso (canal a decidir).
- **#57** Bio dos pastores/lideranca com fotos (CRUD novo + secao publica).
- **#62** Secao "Primeira vez aqui?" no site (onboarding com 4-5 cards).
- **#63** Eyebrow tags por categoria nos avisos/eventos.
- **#64** "Latest Teaching" persistente na home (depende #52).
- **#65** Confissao de fe / doutrina no footer.
- **AnnualGrid table-as-cards mobile**, **AuditLog filter drawer mobile** — pendencias UX que ficaram do redesign.

## Notas de operacao

- **Branch principal**: `main`. Push dispara `semantic-release` no GitHub Actions (CHANGELOG + tag + GitHub Release automatico via conventional commits).
- **Commits**: criar so quando o usuario pedir.
- **Migrations**: nova mudanca de schema = `npx supabase migration new <nome>` + edita SQL + `npx supabase db push`. Apos aplicar: `npm run db:types` regenera os types. Ver [`supabase/README.md`](supabase/README.md).
- **DB tests local**: `docker run -d --name pg-test -e POSTGRES_PASSWORD=postgres -p 5432:5432 supabase/postgres:15.6.1.146`, aplica migrations + seed via psql, roda `npm run test:db`. CI faz isso automaticamente em PRs via `.github/workflows/db-validate.yml`.
- **Memoria**: o usuario tem `feedback_no_assumptions` ativa — em ambiguidade real, pergunta direta antes de chutar.
- **Onboarding**: ver [`docs/onboarding.md`](docs/onboarding.md) pra setup local em <30min.
