# 4IBIB Web — Contexto do projeto

Site publico + painel admin da **4ª Igreja Batista Independente Betel** (igreja batista, perfil reformado, nao neopentecostal).

## Stack

- **Frontend**: React 19 + Vite 7 + TypeScript estrito
- **Backend**: Supabase (Postgres + Auth + RLS); fallback `mock` foi removido (usar dev contra Supabase real)
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
npm run seed:schedule # regenera bloco de seed inline em supabase/schema.sql a partir das planilhas
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

A `Publishable key` (sb*publishable*\*) e segura no frontend. A `service_role` / `secret key` **nunca** vai pro `.env` do Vite.

## Seguranca Supabase

RLS habilitado em todas as tabelas. Politicas via funcoes `is_admin()` e `is_owner()` (security definer, evita recursao). `admin_users` controla quem pode editar. Leitura publica para conteudo institucional, restrita para `prayer_requests` e `content_audit_log`.

---

# Decisoes confirmadas pelo usuario

- **SQL/migrations autorizados**: pode alterar schema seguindo melhores praticas, preservando dados atuais quando possivel.
- **Horarios oficiais**: culto de louvor quinta 19:30-21:00; escola biblica domingo 09:30-11:00; culto solene domingo 17:00-19:00.
- **SEO canonico**: `https://4ibib-web.pages.dev/`.
- **Contato oficial**: `478 Rua Jose Victor de Albuquerque`; WhatsApp `+55 81 98122-0651`; email `4ibibetel@gmail.com`.
- **Robots**: manter `/admin` fora de indexacao.
- **Form de oracao**: Cloudflare Turnstile + validacao server-side/rate-limit.
- **Infra**: ESLint + Prettier conservador, GitHub Actions CI, Husky+lint-staged.
- **Error tracking**: Sentry para frontend React/Vite.
- **Redes sociais**: Instagram `https://www.instagram.com/4igrejabatista/`, YouTube `https://www.youtube.com/@4aibibetel864`.

---

# Plano admin master (em execucao)

Relatorio de gaps e roadmap completo do admin. Aprovado pelo usuario em 2026-05-01 com instrucao "fazer tudo, em paralelo, multi-sessao".

## Estado base do admin (antes deste plano)

- 4 dominios CRUD: Avisos, Programacao, Voluntarios, Oracao.
- Dashboard basico.
- **Faltam telas para 6 dominios ja existentes no banco**: `church_profile`, `ministries`, `recurring_meetings`, `content_audit_log`, `admin_users` (multi-admin), e nenhuma op em massa no `schedule_items`.
- Cenario alvo "adicionar 1 pregador novo e modificar agenda do ano" hoje exige edicao item por item.

## Status (atualizado 2026-05-01)

- **Fase 1**: ✅ COMPLETA — schema, core types, supabase adapter, 153 testes verdes, 100% cobertura.
- **Smoke test**: ✅ `npm run smoke` valida build + serve + GET das rotas.
- **Fase 2** (4 views novas): ✅ COMPLETA — Profile, Ministries, AuditLog, Team.
- **Fase 3** (4 views turbinadas): ✅ COMPLETA — Schedule (bulk + duplicar + date range), Announcements (status + expires + preview), Volunteers (campos novos + rename cascade + participation count), Prayers (WhatsApp + notas + assigned + seen).
- **Fase 4**: ✅ COMPLETA (exceto serie recorrente).
  - ✅ Dashboard com alertas acionaveis.
  - ✅ Site le do banco com fallback hardcoded.
  - ✅ Escala anual (grid datas × papeis com auto-distribuir + deteccao de conflito).
  - ✅ **Gerador de escalas por cadencia** — regras por voluntario (toda semana / 1x mes / 2x mes / 1x cada 2 meses / quinzenal / 1x trimestre + filtro de dia da semana). Gera assignments dentro do mesmo grid pra revisao antes de salvar.
  - ⏸ Serie recorrente (tabela `schedule_series` + criador de eventos repetidos) — pendente. **Provavelmente nao mais necessaria**: o gerador de cadencia resolve a maior parte do caso de uso. Reavaliar antes de implementar.
- **Fase 5**: ✅ COMPLETA (exceto notificacoes).
  - ✅ Botao "Ver no site" em ScheduleView e AnnouncementsView.
  - ✅ Autosave de rascunho em localStorage (form de novo evento/aviso).
  - ✅ Export CSV de pedidos de oracao.
  - ✅ Cmd-K busca global em todos os dominios.
  - ⏸ Notificacao ao chegar pedido novo — pendente, depende de decisao de canal (email/WhatsApp).

### Phase 1 stubs no adapter

- ✅ `revertAuditEntry` — agora via funcao Postgres `public.revert_audit_entry(uuid)` (SECURITY DEFINER, whitelist de tabelas, INSERT/UPDATE/DELETE reversal).
- ✅ `listAdmins` — agora via funcao Postgres `public.list_admins()` (JOIN com `auth.users` para email + display_name).
- ⏸ `inviteAdmin` — ainda throw com mensagem orientando a usar painel Auth + insert manual em `admin_users`. Edge function fica pra depois.

---

# Plano S+++ — Quality Maximization Roadmap

Auditoria de qualidade rodada em 2026-05-01. Notas atuais variam de **C (privacidade/LGPD)** a **A (type safety, arquitetura)**. Este plano endereca cada dimensao com fases concretas pra elevar o projeto inteiro ao topo absoluto.

## Notas atuais (baseline)

| Dimensao                  | Nota atual | Alvo         |
| ------------------------- | ---------- | ------------ |
| Type safety               | A          | A+           |
| Arquitetura (DI, camadas) | A−         | A+           |
| Banco / RLS / audit       | A          | A+           |
| CI/CD pipeline            | A          | A+           |
| Lint + formatting         | A          | A+           |
| Naming / convencoes       | A          | A+           |
| Imutabilidade             | A          | A+           |
| Acoplamento               | A−         | A+           |
| Camadas hexagonais        | A          | A+           |
| Performance               | B+         | A+           |
| Cobertura de testes       | B−         | A+           |
| Acessibilidade (WCAG)     | B          | A+ (AA real) |
| Coesao                    | B−         | A+           |
| Magic numbers             | B+         | A+           |
| Tamanho de arquivos       | B−         | A+           |
| Single Source of Truth    | B−         | A+           |
| Documentacao              | B          | A+           |
| Manutenibilidade          | B+         | A+           |
| Observabilidade           | B−         | A+           |
| YAGNI                     | B+         | A+           |
| KISS                      | B+         | A+           |
| SOLID — SRP               | B          | A+           |
| SOLID — ISP               | C+         | A+           |
| Tratamento de erros       | C+         | A+           |
| DRY                       | C+         | A+           |
| Privacidade / LGPD        | C          | A+           |

## Fase 6 — Refactor estrutural (DRY + SRP + ISP + Coesao)

**Objetivo**: zerar duplicacao identificada na auditoria, quebrar arquivos grandes, segregar interfaces. Alto impacto, baixo risco — refactors mecanicos.

### 6.1 Quebrar `apps/admin/src/utils.ts` (220 linhas misturando 6 responsabilidades)

- `apps/admin/src/lib/format.ts` — `formatScheduleDetail`, `formatDateTimeLabel`, `normalizeOptionalHttpUrl`, `isValidOptionalHttpUrl`.
- `apps/admin/src/lib/list-state.ts` — `ListState`, `ListView`, `INITIAL_LIST_STATE`, `paginateItems`, `matchesSearch`, `normalizeSearch`, `compareText`, `uniqueSorted`, `VisibleList`.
- `apps/admin/src/lib/sort-options.ts` — todos os `*_SORT_OPTIONS`.
- `apps/admin/src/lib/labels.ts` — `VOLUNTEER_ROLE_LABELS`, `ADMIN_ROLE_LABELS`, `WEEKDAY_LABELS`, `ANNOUNCEMENT_STATUS_OPTIONS`, derivar `STATUS_LABELS` daqui.
- `apps/admin/src/lib/limits.ts` — `TEXT_MAX`, `TEXTAREA_MAX`, `URL_MAX`, `PAGE_SIZE`.

### 6.2 Consolidar helpers de data e string no `core`

- Mover `formatDateTimeLabel` (admin/utils) → `core` como `formatDateTime`.
- Mover `formatExpirationLabel` (AnnouncementsView) → `core`.
- Mover `splitNames`/`splitCsv` (3 lugares) → `core` como `splitNames(value)`.
- Mover `buildWhatsAppForPrayer` (PrayersView local) → `core` como `buildWhatsAppForContact(contact, message?)`.
- Adicionar `getScheduleInRange(items, from, to)` no `core` para substituir filtros ad-hoc em DashboardView, VolunteersView, AnnualScheduleView.
- Manter cobertura 100% em `core` adicionando testes pros novos helpers.

### 6.3 Interface Segregation no `ContentRepository`

Hoje 1 interface com 27 metodos. Quebrar em sub-interfaces e o `ContentRepository` extends todas:

```ts
interface AnnouncementRepo {
  listAnnouncements();
  saveAnnouncement();
  deleteAnnouncement();
}
interface ScheduleRepo {
  listSchedule();
  saveScheduleItem();
  deleteScheduleItem();
  duplicateScheduleItem();
  bulkUpdateScheduleItems();
}
interface VolunteerRepo {
  listVolunteers();
  saveVolunteer();
  deleteVolunteer();
  renameVolunteer();
}
interface PrayerRepo {
  createPrayerRequest();
  listPrayerRequests();
  updatePrayerRequestStatus();
  updatePrayerRequest();
}
interface ProfileRepo {
  getProfile();
  saveProfile();
}
interface MinistryRepo {
  listMinistries();
  saveMinistry();
  deleteMinistry();
}
interface RecurringMeetingRepo {
  listRecurringMeetings();
  saveRecurringMeeting();
  deleteRecurringMeeting();
}
interface AdminRepo {
  listAdmins();
  inviteAdmin();
  updateAdminRole();
  removeAdmin();
}
interface AuditRepo {
  listAuditLog();
  revertAuditEntry();
}
interface SnapshotRepo {
  getSnapshot();
}

interface ContentRepository
  extends
    AnnouncementRepo,
    ScheduleRepo,
    VolunteerRepo,
    PrayerRepo,
    ProfileRepo,
    MinistryRepo,
    RecurringMeetingRepo,
    AdminRepo,
    AuditRepo,
    SnapshotRepo {}
```

Views passam a importar so as sub-interfaces que precisam. Refactor mecanico no adapter (ja implementa tudo).

### 6.4 Quebrar `AnnualScheduleView.tsx` (~860 linhas, 3 responsabilidades)

- `apps/admin/src/views/annual/AnnualScheduleView.tsx` (orquestrador, ~150 linhas).
- `apps/admin/src/views/annual/use-annual-schedule.ts` (hook custom: state pending, year, ministry filter, save batch).
- `apps/admin/src/views/annual/AnnualGrid.tsx` (tabela + edicao inline de cell).
- `apps/admin/src/views/annual/AnnualAutoDistribute.tsx` (panel auto-distribuir).
- `apps/admin/src/views/annual/AnnualGenerator.tsx` (panel gerador de cadencia).
- `apps/admin/src/views/annual/cadence.ts` (algoritmo `pickByCadence` + `generateAssignments` puros, testaveis).
- Adicionar testes unitarios pra `cadence.ts` (puro, facil).

### 6.5 Single Source of Truth: derivar labels de options

Padrao repetido em 4 lugares (`STATUS_LABELS`, `ROLE_LABELS`, etc). Consolidar:

```ts
export const ANNOUNCEMENT_STATUS_OPTIONS = [
  { value: "draft", label: "Rascunho" },
  { value: "scheduled", label: "Agendado" },
  { value: "published", label: "Publicado" },
  { value: "archived", label: "Arquivado" }
] as const;

export const ANNOUNCEMENT_STATUS_LABELS = Object.fromEntries(
  ANNOUNCEMENT_STATUS_OPTIONS.map((o) => [o.value, o.label])
) as Record<AnnouncementStatus, string>;
```

Aplicar pra: prayer status, volunteer role, admin role, audit action.

## Fase 7 — Cobertura de testes (B− → A+)

**Objetivo**: sair de "100% em packages, ~10 tests por app" pra "100% em packages, 80%+ em apps com gate no CI".

### 7.1 Tests unitarios nas views novas (zero hoje)

- `ProfileView.test.tsx` — render basico + submit do form de perfil + add recurring meeting.
- `MinistriesView.test.tsx` — render + reorder + slug-on-edit lock.
- `AuditLogView.test.tsx` — render + filter changes + revert error path.
- `TeamView.test.tsx` — render + invite stub error inline.
- `DashboardView.test.tsx` — render com snapshot vazio + cards calculados.
- `AnnualScheduleView.test.tsx` — render grid + auto-distribute + cadence generator.
- `CommandPalette.test.tsx` — open/close via keyboard, search filter, navigate on Enter.

### 7.2 Tests unitarios nos hooks customizados

- `useFormAutosave` — restore + persist + clear.
- `use-annual-schedule` (apos quebrar) — state transitions.

### 7.3 Tests de integracao das views turbinadas

- ScheduleView: bulk edit flow (selecionar → mudar pregador → salvar → invalida snapshot).
- AnnouncementsView: filter por status + preview atualiza.
- VolunteersView: rename cascade confirm + count atualiza.
- PrayersView: WhatsApp button + mark as seen + assignedTo change.

### 7.4 Coverage gate em apps

- Subir gradual: comecar em 70%, 80%, 90% conforme cobertura cresce.
- Gate no CI tanto pro `apps/admin` quanto `apps/site`.

### 7.5 Visual regression (futuro)

- Storybook com 1 story por componente UI.
- Chromatic ou similar pra catch de regressao visual.
- Backlog — nao prioridade imediata.

## Fase 8 — Resiliencia & Observabilidade (C+/B− → A+)

### 8.1 Error Boundaries

- `<ErrorBoundary>` global no admin shell e site shell.
- Boundary por view (com fallback dedicado: "Tela falhou. [Recarregar]").
- Sentry captura automatica via `@sentry/react`.
- Login screen com boundary separado pra nao deslogar em erro.

### 8.2 Sentry alerts e contexto

- User context (uid + email + role) no Sentry quando logado.
- Breadcrumbs em mutations (qual entidade, qual operacao).
- Regras de alerta:
  - `errors > 5 em 1h` → Slack/email.
  - `prayer_request POST falhou` → notify admin imediato.
  - `bulkUpdate falhou` → critical.
- Dashboards: error rate por view, error rate por mutation.

### 8.3 Retry adaptativo

- Mutations criticas (`saveProfile`, `bulkUpdate`) com retry 2x exponential backoff.
- Reads ja tem 1 retry default — manter.
- Idempotency keys em mutations destrutivas.

### 8.4 Health check + structured logs

- Endpoint `GET /api/health` (Cloudflare Function) verifica DB conn.
- Logs estruturados via `console.log({ level, msg, ctx })` JSON com Sentry capture.

### 8.5 Offline support (PWA gradual)

- Service worker pra cache de assets (Workbox via Vite plugin).
- IndexedDB cache pro `getSnapshot` ler offline (read-only).
- "Voce esta offline" banner.
- Mutations enfileiradas e replay quando voltar online.
- **Backlog** — feature opcional, nao bloqueia A+.

## Fase 9 — Acessibilidade WCAG AA → AAA

### 9.1 Focus management completo

- Focus trap real no `CommandPalette` (focus circular Tab/Shift+Tab).
- Focus trap nos modais de bulk action.
- Restore focus no trigger ao fechar modal.

### 9.2 ARIA roles e states

- `role="status"` em alerts do dashboard.
- `aria-live="polite"` em toasts/notifications.
- `aria-activedescendant` em todos os autocomplete custom (substitui o atual baseado em CSS).
- `aria-describedby` em forms para dicas de validacao.
- `aria-busy` em botoes durante saving.

### 9.3 Keyboard navigation

- Skip links em todas as paginas (admin views ja tem — site agenda nem todas).
- Atalho `?` mostra modal de keyboard shortcuts.
- Tab order revisado em todas as views.

### 9.4 Color contrast audit

- Rodar axe-core ou Lighthouse a11y em todas as views.
- Tokens CSS (--accent-bronze, etc) verificados pra AA contra todos os fundos.
- Modo high-contrast opcional.

### 9.5 Reduced motion + screen reader

- `@media (prefers-reduced-motion)` em animacoes (gallery scroll, transicoes).
- Testar com NVDA/VoiceOver — corrigir o que aparecer.
- Lang attribute correto em todo HTML lang nested.

### 9.6 CI gate

- Adicionar axe-core ao CI: roda contra build, falha em violations criticas.

## Fase 10 — Performance (B+ → A+, Lighthouse 100)

### 10.1 Bundle analysis

- `vite-plugin-visualizer` pra mapear o que esta no bundle.
- Identificar heavy deps; substituir onde possivel.

### 10.2 Trocar zod (95KB chunk) por valibot ou arktype

- valibot ~10KB, API similar, suporta todos os schemas do projeto.
- Migracao mecanica: `z.object({...})` → `v.object({...})`.
- Reduz bundle em ~85KB.

### 10.3 Code splitting estrategico

- Cada view `React.lazy` ja existe ✅.
- Splittar `AnnualScheduleView` em chunks por painel (Auto/Generator separados).
- Prefetch on hover dos NavButtons (Quicklink-style).

### 10.4 Image optimization

- WebP/AVIF para gallery e logo via `vite-plugin-image`.
- Responsive `srcset` em imagens de eventos.
- Lazy loading nativo `<img loading="lazy">`.

### 10.5 Database queries

- Audit de N+1: revisar `getSnapshot` (6 queries em paralelo OK, mas conferir cada lista).
- Adicionar `select=specific_columns` em vez de `select=*` onde nao precisa de tudo.
- Considerar Materialized View pra `getSnapshot` (refresh a cada minuto).

### 10.6 Performance budget no CI

- Lighthouse CI no PR: falha se LCP > 2.5s ou bundle > 500KB.

### 10.7 Edge caching

- Cloudflare Pages ja faz, mas revisar `_headers` cache rules:
  - HTML: `max-age=0, must-revalidate` ✅ ja.
  - Assets fingerprintados: `max-age=31536000, immutable` ✅ ja.
- Adicionar `Vary: Accept-Encoding`.

## Fase 11 — Privacidade / LGPD compliance (C → A+)

### 11.1 Politica de privacidade publica

- Pagina `/politica-privacidade` no site.
- Texto cobrindo: dados coletados, finalidade, base legal (Art. 7 + 11), tempo de retencao, direitos do titular.
- Link no footer + no formulario de oracao.

### 11.2 Consentimento explicito

- Form de oracao: checkbox obrigatorio "Concordo com a politica de privacidade" antes do submit.
- Texto micro-copy: "Seus dados sao usados so pra atender sua intencao de oracao. Lideranca da igreja sera a unica a ver."

### 11.3 Retencao automatica em `prayer_requests`

- Function Postgres `purge_old_prayers()` que arquiva (status=archived) ou deleta requests com `status=concluido AND updated_at < now() - 18 months`.
- Schedule via Supabase pg_cron (mensal).

### 11.4 Opt-in pra exposicao publica de voluntarios

- Coluna `volunteers.public_display boolean default false`.
- Site so mostra voluntarios com `public_display = true`.
- Admin precisa marcar explicitamente apos consentimento documentado.
- Migrar voluntarios existentes pra `false` (default-deny).

### 11.5 Direito de exclusao + portabilidade

- Pagina/rota `/meus-dados` com form: "Digite seu email e nome".
- Sistema busca em `prayer_requests` e envia email com tudo que tem (Art. 18 LGPD).
- Botao "Solicitar exclusao" → cria ticket pro admin processar manualmente.
- (Solucao escalavel depois — manual ja atende um igreja pequena.)

### 11.6 Cookie consent (se algum dia adicionar tracking)

- Hoje sem GA/Pixel, sem cookies trackers. Banner so se isso mudar.

### 11.7 Audit log retention

- Audit log fica eternamente hoje. Definir retencao 24 meses (compliance + custo).

## Fase 12 — Documentacao (B → A+)

### 12.1 README.md atualizado

- O que e o projeto (1 paragrafo).
- Setup local (clone → npm install → .env → npm run dev).
- Estrutura do monorepo.
- Como deployar.
- Como rodar tests.
- Link pro CLAUDE.md (este).

### 12.2 ADRs (Architecture Decision Records)

- `docs/adr/0001-hexagonal-architecture.md`
- `docs/adr/0002-supabase-as-backend.md`
- `docs/adr/0003-tanstack-query-state.md`
- `docs/adr/0004-100-percent-coverage-gate.md`
- `docs/adr/0005-bronze-on-navy-palette.md`
- Cada ADR: Context, Decision, Consequences, Alternatives considered.

### 12.3 JSDoc nos exports publicos do `core`

- Cada tipo + funcao com 1-2 linhas.
- `tsdoc` plugin no eslint pra forcar.

### 12.4 Storybook (futuro)

- 1 story por componente UI.
- Backlog — nice-to-have.

### 12.5 Diagrama C4

- Context (sistema 4ibib + atores).
- Container (apps + Supabase + Cloudflare).
- Component (camadas dentro do admin).
- Em PNG ou Mermaid no `docs/architecture.md`.

### 12.6 Onboarding guide

- `docs/onboarding.md`: como contribuir, setup, padroes, links.

## Fase 13 — Tooling & CI/CD (A → A+)

### 13.1 Security scanning no CI

- `npm audit --audit-level=high` na pipeline.
- Snyk ou Socket.dev integration.
- Dependabot ativo (semanal, agrupado).

### 13.2 License compliance

- `license-checker-rseidelsohn` no CI: bloqueia GPL/AGPL.

### 13.3 Conventional commits enforcement

- Husky + commitlint pra validar mensagens de commit.

### 13.4 Auto deploy preview por PR

- Cloudflare Pages ja faz preview branches automaticamente — confirmar que esta ativo.
- Comentario automatico no PR com link.

### 13.5 Performance budget

- Lighthouse CI ou Bundlesize: falha o PR se passar limite.

### 13.6 Semantic versioning + changelog

- `release-please` (Google) ou `semantic-release` gera changelog + tags automaticos baseado em conventional commits.

### 13.7 Status badges no README

- CI status, coverage, bundle size, license.

## Fase 14 — Seguranca hardening (A− → A+)

### 14.1 Rotacionar service_role JWT (#23 do backlog)

- Manual no painel Supabase.
- Atualizar README com checklist de setup.
- Documentar processo de rotacao periodica.

### 14.2 Headers de seguranca complementares

Adicionar a `dist/_headers`:

- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- Submeter ao HSTS preload list.

### 14.3 Audit log de logins

- Trigger Supabase em `auth.users` que loga em `content_audit_log` na tabela `auth_logins`.
- Detectar logins suspeitos (geolocation diferente, horario incomum).

### 14.4 2FA opcional pra admins

- Habilitar Supabase Auth MFA.
- UI no admin: "Configurar 2FA".
- Forcar pra owners apos N dias.

### 14.5 Edge function pra `inviteAdmin`

- Cloudflare Pages Function ou Supabase Edge Function.
- Recebe email + role, valida is_admin do caller, chama `auth.admin.inviteUserByEmail`.
- Substitui o stub atual.

### 14.6 Rate limit no admin

- Implementar mesma logica de Turnstile + rate-limit em mutations sensiveis (delete, bulk).
- Detecta brute force / abuso.

### 14.7 CORS strict

- Verificar configuracao Supabase: so aceitar origin do site oficial + Cloudflare preview.

### 14.8 SQL injection audit

- Function `revert_audit_entry` ja usa `format()` + `%I` ✅.
- Revisar todas as funcoes Postgres pra garantir.

### 14.9 Secrets scanning

- `gitleaks` ou `trufflehog` no pre-commit + CI.
- Detecta segredos commitados acidentalmente.

## Fase 15 — UX premium (B+ → A+)

### 15.1 Toast notifications

- Library leve: `sonner` ou implementacao propria minimal.
- Substituir `alert()`/`window.confirm` em casos non-destructive por toast com action.
- "Aviso salvo. [Ver no site]" / "Voluntario excluido. [Desfazer]".

### 15.2 Loading skeletons

- Substituir `LoaderCircle` por skeleton rows pra cada view CRUD.
- Reduz layout shift, percepcao de performance melhora.

### 15.3 Undo banners

- Em deletes (10 segundos): "Excluido. [Desfazer]".
- Implementar via mutation otimista + restore se desfeito.

### 15.4 Confirmacao moderna

- Substituir `window.confirm()` por modal `<dialog>` com mensagem rica + acao destacada.

### 15.5 Drag-and-drop em reorder

- Hoje setas ↑↓ em MinistriesView. Adicionar drag via `@dnd-kit/core` (leve).
- Aplicar tambem em RecurringMeetings + (eventualmente) AnnualSchedule cells.

### 15.6 Dark mode toggle (opcional)

- CSS custom properties ja preparam.
- Toggle no header + persiste em localStorage.
- Detecta `prefers-color-scheme` por padrao.

### 15.7 Microcopy review

- Mensagens de erro humanizadas: "Email ja cadastrado" → "Esse email ja esta na sua equipe."
- Empty states criativos: "Nenhum aviso ainda. Que tal criar o primeiro?".

### 15.8 Animacoes sutis

- Transicoes de view via `view-transition` API quando suportado.
- Fade in/out em modais (200ms).
- Respeitar `prefers-reduced-motion`.

## Sequenciamento sugerido

**Wave 1 (alto ROI, baixo risco)**: Fases 6 (refactor) + 7 (testes).
**Wave 2 (qualidade percebida)**: Fases 8 (resiliencia) + 9 (a11y) + 15 (UX).
**Wave 3 (compliance + performance)**: Fases 10 (perf) + 11 (LGPD).
**Wave 4 (operacional)**: Fases 12 (docs) + 13 (tooling) + 14 (security).

Cada Wave = 2-3 sessoes. Total: ~10-12 sessoes pra atingir A+ em todas as 25 dimensoes.

## Como medir A+

- Lint clean, typecheck clean em todos os workspaces.
- Coverage 100% em packages, 90%+ em apps.
- Lighthouse score 100 em performance + a11y + best practices + SEO.
- axe-core sem violations criticas.
- Sentry sem error rate aberto.
- LGPD: privacy policy publicada + opt-in voluntarios + retencao automatica.
- ADRs documentados (>= 5).
- Bundle admin gzipped < 100KB.
- README + onboarding completos.

---

## Fase 1 — Fundacoes (sequencial, BLOQUEIA fases seguintes)

Schema + tipos do core + adapter Supabase.

### 1.1 Schema (`supabase/schema.sql`)

- `announcements`: adicionar `status` enum (`draft|scheduled|published|archived`), `expires_at timestamptz null`, `image_url text default ''`.
- `schedule_items`: adicionar `series_id uuid null` (sem FK por enquanto; serie sera tabela separada na Fase 4).
- `prayer_requests`: adicionar `pastoral_notes text default ''`, `assigned_to uuid null references admin_users(user_id)`, `seen_at timestamptz null`.
- `volunteers`: adicionar `contact text default ''`, `photo_url text default ''`, `ministries text[] default '{}'`, `unavailable_dates date[] default '{}'`, `notes text default ''`.
- Nova tabela `church_profile` singleton (`id text primary key default 'main' check (id='main')` + campos: name, short_name, tagline, city, pastor_name, address, email, whatsapp, instagram_url, youtube_url, maps_url, hero_verse, mission, updated_at).
- Nova tabela `ministries` (`id, slug unique, name, summary, meeting_time, contact, color, sort_order`).
- Nova tabela `recurring_meetings` (`id, profile_id default 'main', title, weekday smallint check 0-6, starts_at time, ends_at time check >, description, sort_order`).
- Audit triggers nas tabelas novas.
- RLS: leitura publica em `church_profile`, `ministries`, `recurring_meetings`. Escrita admin only.
- Indices nas FKs e em `prayer_requests.assigned_to`.

### 1.2 Tipos no `packages/core/src/index.ts`

- Estender `Announcement` com `status`, `expiresAt`, `imageUrl`.
- Estender `ScheduleItem` com `seriesId`.
- Estender `Volunteer` com `contact`, `photoUrl`, `ministries`, `unavailableDates`, `notes`.
- Estender `PrayerRequest` com `pastoralNotes`, `assignedTo`, `seenAt`.
- Novos tipos: `ChurchProfile`, `MinistryRecord`, `RecurringMeetingRecord`, `AdminUser`, `AuditLogEntry`, `AnnouncementStatus`.
- `SiteSnapshot` ganha `profile`, `ministries`, `recurringMeetings`.
- `ContentRepository` ganha:
  - `getProfile()` / `saveProfile(input)`
  - `listMinistries()` / `saveMinistry(input)` / `deleteMinistry(id)`
  - `listRecurringMeetings()` / `saveRecurringMeeting(input)` / `deleteRecurringMeeting(id)`
  - `listAdmins()` / `inviteAdmin(email, role)` / `updateAdminRole(id, role)` / `removeAdmin(id)`
  - `listAuditLog(filter)` / `revertAuditEntry(id)`
  - `bulkUpdateScheduleItems(ids, patch)` / `duplicateScheduleItem(id)`
  - `updatePrayerRequest(id, patch)`
  - `renameVolunteer(id, newName, cascade?)` (find/replace nos schedule_items)

### 1.3 Adapter Supabase (`packages/supabase/src/index.ts` + tests)

- Implementar todos os novos metodos do `ContentRepository`.
- Snake_case <-> camelCase mapping.
- 100% coverage no test suite.

## Fase 2 — Views novas (paralelo, 4 frentes)

Cada uma em arquivo proprio. Pode rodar em paralelo apos Fase 1.

- `apps/admin/src/views/ProfileView.tsx` — perfil da igreja + recurring_meetings (mini-CRUD inline).
- `apps/admin/src/views/MinistriesView.tsx` — CRUD ministerios + drag-drop sort_order.
- `apps/admin/src/views/AuditLogView.tsx` — listagem + filtros + botao "Reverter".
- `apps/admin/src/views/TeamView.tsx` — multi-admin (apenas owner ve).

## Fase 3 — Views existentes turbinadas (paralelo, 4 frentes)

- `ScheduleView`: bulk edit (checkboxes + barra de acao), botao duplicar, filtro de data range.
- `AnnouncementsView`: status (draft/scheduled/published/archived), expires_at, preview ao vivo.
- `VolunteersView`: campos novos (contato/foto/ministerios/indisponibilidade/notas), find/replace ao renomear.
- `PrayersView`: botao WhatsApp (`buildWhatsAppUrl`), notas pastorais, assigned_to, marca seen_at ao abrir.

## Fase 4 — Features grandes (sequencial, 1 por sessao)

- **Escala anual**: grid datas × papeis com auto-distribuir e validacao de conflito.
- **Serie recorrente**: criador (semanal/quinzenal/mensal) + tabela `schedule_series` + edicao de serie inteira.
- **Dashboard com alertas acionaveis**: pedidos sem resposta, cultos sem pregador, voluntario mais escalado, aviso fixado expirado.
- **Site le do banco** em vez de `church.ts` hardcoded (migracao gradual com fallback).

## Fase 5 — Cross-cutting

- Cmd-K busca global em todos os dominios.
- Autosave de rascunho em localStorage por entidade em edicao.
- Notificacao (email/WhatsApp) ao chegar pedido de oracao novo.
- Botao "Ver no site" em cada item.
- Export CSV de pedidos de oracao por periodo.

---

# Backlog aberto (itens nao cobertos pelo plano admin)

## Schema/banco

- [ ] **#23** Rotacionar/desabilitar legacy service_role JWT no Supabase (manual no painel).

## Funcionalidades extra (fora do admin)

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

---

# Notas de operacao

- **Branch principal**: `main`.
- **Commits**: criar so quando o usuario pedir.
- **Cobertura**: gate 100% em `core` e `supabase`. Quebrar = test fail.
- **Antes de instalar deps via apt/sudo**: pedir; sandbox geralmente bloqueia rede.
- **Memoria**: o usuario tem `feedback_no_assumptions` ativa — em ambiguidade real, pergunta direta antes de chutar.
