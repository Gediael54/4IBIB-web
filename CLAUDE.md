# 4IBIB Web — Contexto do projeto

Site público + painel admin da **4ª Igreja Batista Independente Betel** (igreja batista, perfil reformado, não neopentecostal).

## Stack

- **Frontend**: React 19 + Vite 7 + TypeScript estrito
- **Backend**: Supabase (Postgres + Auth + RLS); fallback `mock` em localStorage para dev
- **Hospedagem**: Cloudflare Pages (site em `/`, admin em `/admin/`)
- **Monorepo**: npm workspaces

## Layout do repo

```
apps/
  site/        # site público (porta 5173 em dev)
  admin/       # painel CMS (porta 5174 em dev, deploy em /admin/)
packages/
  core/        # tipos de domínio, utilidades puras (100% cobertura)
  mock/        # backend mock para dev (100% cobertura)
  supabase/    # adapter para Supabase (100% cobertura)
supabase/
  schema.sql      # fonte única: estrutura/RLS/funções/triggers + seed inline (rodar direto no SQL Editor)
  sources/        # planilhas/fontes externas de seed
scripts/
  compose-dist.mjs       # combina site + admin em um único dist/ pro Cloudflare
  seed-from-xlsx.mjs     # regenera bloco de seed dentro de supabase/schema.sql
```

`apps/*` consomem **somente** `@4ibib/core` (tipos) + `@4ibib/mock`/`@4ibib/supabase` (escolha por env). Nada de detalhes de Supabase vazando pra UI.

## Comandos

```bash
npm install
npm run dev:site      # site em http://localhost:5173
npm run dev:admin     # admin em http://localhost:5174
npm test              # vitest run --coverage (gate 100% em core/mock/supabase)
npm run typecheck     # todos os workspaces
npm run build         # gera dist/ pra Cloudflare Pages
npm run seed:schedule # regenera bloco de seed inline em supabase/schema.sql a partir das planilhas
```

## Convenções

- **Sem comentários explicando WHAT** — código auto-explicativo. Comentário só pra WHY não-óbvio.
- **Sem mocks em testes de banco** — testes do Supabase mockam o cliente, mas usam contratos reais.
- **Strings em PT-BR sem acentos** (compatibilidade mais ampla; é convenção do projeto).
- **Cobertura 100%** obrigatória em `core`, `mock`, `supabase` (gate no `vitest.config.ts`).
- **`.env`** fica na raiz; `vite.config.ts` de cada app aponta `envDir: "../.."`.

## Variáveis de ambiente

```
VITE_BACKEND=supabase|mock          # default mock (dev)
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

A `Publishable key` (sb*publishable*\*) é segura no frontend. A `service_role` / `secret key` **nunca** deve ir pro `.env` do Vite.

## Segurança Supabase

RLS habilitado em todas as tabelas. Políticas via funções `is_admin()` e `is_owner()` (security definer, evita recursão). `admin_users` controla quem pode editar; ler é público para conteúdo institucional, restrito para `prayer_requests`.

## Estado conhecido

- Logo original em `Logo da 4ibib.png` (raster, com fundo, estilo metálico) — **a substituir** por versão limpa que o nano banana vai gerar (prompts ficaram registrados na conversa). Manter elementos: globo, cruz, "4ª", base.
- Login do admin e hero do site usam gradient escuro sóbrio (sem foto de Unsplash) — combina com perfil reformado.

---

# Backlog — TODO

Marcar com `[x]` ao concluir. Itens novos entram na seção que fizer sentido.

## Decisões confirmadas pelo usuário (2026-04-28)

- **SQL/migrations autorizados**: pode alterar schema e melhores práticas, preservando os dados atuais de `church_profile.regular_meetings`.
- **Horários oficiais**: culto de louvor quinta 19:30-21:00; escola bíblica domingo 09:30-11:00; culto solene domingo 17:00-19:00.
- **SEO canônico**: `https://4ibib-web.pages.dev/`.
- **Contato oficial**: `478 Rua José Victor de Albuquerque`; WhatsApp `+55 81 98122-0651`.
- **Robots**: manter `/admin` fora de indexação; isso não substitui autenticação/RLS.
- **Segurança do formulário de oração**: usar Cloudflare Turnstile + validação server-side/rate-limit, com tutorial para gerar chaves.
- **Infra**: adicionar ESLint + Prettier conservador, GitHub Actions para test/typecheck/build, e pre-commit leve com Husky/lint-staged.
- **Error tracking**: preferência técnica por Sentry para frontend React/Vite.
- **Funcionalidades futuras**: multi-admin fica preparado para o futuro; inscrições, newsletter e WhatsApp ficam como backlog posterior.
- **Assets**: usar `assets/logo-main.png`, `assets/logo-source.jpg` e `assets/hero-source.png`; pode substituir referências atuais e remover `Logo da 4ibib.png`.

## Checkpoint 2026-04-29 — fim do dia (continua amanhã)

### SQL pra rodar no Supabase amanhã

**1. Atualizar perfil da igreja** (estava como Boa Vista, RR; deve ser Caruaru, PE):

```sql
update public.church_profile
set
  city = 'Caruaru, PE',
  address = '478 Rua Jose Victor de Albuquerque',
  whatsapp = '+55 81 98122-0651',
  name = '4a Igreja Batista Independente Betel',
  short_name = '4a Betel'
where id = 'main';
```

**2. Deduplicar eventos** (seed rodou duas vezes com UUIDs diferentes — a UI renderizou "Culto de Louvor 30/abr" duas vezes):

```sql
-- Diagnostica primeiro
select starts_at, title, ministry_id, count(*)
from public.schedule_items
group by starts_at, title, ministry_id
having count(*) > 1
order by starts_at;

-- Deleta duplicatas mantendo o de menor id
delete from public.schedule_items s
using (
  select id,
         row_number() over (partition by starts_at, title order by id) as rn
  from public.schedule_items
) ranked
where s.id = ranked.id
  and ranked.rn > 1;

-- Confirma
select count(*) from public.schedule_items;
```

### Status do Calendar K (já em `main`, 4 commits pushed)

- `bb915e5` docs(claude): record calendar K delivery
- `119d2b4` feat(site): replace MonthAgenda with calendar K layout on the homepage
- `07160b0` feat(site): add EventCard, UpcomingEvents and MonthScrollCalendar
- `621634c` feat(site): add lib/date and lib/event helpers for the calendar

Estrutura entregue:

- `apps/site/src/lib/date.ts` (helpers Recife) e `lib/event.ts` (displayLocation + occasionStyle).
- `apps/site/src/components/{EventCard,UpcomingEvents,MonthScrollCalendar}.tsx` + testes.
- `MonthAgenda.tsx` removido. `apps/site/src/main.tsx` consome zona 1 (próximos 5) + zona 2 (mini-grid sticky + timeline).
- 135 testes verdes (TZ=UTC), build limpo, cobertura 100% nos packages.

### Feedback do usuário sobre Calendar K (a tratar amanhã)

1. **Paleta sem personalidade** — laranja/gold atual lê como Tailwind padrão. Pediu pesquisa real, vocabulário sóbrio reformado. **Proposta principal: "Bronze on Navy"** (refs: Banner of Truth, Capitol Hill Baptist, Truth For Life, Reformation21):
   - `--bg-cream #F4ECD8`, `--bg-card #FBF6E9`
   - `--ink-navy #1A2740` (substitui slate `#1f2937`)
   - `--ink-text #1A1A1A`, `--muted #6B5D4F`
   - `--accent-bronze #A07337` (substitui orange `#c2410c`)
   - `--accent-gold #C8A24E` (substitui mostarda `#fbbf24`)
   - `--border #D9CCB1`
   - Critério: 60-30-10 (60% neutro, 30% navy, 10% bronze), AA WCAG, vibe institucional/atemporal, harmoniza com a logo metálica.
   - Alternativas no waiting room: "Forest & Burgundy" (`#1F3A2A` + `#EDE3CC` + `#7A1F2C`) ou "Charcoal & Terracotta" (`#2A2520` + `#F2EAD8` + `#A8492C`). Aguardando confirmação.

2. **Calendar K desencaixado do site** — paineis e cores do Calendar K não conversam com o resto. Plano de harmonização (depende da paleta acima):
   - Mini-grid + header em modo escuro (vivem direto no slate/navy da seção, sem painel cream wrapper, sem box-shadow).
   - Headers de dia: trocar `──── Quinta · 5 fev ────` por eyebrow `QUINTA · 5 FEV` (uppercase + letterspacing + gold).
   - Cards: border-radius 8px (não 10), alinhar com resto do site.
   - **Badge de ocasião: uma paleta só** (gold-on-cream-amber, igual `.schedule-tag` existente). Drop das 4 paletas multicor (lavanda/teal/rose/amber) — não combinavam com nada do site. Diferenciar tipo de ocasião pode voltar como iteração futura se virar prioridade.

3. **Animação/posicionamento do scroll** — quando clica num dia da mini-grid, scrolla pra um ponto que ainda fica coberto pela própria sticky (calendário sticky tem ~300px de altura mas `scroll-margin-top` está em 220px). Fix: subir pra ~340px ou recalcular dinamicamente via `getBoundingClientRect` da sticky. Falta confirmar com o usuário se há outras animações que ele estranhou (entrada de cards, transição de mês, hover).

### Plano para a próxima sessão (sequência)

1. **Usuário roda os 2 SQLs acima** no Supabase (cidade + dedup) e confirma.
2. **Usuário escolhe a paleta** (Bronze on Navy / Forest & Burgundy / Charcoal & Terracotta).
3. Implementar:
   - `apps/site/src/lib/theme.ts` ou bloco `:root { --token: value }` no `styles.css` com tokens da paleta escolhida.
   - Refatorar `styles.css` (site) e `apps/admin/src/styles.css` substituindo cores hardcoded por tokens.
   - Aplicar harmonização do Calendar K (mini-grid dark, header eyebrow-style, badge unificado, radius 8px, sem shadow).
   - Corrigir `scroll-margin-top` do `.timeline-day` (340px ou dinâmico).
4. Verificar visualmente em desktop e mobile (golden path: hero → próximos → calendário do mês → click num dia → tudo encaixa).
5. Rodar `npm test` e `npm run build`.
6. Commit em duas frentes: `style(site): apply bronze-on-navy palette tokens` e `refactor(site): harmonize calendar K with site design system`.

### Ideias do usuário registradas (longer-term)

- Eventualmente trazer de volta "cor por tipo de ocasião" se houver demanda real. Hoje é prematuro com 4 ocasiões/ano.
- Se a paleta Bronze on Navy não convencer ao ver no ar, escapes prontos: Forest & Burgundy (mais clássico inglês) ou Charcoal & Terracotta (mais contemporâneo).
- IntersectionObserver pra atualizar header conforme usuário rola pela timeline ainda está adiado — pode entrar quando timeline crescer pra mostrar múltiplos meses.

### TODOs ainda abertos do backlog

- `#23` rotacionar service_role JWT (manual no painel Supabase + atualizar README).
- `#50` multi-admin owner/editor (futuro).
- `#51` inscrições em eventos (depende de definir destino).
- `#52` YouTube em pregações/estudos (concreto, fechável em uma sessão).
- `#53` PIX/doações (chave + QR estático, pequeno).
- `#54` newsletter (futuro).
- `#55` notificação ao publicar aviso (depende de canal).
- `#57` bio dos pastores/liderança (CRUD novo + seção pública).

---

## Checkpoint da sessão 2026-04-28 — onde paramos

### Já entrou no `main`

- ENUMs nativos no banco: `admin_role`, `announcement_category`, `schedule_status`, `prayer_status`. Migração idempotente em `supabase/schema.sql` seção 5.7 cobre policies/constraints/índices que dependem das colunas antes de converter.
- Coluna `schedule_items.google_event_id` removida; seed usa UUID determinístico (sha256 de starts_at + ministry + title) pra re-run idempotente.
- `apps/site` adotou TanStack Query (snapshot + prayer mutation). Stale 5min, sem refetch on focus.
- `apps/admin` Fase 2 completa: TanStack Query + React Hook Form + Zod + `React.lazy` por view (`apps/admin/src/views/*`). Fechou TODO #28 (code-splitting) e #29 (refetch granular). Componentes compartilhados em `components/ui.tsx`, schemas em `schemas.ts`, hooks em `hooks.ts`, helpers em `utils.ts`.
- CRUD de `recurring_meetings` no admin via `useFieldArray` dentro do form de perfil. Validação HH:MM + `endsAt > startsAt` + ordenação manual com setas. Fechou TODO #6.
- `commit` skill em `~/.claude/skills/commit/SKILL.md` — regras de commit do projeto (sem Co-Authored-By, conventional commits, staging individual).

### Em voo

Nada em voo — Calendário K entrou no `main` (commit pendente). 135 testes verdes, build limpo.

### Calendário K — entregue (2026-04-29)

- `apps/site/src/lib/date.ts`: helpers Recife (`startOfMonth`, `endOfMonth`, `addMonths`, `daysInMonth`, `weekdayOfFirstDay`, `getZonedParts`, `formatMonthLabel` sem TZ override, `formatTime`, `formatWeekdayLong/Short`, `formatMonthShort`, `isoForDay`).
- `apps/site/src/lib/event.ts`: `displayLocation(item, profile)` faz fallback para `profile.shortName` + `name` quando location está vazio ou é "Templo principal" (case-insensitive); `occasionStyle(label)` mapeia PASCOA→lavanda, MISSOES→teal, NATAL→rose, CARNAVAL→amber + paleta neutra para labels desconhecidos.
- `apps/site/src/components/EventCard.tsx`: prop `compact?` + `showDay?/dayLabel?`. Renderiza badge de ocasião, time, título com variantes `suspended` (tachado + (SUSPENSO)) e `free` (italic "Livre"), star + borda lateral quando `featured`. Meta dl com Pregador/Dirigente/Leitura só quando preenchidos, e Local sempre com fallback ao perfil.
- `apps/site/src/components/UpcomingEvents.tsx`: usa `getUpcomingSchedule(schedule, limit=5)`; renderiza nada quando vazio; cards compactos com `Dom · 1 fev` no header de tempo.
- `apps/site/src/components/MonthScrollCalendar.tsx`: mini-grid sticky 7 colunas com células `has-event` (círculo `--color-accent`/laranja) e `today` (outline). Click em dia com evento → `scrollIntoView` da seção do dia. Timeline lista só dias com evento, com header sticky `──── Quinta · 5 fev ────`. Sub-banner de ocasião do mês quando algum evento tem `occasionLabel`.
- `apps/site/src/main.tsx`: zona 1 (`UpcomingEvents`) + zona 2 (`MonthScrollCalendar`) dentro de `.schedule-section`. Subheads "Proximos eventos" / "Calendario do mes" com estilo dourado.
- CSS reescrito: removidas classes `.month-agenda-*` e `.calendar-panel`; adicionadas `.upcoming-events`, `.event-card[.compact|.featured|.suspended|.free]`, `.month-scroll[-sticky|-header|-occasion|-empty]`, `.month-grid[-weekdays|-days|-cell.has-event/.today]`, `.timeline-day[-header|-events]`, `.schedule-subhead`.
- Testes: 135 verdes (TZ=UTC) com cobertura 100% nos packages. `MonthAgenda.tsx`/`.test.tsx` removidos. Cobre fallback de location, ocasiões, status variants, navegação prev/next, today highlight, scrollIntoView, agrupamento cronológico.

### Decisões adiadas

- Cor por ministério no mini-grid: deixado fora (só `--color-accent`).
- Auto-scroll inicial pra "hoje": deixado fora; `scroll-margin-top: 220px` cuida do offset quando usuário clica no dia.
- IntersectionObserver pra atualizar header conforme rola: não implementado — viewedMonth muda só pelos botões.

## 🔴 Bugs reais

- [x] **#1** Form do admin não preenche ao clicar "Editar" — `defaultValue` em form uncontrolled. Fix: `key={draft.id || 'new'}` no `<form>`. Afeta: avisos, programação, ministérios, perfil.
- [x] **#2** Lista de programação só mostra título+ministério — adicionar data/hora pra identificar evento.
- [x] **#3** Delete sem confirmação — adicionar `confirm()` antes de chamar delete.
- [x] **#4** `endsAt < startsAt` só falha no save (constraint do banco). Adicionar `min={startsAt}` no input + auto-shift quando startsAt muda.
- [x] **#5** Ministério/local/líder são free-text — vão criar duplicatas (`Louvor`/`louvor`/`LOUVOR`). Trocar por `<input list="...">` com `<datalist>` populado dos itens existentes.
- [x] **#6** `profile.regular_meetings` (jsonb) não é editável pelo admin — DB/adapter migrados para `recurring_meetings (id, profile_id fk, title, weekday, starts_at time, ends_at time, description, sort_order)`. CRUD inline no form de perfil com `useFieldArray`, validação HH:MM + `endsAt > startsAt`, ordenação manual com setas.
- [x] **#7** `MOCK_ADMIN` (admin@4ibib.local/123456) entra no bundle de produção. Tree-shake ou mover pra package separado de seeds.

## 🟡 UX/UI

- [x] **#8** Inputs do admin só com placeholder, sem `<label>` visível. Pior em `datetime-local` (sem placeholder).
- [x] **#9** Pedidos de oração sem filtro por status, sem timestamp visível, sem ordenação.
- [x] **#10** Sem busca/ordenação/paginação em qualquer lista do admin.
- [x] **#11** Botões só com ícone (lápis/lixeira) sem tooltip nem `aria-label`.
- [x] **#12** Sidebar do admin em mobile vira lista vertical sem destacar item ativo.
- [x] **#13** Site sem header sticky — perde navegação ao rolar.
- [x] **#14** Site sem `scroll-behavior: smooth` — links âncora pulam bruscamente.
- [x] **#15** Hero do site ocupa 92vh — empurra todo conteúdo pra baixo da dobra.
- [x] **#16** Bullet colorido do `.ministry-card` é minúsculo (36×6px). Trocar por borda lateral colorida.
- [x] **#17** Footer do site sem links de navegação rápida.

## ♿ Acessibilidade

- [x] **#18** Botões icon-only sem `aria-label` — leitor de tela lê nada.
- [x] **#19** Forms do admin sem `<label>` associado (placeholder não conta).
- [x] **#20** Sem skip link "pular para conteúdo".
- [x] **#21** Verificar contraste AA de `#c2410c` no `#fffaf1` (laranja sobre creme).
- [x] **#22** Uniformizar `:focus-visible` no site (já bom no admin).

## 🔒 Segurança

- [ ] **#23** Rotacionar/desabilitar a _legacy service_role JWT_ no Supabase. Ação manual no painel; manter tutorial no README/setup checklist.
- [x] **#24** Pedidos de oração sem rate-limit nem CAPTCHA — implementar Cloudflare Turnstile no site + validação server-side/rate-limit antes de gravar no Supabase.
- [x] **#25** Sem `maxlength` nos campos — alguém pode enviar 10MB de texto.
- [x] **#26** Sem CSP — adicionar via `_headers` do Cloudflare Pages (`Content-Security-Policy`).
- [x] **#27** `maps_url` aceita qualquer string. React 18+ bloqueia `javascript:`, mas validar no save (URL parseável + protocolo http/https).

## ⚡ Performance

- [x] **#28** Bundle do admin: code-splitting por view com `React.lazy` + `<Suspense>`. Cada view vira chunk próprio (≤7 KB raw cada), zod/RHF ficam fora do entry até o primeiro form abrir.
- [x] **#29** `getSnapshot()` recarrega tudo a cada save — adotado TanStack Query (queries `['snapshot']` e `['prayers']`); cada mutation invalida o queryKey específico em vez de re-fetch geral.
- [x] **#30** Sem prefetch entre site↔admin (cold-load).
- [x] **#31** Verificar se React DevTools entra no bundle de produção (`mode === production`).

## 🌐 SEO / metadata

- [x] **#32** Sem favicon, apple-touch-icon, manifest.webmanifest. (Esperando logo do nano banana.)
- [x] **#33** Criar `sitemap.xml` para `https://4ibib-web.pages.dev/`; `robots.txt` já existe e deve manter `/admin` bloqueado para indexação.
- [x] **#34** Sem OG image — link compartilhado em WhatsApp/FB sem preview visual.
- [x] **#35** Sem Schema.org JSON-LD (Place + Church + opening hours) — usar endereço `478 Rua José Victor de Albuquerque`, WhatsApp `+55 81 98122-0651`, e horários oficiais confirmados.
- [x] **#36** `<title>` não muda ao navegar entre seções.

## 🗄️ Schema / banco

- [x] **#37** Migrar `schedule_items.ministry` de text livre para FK `ministries.id`, preservando dados atuais por normalização/mapeamento de nomes.
- [x] **#38** Adicionar índices em `prayer_requests(created_at desc)` e `schedule_items(starts_at)`, além dos parciais dos itens #58/#59.
- [x] **#39** Adicionar constraint garantindo `church_profile.id = 'main'` (singleton).
- [x] **#40** Adicionar audit log no banco para registrar quem alterou o quê; rollback visual fica para etapa posterior (#56).
- [x] **#41** Consolidar SQL em `supabase/schema.sql` como fonte única idempotente (com seed inline regenerado por `npm run seed:schedule`); próximas mudanças de banco entram direto nesse arquivo.
- [x] **#58** Index parcial composto `schedule_items (starts_at) where status='scheduled'` — query do site filtra por `status='scheduled' and starts_at >= now()`, hoje só tem index plano em `starts_at`. Com 1000+ rows vira seq-scan filtrado.
- [x] **#59** Index parcial `announcements (published_at desc) where pinned=true` — site só renderiza fixados; index parcial fica enxuto e cobre exatamente a query.
- [x] **#60** Coluna `schedule_items.google_event_id` removida do schema; seed agora usa UUIDs determinísticos (sha256 de starts_at + ministry + title, formato versão 4) como chave primária.
- [x] **#61** Renomear `schedule_items.special_date` → `occasion_label`, com migração e compatibilidade no backend/UI.

## 🛠️ Manutenibilidade

- [x] **#42** Adicionar ESLint + Prettier conservador, alinhado ao TypeScript/React/Vite atual.
- [x] **#43** Adicionar GitHub Actions para `npm test`, `npm run typecheck` e `npm run build`.
- [x] **#44** Adicionar Husky + lint-staged leve: rodar ESLint/Prettier nos arquivos alterados; deixar testes/build pesados para CI.
- [x] **#45** Sem env validation no startup — `VITE_SUPABASE_URL` vazio só explode no runtime.
- [x] **#46** `createBackend()` duplicado em cada app — extrair pra package compartilhado.
- [x] **#47** Sem error tracking — integrar Sentry para React/Vite, com DSN via env e sem quebrar dev local.
- [x] **#48** RTL nos packages + Playwright minimo (`e2e/`) com 3 fluxos: pedido de oracao publico, login admin, criar evento no admin. CI roda como job separado com `continue-on-error: true` enquanto a suite estabiliza.

## 🚀 Funcionalidades novas

- [x] **#49** Calendário visual: manter próximos 5 eventos na home e adicionar visão de calendário anual com eventos passados e futuros.
- [ ] **#50** Multi-admin — manter possibilidade futura de `owner|editor`, mas por enquanto operar só com admins/owners.
- [ ] **#51** Inscrições em eventos com formulário público; implementar depois de definir destino/gestão dos formulários.
- [ ] **#52** Pregações/estudos: vincular URL do YouTube a eventos/pregações no admin, com preview em eventos passados e campos de mensagem/anotações.
- [ ] **#53** PIX/doações: começar com chave copia-e-cola + QR code estático; link externo do banco se existir.
- [ ] **#54** Newsletter/mailing list — deixar como sugestão futura, sem implementar agora.
- [ ] **#55** Notificação ao publicar aviso: WhatsApp seria ideal, mas depende de API/estratégia; deixar canal configurável no admin para implementação futura.
- [x] **#56** Versionamento de conteúdo: começar por audit/history no banco; rollback visual fica para depois.
- [ ] **#57** Bio dos pastores/liderança com fotos: criar CRUD próprio no admin e seção pública no site.
- [ ] **#62** Seção "Primeira vez aqui?" no site — onboarding com 4-5 cards (o que esperar, duração do culto, escola dominical, como chegar, dress code). Padrão presente em 100% das referências internacionais (Capitol Hill, HTB, Bridgetown, Redeemer).
- [ ] **#63** Eyebrow tags por categoria nos avisos/eventos (ESTUDO BÍBLICO / MISSÕES / CONFERÊNCIA) — leitura rápida sem virar parede de cor; usar token único da paleta, diferenciar só pelo texto.
- [ ] **#64** "Latest Teaching" persistente na home — quando sermões entrarem (#52), ter UM destaque sempre visível como herói secundário, não só lista. Padrão Bridgetown/Redeemer.
- [ ] **#65** Confissão de fé / doutrina no footer — link pra confissão batista de 1689 ou similar; diferencia identidade reformada sem ocupar espaço no header.

## 🎨 Assets / marca

- [x] **Integrar logo principal** — usar `assets/logo-main.png` no site/admin, revisar tamanhos e contraste em header/sidebar/login.
- [x] **Integrar hero/banner** — avaliar `assets/hero-source.png` como hero real do site e adicionar animações sutis sem prejudicar performance/acessibilidade.
- [x] **Gerar/atualizar favicons e app icons** a partir do logo aprovado.
- [x] **Limpar assets antigos** — remover `Logo da 4ibib.png` da raiz quando as novas referências estiverem integradas.

---

# Notas de operação

- **Branch principal**: `main` (sem PR ainda — repo no início).
- **Commits**: criar só quando o usuário pedir.
- **SQL autorizado em 2026-04-28**: pode alterar schema/migrations seguindo melhores práticas, preservando dados atuais de `church_profile.regular_meetings`.
- **Antes de instalar deps via apt/sudo**: pedir; sandbox geralmente bloqueia rede e/ou requer sudo.
