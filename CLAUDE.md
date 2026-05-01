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
