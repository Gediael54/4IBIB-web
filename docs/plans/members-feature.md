# Feature membros + LGPD + hardening

Roadmap da feature grande iniciada em 2026-05-03: cadastro de membros que substitui voluntarios, vinculo familiar, dedup, hardening contra invasao, conclusao de LGPD.

## Status global (atualizado 2026-05-03)

- **Sessao 1** — Schema + tipos core + adapter Supabase: ✅ COMPLETA. 368 tests, 100% cobertura packages.
- **Sessao 2** — UI MembersView + HouseholdsView + dedup + refactor Schedule/Volunteers: ✅ COMPLETA.
- **Sessao 3** — ConfirmDialog + headers + Turnstile login + retry + health + cron + microcopy: ✅ COMPLETA.
- **Tests Members/Households**: ✅ COMPLETA. 407 tests total.
- **Undo banner integration**: ⏸ PENDENTE — adapter ainda usa DELETE direto, precisa migrar pra archive\_\*.

## Decisoes confirmadas pelo usuario

- Visitantes NAO entram no cadastro. Status enum: `ativo|inativo|transferido|falecido`.
- Membros NAO logam admin. Login continua via `admin_users` separado.
- ScheduleItem ganha `preacher_member_id`/`director_member_id`/`sound_member_id` (FK opcionais). Strings preacher/director/sound_team mantidas como cache historico.
- Voluntarios viram `members.is_volunteer=true` + `volunteer_ministries[]` etc. Tabela legacy `volunteers` virou VIEW read-only sobre members.
- Familia: `households` (lar) + `member_relationships` (vinculo entre 2 membros, com `start_date`/`end_date` para historico de divorcio/falecimento).
- `notes` pastorais visivel pra todo admin (role `pastor` separada e backlog).
- Soft delete em `members`, `announcements`, `schedule_items`, `prayer_requests`, `ministries`. RLS bloqueia DELETE direto. Mutations via RPCs `archive_*`/`restore_*` (SECURITY DEFINER).
- Rate limit por `admin_users.user_id` (30 mutations destrutivas/min).
- 2FA opcional (UI nao forca; usuario habilita via Supabase Auth quando quiser).
- Dedup: bloqueia submit em score >= 0.85 (cpf/email/phone match), alerta em score 0.5-0.85.
- WhatsApp: sempre formato BR (`buildWhatsAppUrl` forca prefixo `55`).
- Dados de saude (allergies/medical_notes): consent explicito separado em `consent_medical_data_at` (LGPD Art.11).

## Sessao 1 — schema + core + adapter (completo)

### Schema (`supabase/schema.sql`, +650 linhas)

- Novas tabelas: `members`, `households`, `member_relationships`, `admin_rate_limit_buckets`.
- Soft delete (`deleted_at`) em members/announcements/schedule_items/prayer_requests/ministries/households.
- 5 enums novos: `marital_status`, `gender`, `membership_status`, `church_role`, `relationship_type`.
- 15 RPCs SECURITY DEFINER: `archive_*`/`restore_*` (5 pares), `find_member_duplicates`, `purge_old_prayers`, `check_admin_rate_limit`, `anonymize_member`.
- Extension `pg_trgm` habilitada (similarity em find_member_duplicates).
- View `volunteers` legada (read-only filter de members).
- Audit triggers em members/households/member_relationships.
- RLS: members SELECT publico se `public_directory=true and deleted_at is null`. DELETE deny em todas tabelas com soft delete. Bucket de rate limit so via SECURITY DEFINER.
- **Backup-restore de admin_users** dentro da transacao do schema — preserva owners ao re-aplicar.

### Tipos no core (`packages/core/src/index.ts`, +159 linhas)

- `Member`, `Household`, `MemberRelationship`, `MemberDuplicateMatch`, `Address`.
- 5 enum types correspondentes.
- Sub-interfaces `MemberRepo`, `HouseholdRepo`, `RelationshipRepo` no `ContentRepository`.
- `ScheduleItem` ganhou `preacherMemberId`/`directorMemberId`/`soundMemberId` (opcionais, retrocompat).
- `ScheduleRepo.updateScheduleItemMembers`.

### Adapter (`packages/supabase/src/index.ts`, +452 linhas, +49 tests)

- 18 metodos novos cobrindo CRUD members/households/relationships.
- `listVolunteers` continua lendo da view (zero mudanca cliente).
- Mappers `mapMember`/`mapHousehold`/`mapRelationship`/`mapDuplicateMatch`.

### Seed (`scripts/seed-from-xlsx.mjs`)

- Refatorado pra gerar inserts em `members` ao inves de `volunteers`.
- `schedule_items` populam `preacher_member_id`/`director_member_id`/`sound_member_id` via lookup pelo `full_name`.

## Sessao 2 — UI admin (completo)

### Views novas

- `apps/admin/src/views/MembersView.tsx` (1186 linhas): 8 tabs (Identidade, Contato, Familia, Igreja, Voluntariado, Profissional, Saude, LGPD), dedup inline e bloqueante, RelationshipsPanel modal, mode="update" para enriquecimento progressivo.
- `apps/admin/src/views/HouseholdsView.tsx` (277 linhas): CRUD basico.
- `apps/admin/src/views/VolunteersView.tsx` removido (usar MembersView com `defaultFilter={isVolunteer:true}`).

### Refactors

- `ScheduleView`: agora persiste `preacher_member_id`/`director_member_id`/`sound_member_id` ao salvar.

### Hooks novos (`apps/admin/src/hooks.ts`)

- `useMembers`, `useHouseholds`, `useRelationships`, `useSaveMember`, `useArchiveMember`, `useRestoreMember`, `useAnonymizeMember`, `useFindMemberDuplicates`, `useSaveHousehold`, `useArchiveHousehold`, `useSaveRelationship`, `useDeleteRelationship`.
- Retry config (`CRITICAL_RETRY`) com `isRetryableError` (default false em erros opacos).

### Helpers (`apps/admin/src/lib/`)

- `format.ts`: `maskCpf`, `maskCep`, `unmaskDigits`.
- `labels.ts`: BR_STATES (27 UFs), enum labels e options.
- `schemas.ts`: zod `memberSchema`, `householdSchema`, `relationshipSchema`.

### Tests (Sessao 2 + tests follow-up)

- `MembersView.test.tsx` (17 tests, 75% cov)
- `HouseholdsView.test.tsx` (9 tests, 97% cov)

## Sessao 3 — Hardening + LGPD + restante quality-roadmap (completo)

### Componentes

- `ConfirmDialog.tsx` + `useConfirm()` hook + `ConfirmProvider`. API com `destructive` e `requireText` (digitar texto exato pra liberar). Substitui `window.confirm` em MinistriesView/ScheduleView (3 ocorrencias).
- `Toast.undo({ message, onUndo, duration: 10000 })` API estendida — visivel mas ainda nao wireada nas views.
- `TurnstileWidget` (admin login).

### Cloudflare Functions

- `functions/api/health.js` — `GET /api/health` checa env + Supabase.
- `functions/api/admin-login-verify.js` — valida Turnstile token antes de signInWithPassword.
- `functions/api/login-alert.js` — registra evento de login (TODO_RESEND_API_KEY pra envio email; sem provider hoje, so logga).

### Banco

- `supabase/cron.sql` — instrucao manual pra ativar pg_cron + agendar `purge_old_prayers()` mensal.

### Headers de seguranca

- `public/_headers` (Cloudflare Pages): X-Frame-Options DENY, HSTS preload, COOP, CORP, Permissions-Policy, X-Robots-Tag noindex em /admin.

### Microcopy

- AnnouncementsView/AuditLogView/ProfileView/TeamView toast/empty/validation copy humanizada.

### Docs

- `docs/onboarding.md` — quickstart pra novo dev/voluntario.

## Pendencias prioritarias

### 0. Familia com chips + trigger reverso ✅ (entregue 2026-05-04)

Schema: trigger SQL `create_reverse_relationship` / `delete_reverse_relationship` em `member_relationships` cria/remove o lado oposto automaticamente. Pai/mae ↔ filho (filho usa gender do to_member pra decidir pai vs mae no reverso), avo ↔ neto, tio ↔ sobrinho, conjuge/irmao simetricos, responsavel sem reverso. Avoid recursao via `pg_trigger_depth() > 1`.

UI: `RelationshipsPanel` em MembersView agora mostra 10 categorias (Conjuge, Pai, Mae, Filhos, Irmaos, Avos, Netos, Tios, Sobrinhos, Responsavel), cada uma com chips dos parentes vinculados + botao `+` circular pra abrir modal e selecionar membro existente. Direcao do INSERT varia por categoria — `buildInsertPayload` resolve.

`listRelationships` ja retorna ambas direcoes (`or(from_member_id.eq.X,to_member_id.eq.X)`).

Pendente: ativar triggers em prod re-aplicando `supabase/schema.sql` no SQL Editor (banco zerado, sem perda). Tests do MembersView nao foram atualizados pra cobrir especificamente as novas categorias chip (461 baseline continua passando) — follow-up.

### 1. Adapter archive-first (desbloqueia undo banner)

Schema ja tem soft delete + RPCs. Adapter ainda chama `.delete()` direto em announcements/schedule_items/ministries.

A fazer:

- `packages/supabase/src/index.ts`: trocar `deleteAnnouncement`/`deleteScheduleItem`/`deleteMinistry` por chamadas `rpc('archive_<table>', { p_id: id })`. Adicionar `restoreAnnouncement`/`restoreScheduleItem`/`restoreMinistry` via `rpc('restore_<table>', ...)`.
- `apps/admin/src/hooks.ts`: novos `useArchive*`/`useRestore*` paralelos aos `useDelete*`. Pode eventualmente deprecar Delete.
- Views (`AnnouncementsView`, `MinistriesView`, `ScheduleView`, `PrayersView`): trocar `useDelete*` por `useArchive*` + `toast.undo({ onUndo: () => restore.mutate(id) })`.

### 2. LGPD finalizar

- Ativar pg_cron e rodar `supabase/cron.sql` (manual no Supabase SQL Editor).
- `members.public_directory` ja existe — falta wirear opt-in no UI da MembersView (tab LGPD).
- Anonymize flow: `useAnonymizeMember` ja existe; falta UI (botao "Anonimizar dados" na MembersView com ConfirmDialog `requireText`).
- Audit log retention 24m: precisa funcao SQL nova `purge_old_audit()` + cron entry.

### 3. ScheduleView usar MembersView pra dropdown de pregadores

Hoje pregador/dirigente/som sao inputs string com sugestao via datalist. Pode virar select de membros (`is_volunteer=true`) com autocomplete. `preacher_member_id` ja persiste no save quando membro selecionado.

### 4. Hardening manual (precisa Supabase painel)

- **#23** rotacionar service_role JWT antigo.
- 2FA admin: habilitar Supabase Auth MFA. UI ja tolera.
- Email provider real (Resend) pra `login-alert.js` enviar email.

### 5. Performance (Fase 10 quality-roadmap, precisa deps novas)

- `vite-plugin-visualizer` (bundle analysis).
- zod → valibot ou arktype (-85KB).
- Code splitting AnnualScheduleView por painel.
- `vite-plugin-image` (WebP/AVIF).
- Lighthouse CI no GitHub Actions (perf budget).

### 6. Tooling/CI (Fase 13 quality-roadmap)

- Dependabot + Snyk/Socket.dev.
- license-checker-rseidelsohn (bloqueia GPL/AGPL).
- commitlint enforcement pre-commit.
- semantic-release ou release-please.
- Status badges README (CI, coverage, bundle, license).

### 7. axe-core CI gate (Fase 9.6)

- Instalar `vitest-axe` ou `jest-axe`.
- Test a11y nas primitivas + views.
- CI fail em violations criticas.

### 8. Diagrama C4 (Fase 12.5)

- Context, Container, Component em Mermaid (sem ferramenta externa). Posso gerar.

### 9. Drag-and-drop reorder (Fase 15.5)

- `@dnd-kit/core` em MinistriesView, RecurringMeetings, AnnualSchedule.

### 10. View-transition API (Fase 15.8)

- Animacoes sutis (fade 200ms) respeitando `prefers-reduced-motion`.

### 11. Schedule member binding aware de delete

- Quando `archive_member` chamado, schedule_items que referenciam ficam com `preacher_member_id NULL` (FK on delete set null). Mas se for revertido (restore_member), os ids nao voltam. Pode ser que precise re-bind manual ou trigger pra reconciliar via nome string. Discutir com o usuario.

## Como retomar

1. Rodar `npm test` — confirmar 407 tests verdes, 100% nos packages.
2. Aplicar `supabase/cron.sql` no painel Supabase (se ainda nao feito).
3. Rodar `npm run seed:schedule` se mudar planilhas.
4. Pendencia 1 (adapter archive-first) e o proximo passo de maior impacto — ativa undo wireado e move o sistema pra "soft-by-default".
