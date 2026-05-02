# 4IBIB Web — Contexto do projeto

Site publico + painel admin da **4ª Igreja Batista Independente Betel** (igreja batista, perfil reformado, nao neopentecostal).

## Stack

- **Frontend**: React 19 + Vite 7 + TypeScript estrito
- **Backend**: Supabase (Postgres + Auth + RLS); fallback `mock` foi removido (dev contra Supabase real)
- **Hospedagem**: Cloudflare Pages (site em `/`, admin em `/admin/`)
- **Monorepo**: npm workspaces

## Layout do repo

```
apps/
  site/        # site publico (porta 5173 em dev)
  admin/       # painel CMS (porta 5174 em dev, deploy em /admin/)
packages/
  core/        # tipos de dominio + utilidades puras (100% cobertura)
  supabase/    # adapter para Supabase (100% cobertura)
supabase/
  schema.sql      # fonte unica idempotente: estrutura/RLS/funcoes/triggers + seed inline
  sources/        # planilhas/fontes externas de seed
scripts/
  compose-dist.mjs       # combina site + admin em um dist/ pro Cloudflare
  seed-from-xlsx.mjs     # regenera bloco de seed dentro de supabase/schema.sql
docs/
  plans/                 # planos de longo prazo (ver "Planos ativos" abaixo)
  setup-checklist.md
```

`apps/*` consomem **somente** `@4ibib/core` (tipos) + `@4ibib/supabase` (adapter). Nada de detalhes de Supabase vazando pra UI.

## Comandos

```bash
npm install
npm run dev:site      # site em http://localhost:5173
npm run dev:admin     # admin em http://localhost:5174
npm test              # vitest run --coverage (gate 100% em core/supabase)
npm run typecheck     # todos os workspaces
npm run build         # gera dist/ pra Cloudflare Pages
npm run seed:schedule # regenera bloco de seed inline em supabase/schema.sql
```

## Convencoes

- **Sem comentarios explicando WHAT** — codigo auto-explicativo. Comentario so pra WHY nao-obvio.
- **Sem mocks em testes de banco** — testes do Supabase mockam o cliente, mas usam contratos reais.
- **Strings em PT-BR sem acentos** (compatibilidade mais ampla; convencao do projeto).
- **Cobertura 100%** obrigatoria em `core` e `supabase` (gate no `vitest.config.ts`).
- **`.env`** fica na raiz; `vite.config.ts` de cada app aponta `envDir: "../.."`.
- **Commits**: skill `commit` em `~/.claude/skills/commit/SKILL.md` — sem `Co-Authored-By`, conventional commits, staging individual.

## Variaveis de ambiente

```
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

A `Publishable key` (`sb_publishable_*`) e segura no frontend. A `service_role` / `secret key` **nunca** vai pro `.env` do Vite.

## Seguranca Supabase

RLS habilitado em todas as tabelas. Politicas via funcoes `is_admin()` e `is_owner()` (security definer, evita recursao). `admin_users` controla quem pode editar. Leitura publica para conteudo institucional, restrita para `prayer_requests` e `content_audit_log`.

## Decisoes confirmadas pelo usuario

- **SQL/migrations autorizados**: pode alterar schema seguindo melhores praticas, preservando dados atuais.
- **Horarios oficiais**: culto de louvor quinta 19:30-21:00; escola biblica domingo 09:30-11:00; culto solene domingo 17:00-19:00.
- **SEO canonico**: `https://4ibib-web.pages.dev/`.
- **Contato oficial**: `478 Rua Jose Victor de Albuquerque`; WhatsApp `+55 81 98122-0651`; email `4ibibetel@gmail.com`.
- **Robots**: manter `/admin` fora de indexacao.
- **Form de oracao**: Cloudflare Turnstile + validacao server-side/rate-limit.
- **Infra**: ESLint + Prettier conservador, GitHub Actions CI, Husky+lint-staged.
- **Error tracking**: Sentry para frontend React/Vite.
- **Redes sociais**: Instagram `https://www.instagram.com/4igrejabatista/`, YouTube `https://www.youtube.com/@4aibibetel864`.

## Planos ativos

Detalhes completos vivem em `docs/plans/`. CLAUDE.md so resume status.

| Plano                         | Arquivo                                                              | Status                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Plano admin master (features) | [`docs/plans/admin-master-plan.md`](docs/plans/admin-master-plan.md) | Fases 1-5 ✅ exceto serie recorrente (provavelmente desnecessaria) e notificacao de pedido novo (depende canal) |
| Plano S+++ (qualidade A → A+) | [`docs/plans/quality-roadmap.md`](docs/plans/quality-roadmap.md)     | Fase 6 (refactor DRY/SRP/ISP) ✅. Fases 7-15 pendentes.                                                         |
| Fase 16 — UI redesign         | [`docs/plans/ui-redesign.md`](docs/plans/ui-redesign.md)             | Wave 1 ✅, Wave 2 ✅, Wave 3-5 em andamento                                                                     |

## Backlog aberto (fora dos planos)

### Schema/banco

- [ ] **#23** Rotacionar/desabilitar legacy service_role JWT no Supabase (manual no painel).

### Funcionalidades extra (fora do admin)

- [ ] **#51** Inscricoes em eventos com formulario publico (depende de definir destino).
- [ ] **#52** Pregacoes/estudos: vincular YouTube a eventos passados, com preview.
- [ ] **#53** PIX/doacoes: chave copia-e-cola + QR estatico.
- [ ] **#54** Newsletter/mailing list.
- [ ] **#55** Notificacao ao publicar aviso (canal a decidir).
- [ ] **#57** Bio dos pastores/lideranca com fotos (CRUD novo + secao publica).
- [ ] **#62** Secao "Primeira vez aqui?" no site (onboarding com 4-5 cards).
- [ ] **#63** Eyebrow tags por categoria nos avisos/eventos.
- [ ] **#64** "Latest Teaching" persistente na home (depende #52).
- [ ] **#65** Confissao de fe / doutrina no footer (link ou texto curto).

## Notas de operacao

- **Branch principal**: `main`.
- **Commits**: criar so quando o usuario pedir.
- **Cobertura**: gate 100% em `core` e `supabase`. Quebrar = test fail.
- **Antes de instalar deps via apt/sudo**: pedir; sandbox geralmente bloqueia rede.
- **Memoria**: o usuario tem `feedback_no_assumptions` ativa — em ambiguidade real, pergunta direta antes de chutar.
