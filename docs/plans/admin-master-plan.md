# Plano admin master

Roadmap de features do painel admin. Aprovado pelo usuario em 2026-05-01: "fazer tudo, em paralelo, multi-sessao".

## Status global (atualizado 2026-05-02)

- **Fase 1** — Fundacoes (schema + tipos + adapter): ✅ COMPLETA. 153 testes verdes, 100% cobertura.
- **Fase 2** — Views novas (Profile, Ministries, AuditLog, Team): ✅ COMPLETA.
- **Fase 3** — Views turbinadas (Schedule bulk, Announcements status, Volunteers cascade, Prayers WhatsApp): ✅ COMPLETA.
- **Fase 4** — Features grandes: ✅ COMPLETA exceto serie recorrente (provavelmente nao mais necessaria, gerador de cadencia resolve).
- **Fase 5** — Cross-cutting: ✅ COMPLETA exceto notificacao de pedido novo (depende de canal email/WhatsApp).

## Estado base (antes do plano)

- 4 dominios CRUD: Avisos, Programacao, Voluntarios, Oracao.
- Dashboard basico.
- **Faltam telas para 6 dominios**: `church_profile`, `ministries`, `recurring_meetings`, `content_audit_log`, `admin_users`, e nenhuma op em massa em `schedule_items`.
- Cenario alvo "adicionar 1 pregador novo e modificar agenda do ano" exigia edicao item por item.

## Fase 1 — Fundacoes (sequencial)

### 1.1 Schema (`supabase/schema.sql`)

- `announcements`: `status` enum (`draft|scheduled|published|archived`), `expires_at timestamptz null`, `image_url text default ''`.
- `schedule_items`: `series_id uuid null` (sem FK por enquanto).
- `prayer_requests`: `pastoral_notes text default ''`, `assigned_to uuid null references admin_users(user_id)`, `seen_at timestamptz null`.
- `volunteers`: `contact text default ''`, `photo_url text default ''`, `ministries text[] default '{}'`, `unavailable_dates date[] default '{}'`, `notes text default ''`.
- Nova `church_profile` singleton (`id text primary key default 'main' check (id='main')` + campos: name, short_name, tagline, city, pastor_name, address, email, whatsapp, instagram_url, youtube_url, maps_url, hero_verse, mission, updated_at).
- Nova `ministries` (`id, slug unique, name, summary, meeting_time, contact, color, sort_order`).
- Nova `recurring_meetings` (`id, profile_id default 'main', title, weekday smallint check 0-6, starts_at time, ends_at time check >, description, sort_order`).
- Audit triggers nas tabelas novas.
- RLS: leitura publica em `church_profile`, `ministries`, `recurring_meetings`. Escrita admin only.
- Indices nas FKs e em `prayer_requests.assigned_to`.

### 1.2 Tipos no core

- Estender `Announcement`, `ScheduleItem`, `Volunteer`, `PrayerRequest`.
- Novos tipos: `ChurchProfile`, `MinistryRecord`, `RecurringMeetingRecord`, `AdminUser`, `AuditLogEntry`, `AnnouncementStatus`.
- `SiteSnapshot` ganha `profile`, `ministries`, `recurringMeetings`.
- `ContentRepository` ganha 27 metodos (depois quebrado em sub-interfaces na Fase 6.3).

### 1.3 Adapter Supabase

- Implementar todos os novos metodos.
- Snake_case <-> camelCase mapping.
- 100% coverage.

### Stubs no adapter

- ✅ `revertAuditEntry` — funcao Postgres `public.revert_audit_entry(uuid)` (SECURITY DEFINER, whitelist de tabelas).
- ✅ `listAdmins` — funcao Postgres `public.list_admins()` (JOIN com `auth.users`).
- ⏸ `inviteAdmin` — throw com mensagem orientando uso do painel Auth + insert manual em `admin_users`. Edge function pra depois.

## Fase 2 — Views novas (paralelo)

- `apps/admin/src/views/ProfileView.tsx`
- `apps/admin/src/views/MinistriesView.tsx`
- `apps/admin/src/views/AuditLogView.tsx`
- `apps/admin/src/views/TeamView.tsx`

## Fase 3 — Views turbinadas (paralelo)

- ScheduleView: bulk edit, duplicar, filtro de data range.
- AnnouncementsView: status, expires_at, preview ao vivo.
- VolunteersView: campos novos, find/replace ao renomear.
- PrayersView: WhatsApp button, notas pastorais, assigned_to, seen_at.

## Fase 4 — Features grandes

- ✅ Dashboard com alertas acionaveis.
- ✅ Site le do banco com fallback hardcoded.
- ✅ Escala anual (grid datas × papeis com auto-distribuir + deteccao de conflito).
- ✅ Gerador de escalas por cadencia (regras: toda semana / 1x mes / 2x mes / 1x cada 2 meses / quinzenal / 1x trimestre + filtro de dia da semana).
- ⏸ Serie recorrente (`schedule_series` + criador) — pendente, **provavelmente desnecessaria**.

## Fase 5 — Cross-cutting

- ✅ Botao "Ver no site" em ScheduleView e AnnouncementsView.
- ✅ Autosave de rascunho em localStorage.
- ✅ Export CSV de pedidos de oracao.
- ✅ Cmd-K busca global.
- ⏸ Notificacao ao chegar pedido novo — depende de decisao de canal.
