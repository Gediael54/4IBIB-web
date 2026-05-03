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

## Fase 6 — Refactor estrutural (DRY + SRP + ISP + Coesao) ✅ COMPLETA

**Objetivo**: zerar duplicacao identificada na auditoria, quebrar arquivos grandes, segregar interfaces.

### 6.1 Quebrar `apps/admin/src/utils.ts` (220 linhas misturando 6 responsabilidades)

- `apps/admin/src/lib/format.ts`
- `apps/admin/src/lib/list-state.ts`
- `apps/admin/src/lib/sort-options.ts`
- `apps/admin/src/lib/labels.ts`
- `apps/admin/src/lib/limits.ts`

### 6.2 Consolidar helpers de data e string no `core`

- `formatDateTime`, `formatDateOnly`, `splitNames`, `buildWhatsAppForContact`, `getScheduleInRange` movidos pro `core`.
- 100% coverage.

### 6.3 Interface Segregation no `ContentRepository`

Quebrado em 10 sub-interfaces: `AnnouncementRepo`, `ScheduleRepo`, `VolunteerRepo`, `PrayerRepo`, `ProfileRepo`, `MinistryRepo`, `RecurringMeetingRepo`, `AdminRepo`, `AuditRepo`, `SnapshotRepo`. `ContentRepository` extends todas.

### 6.4 Quebrar `AnnualScheduleView.tsx` (~860 linhas)

- `views/annual/AnnualScheduleView.tsx` (orquestrador)
- `views/annual/use-annual-schedule.ts` (hook)
- `views/annual/AnnualGrid.tsx`
- `views/annual/AnnualAutoDistribute.tsx`
- `views/annual/AnnualGenerator.tsx`
- `views/annual/cadence.ts` (puro, testavel)

### 6.5 Single Source of Truth: derivar labels de options

`labelsFromOptions<TValue, TExclude>` helper. Aplicado em prayer status, volunteer role, admin role, audit action.

## Fase 7 — Cobertura de testes (B− → A+)

### 7.1 Tests unitarios nas views novas (zero hoje)

- `ProfileView.test.tsx`, `MinistriesView.test.tsx`, `AuditLogView.test.tsx`, `TeamView.test.tsx`, `DashboardView.test.tsx`, `AnnualScheduleView.test.tsx`, `CommandPalette.test.tsx`.

### 7.2 Tests unitarios nos hooks customizados

- `useFormAutosave`, `use-annual-schedule`.

### 7.3 Tests de integracao das views turbinadas

- ScheduleView bulk edit, AnnouncementsView filter+preview, VolunteersView rename cascade, PrayersView WhatsApp+seen+assigned.

### 7.4 Coverage gate em apps

- Subir gradual: 70% → 80% → 90%.

### 7.5 Visual regression (futuro)

- Storybook + Chromatic. Backlog.

## Fase 8 — Resiliencia & Observabilidade (C+/B− → A+)

### 8.1 Error Boundaries

- Global + por view. Sentry captura via `@sentry/react`. Login screen com boundary separado.

### 8.2 Sentry alerts e contexto

- User context (uid + email + role) quando logado. Breadcrumbs em mutations. Regras de alerta + dashboards.

### 8.3 Retry adaptativo ✅ 2026-05-03

- Mutations criticas (`saveAnnouncement`, `saveScheduleItem`, `saveVolunteer`, `saveMinistry`, `saveMember`, `saveHousehold`) com retry 2x exponential backoff (1s → 2s, capped 5s). Erros 4xx nao retentam.
- Idempotency keys: nao necessario por agora (mutations Supabase usam upsert/update unico). Documentado.

### 8.4 Health check + structured logs ✅ 2026-05-03

- `GET /api/health` (Cloudflare Function) checa env + Supabase REST. Retorna 200/503 com payload JSON.
- Login alert estruturado em `/api/login-alert` (console.log + Resend opcional).

### 8.5 Offline support (PWA gradual) — backlog

- Service worker, IndexedDB cache, banner offline, mutations enfileiradas.

## Fase 9 — Acessibilidade WCAG AA → AAA

### 9.1 Focus management completo

- Focus trap real em CommandPalette + modais de bulk action. Restore focus no trigger.

### 9.2 ARIA roles e states

- `role="status"`, `aria-live="polite"`, `aria-activedescendant`, `aria-describedby`, `aria-busy`.

### 9.3 Keyboard navigation

- Skip links em todas as paginas. Atalho `?` mostra modal de shortcuts. Tab order revisado.

### 9.4 Color contrast audit

- axe-core ou Lighthouse. Tokens verificados pra AA. Modo high-contrast opcional.

### 9.5 Reduced motion + screen reader

- `prefers-reduced-motion` em animacoes. Testar com NVDA/VoiceOver. Lang attribute correto.

### 9.6 CI gate

- axe-core falha PR em violations criticas.

## Fase 10 — Performance (B+ → A+, Lighthouse 100)

### 10.1 Bundle analysis

- `vite-plugin-visualizer`.

### 10.2 Trocar zod (~95KB) por valibot ou arktype (~10KB)

- Migracao mecanica.

### 10.3 Code splitting estrategico

- Splittar AnnualScheduleView por painel. Prefetch on hover.

### 10.4 Image optimization

- WebP/AVIF via `vite-plugin-image`. `srcset`. `loading="lazy"`.

### 10.5 Database queries

- Audit N+1 em `getSnapshot`. `select=specific_columns`. Materialized View opcional.

### 10.6 Performance budget no CI

- Lighthouse CI: falha se LCP > 2.5s ou bundle > 500KB.

### 10.7 Edge caching

- `_headers` cache rules ja OK. Adicionar `Vary: Accept-Encoding`.

## Fase 11 — Privacidade / LGPD compliance (C → A+)

### 11.1 Politica de privacidade publica

- Pagina `/politica-privacidade` cobrindo: dados coletados, finalidade, base legal (Art. 7 + 11), retencao, direitos.

### 11.2 Consentimento explicito

- Form de oracao: checkbox obrigatorio + micro-copy.

### 11.3 Retencao automatica em `prayer_requests` ✅ 2026-05-03

- Function `purge_old_prayers()` arquiva/deleta apos 18 meses concluido (entregue na Sessao 1).
- Schedule via pg_cron documentado em `supabase/cron.sql` (rodar uma vez no SQL Editor).

### 11.4 Opt-in pra exposicao publica de voluntarios

- `volunteers.public_display boolean default false`. Default-deny.

### 11.5 Direito de exclusao + portabilidade

- Pagina `/meus-dados`. Manual no inicio (igreja pequena), escalavel depois.

### 11.6 Cookie consent

- Sem tracking hoje. Banner so se isso mudar.

### 11.7 Audit log retention

- 24 meses.

## Fase 12 — Documentacao (B → A+)

### 12.1 README.md atualizado

- O que e, setup local, estrutura, deploy, tests, link pro CLAUDE.md.

### 12.2 ADRs

- `docs/adr/0001-hexagonal-architecture.md` ate `0005-bronze-on-navy-palette.md`. Cada um com Context/Decision/Consequences/Alternatives.

### 12.3 JSDoc nos exports do `core`

- `tsdoc` plugin no eslint.

### 12.4 Storybook (futuro)

- Backlog.

### 12.5 Diagrama C4

- Context, Container, Component em PNG ou Mermaid.

### 12.6 Onboarding guide ✅ 2026-05-03

- `docs/onboarding.md` cobrindo pre-reqs, setup em 4 passos, troubleshooting comum, links.

## Fase 13 — Tooling & CI/CD (A → A+)

### 13.1 Security scanning

- `npm audit`, Snyk/Socket.dev, Dependabot.

### 13.2 License compliance

- `license-checker-rseidelsohn`. Bloqueia GPL/AGPL.

### 13.3 Conventional commits enforcement

- Husky + commitlint.

### 13.4 Auto deploy preview por PR

- Cloudflare Pages ja faz. Confirmar + comentario automatico.

### 13.5 Performance budget

- Lighthouse CI ou Bundlesize.

### 13.6 Semantic versioning + changelog

- `release-please` ou `semantic-release`.

### 13.7 Status badges no README

- CI, coverage, bundle size, license.

## Fase 14 — Seguranca hardening (A− → A+)

### 14.1 Rotacionar service_role JWT (#23)

- Manual no painel Supabase. Documentar no README.

### 14.2 Headers de seguranca complementares ✅ 2026-05-03

- `_headers` (gerado por `scripts/compose-dist.mjs`) inclui: `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`, `X-XSS-Protection: 0`. `/admin/*` ganha `X-Robots-Tag: noindex, nofollow`.

### 14.3 Audit log de logins ✅ 2026-05-03 (parcial)

- `/api/login-alert` (Cloudflare Function) recebe evento de SIGNED_IN e logga estruturado. Resend opcional via `RESEND_API_KEY` + `LOGIN_ALERT_TO`. Trigger Supabase em `auth.users` ainda backlog.

### 14.4 2FA opcional pra admins

- Habilitar Supabase Auth MFA.

### 14.5 Edge function pra `inviteAdmin`

- Cloudflare Pages Function ou Supabase Edge Function.

### 14.6 Rate limit no admin ✅ 2026-05-03 (parcial)

- Login admin protegido por Cloudflare Turnstile (`/api/admin-login-verify`). Rate limit nas demais mutations sensiveis: backlog.

### 14.7 CORS strict

- Verificar config Supabase.

### 14.8 SQL injection audit

- Revisar funcoes Postgres.

### 14.9 Secrets scanning

- `gitleaks` ou `trufflehog` no pre-commit + CI.

## Fase 15 — UX premium (B+ → A+)

### 15.1 Toast notifications

- `sonner` ou implementacao propria. Substituir `alert()`/`confirm()` non-destructive.

### 15.2 Loading skeletons

- Skeleton rows substituem `LoaderCircle`.

### 15.3 Undo banners

- 10s "Excluido. [Desfazer]". Mutation otimista + restore.

### 15.4 Confirmacao moderna

- Modal `<dialog>` rich substitui `window.confirm()`.

### 15.5 Drag-and-drop em reorder

- `@dnd-kit/core` em MinistriesView, RecurringMeetings, AnnualSchedule.

### 15.6 Dark mode toggle

- ✅ Implementado na Fase 16 Wave 1.

### 15.7 Microcopy review

- Mensagens humanizadas. Empty states criativos.

### 15.8 Animacoes sutis

- `view-transition` API. Fade in/out 200ms. Respeitar `prefers-reduced-motion`.

## Sequenciamento sugerido

**Wave 1 (alto ROI, baixo risco)**: Fases 6 + 7.
**Wave 2 (qualidade percebida)**: Fases 8 + 9 + 15.
**Wave 3 (compliance + performance)**: Fases 10 + 11.
**Wave 4 (operacional)**: Fases 12 + 13 + 14.

Cada Wave = 2-3 sessoes. Total: ~10-12 sessoes.

## Como medir A+

- Lint clean, typecheck clean.
- Coverage 100% em packages, 90%+ em apps.
- Lighthouse 100 em performance + a11y + best practices + SEO.
- axe-core sem violations criticas.
- Sentry sem error rate aberto.
- LGPD: privacy policy + opt-in voluntarios + retencao automatica.
- ADRs (>= 5).
- Bundle admin gzipped < 100KB.
- README + onboarding completos.
