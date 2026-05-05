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
  config.toml     # config local (Supabase CLI)
  migrations/     # migrations versionadas (aditivas, imutaveis)
  seed.sql        # DML aplicado em dev local via `supabase db reset`
  cron.sql        # script manual pra ativar pg_cron
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

| Plano                                       | Arquivo                                                              | Status                                                                                                                              |
| ------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Plano admin master (features)               | [`docs/plans/admin-master-plan.md`](docs/plans/admin-master-plan.md) | Fases 1-5 ✅ exceto serie recorrente (provavelmente desnecessaria) e notificacao de pedido novo (depende canal email).              |
| Plano S+++ (qualidade A → A+)               | [`docs/plans/quality-roadmap.md`](docs/plans/quality-roadmap.md)     | Fases 6, 7, 8.1, 9 (4 partes), 11 (3 partes), 12 (1, 2, 6), 15 (1, 2, 6, 7) ✅. Fases 8.2-8.5, 10, 13, 14, 9.4/9.6, 15.3-5, 15.8 ⏸. |
| Fase 16 — UI redesign                       | [`docs/plans/ui-redesign.md`](docs/plans/ui-redesign.md)             | Waves 1-5 ✅. Pendente: AnnualGrid table-as-cards mobile, AuditLog filter drawer mobile.                                            |
| Feature membros + LGPD + hardening (5/2026) | [`docs/plans/members-feature.md`](docs/plans/members-feature.md)     | Sessoes 1-3 ✅. Pendente: adapter archive-first (desbloqueia undo banner), LGPD anonymize UI, schedule-member binding edge cases.   |

Estado atual: **407 tests verdes**, 100% cobertura em `core` e `supabase`, typecheck/build limpos. Ver `docs/plans/members-feature.md` para snapshot completo do que ja foi entregue.

## Pendencias prioritarias (ordem de ROI)

1. **Adapter archive-first** — `packages/supabase` ainda usa hard delete direto em announcements, schedule_items e ministries. Schema ja tem RPCs `archive_X` e `restore_X` da Sessao 1. Migrar adapter + criar hooks `useArchive` e `useRestore` paralelos. Ativa undo banner ja wireado no Toast.
2. **LGPD finalizar** — ativar pg_cron rodando `supabase/cron.sql` no painel. Wirear botao "Anonimizar dados" em MembersView. Funcao `purge_old_audit()` mensal.
3. **ScheduleView dropdown de membros** — pregador/dirigente/som como select de members (`is_volunteer=true`) ao inves de input string + datalist.
4. **Hardening manual** — #23 rotacionar service_role JWT, habilitar 2FA Supabase Auth, integrar provider email (Resend) em `login-alert.js`.
5. **Performance Fase 10** (precisa deps): vite-plugin-visualizer, zod→valibot, code splitting AnnualSchedule, vite-plugin-image, Lighthouse CI.
6. **Tooling Fase 13** (precisa CI infra): Dependabot, license-checker, commitlint, semantic-release, status badges.
7. **axe-core CI** (precisa `vitest-axe`/`jest-axe`).
8. **Diagrama C4** em Mermaid.
9. **Drag-and-drop** (precisa @dnd-kit) em MinistriesView/RecurringMeetings/AnnualSchedule.
10. **View-transition API** (Fase 15.8) com `prefers-reduced-motion`.

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
- **Banco via Supabase CLI + migrations versionadas**. Mudancas viram novos arquivos em `supabase/migrations/` via `npx supabase migration new <nome>`. Ver `supabase/README.md` pra workflow completo. NAO existe mais `schema.sql` canonico — baseline foi capturada em `migrations/20260504000000_initial_schema.sql`.
- **Owners atuais** (auth.users em prod): `gediael54@gmail.com`, `agtlislopes@gmail.com`. Se novo admin precisa ser adicionado, `insert into admin_users (user_id, role) values ('<uid>', 'owner') on conflict do nothing`.
- **Releases**: `semantic-release` roda no workflow `.github/workflows/release.yml` em cada push pra `main`. Calcula a proxima versao a partir dos conventional commits, atualiza `CHANGELOG.md`, faz commit `chore(release): X.Y.Z [skip ci]`, cria tag e publica release no GitHub. Sem publish em npm. Usa `GITHUB_TOKEN` (escopo do repo, nao precisa PAT extra).
