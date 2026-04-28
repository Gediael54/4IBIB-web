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
  schema.sql   # schema único, idempotente, com RLS + triggers
scripts/
  compose-dist.mjs  # combina site + admin em um único dist/ pro Cloudflare
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

A `Publishable key` (sb_publishable_*) é segura no frontend. A `service_role` / `secret key` **nunca** deve ir pro `.env` do Vite.

## Segurança Supabase

RLS habilitado em todas as tabelas. Políticas via funções `is_admin()` e `is_owner()` (security definer, evita recursão). `admin_users` controla quem pode editar; ler é público para conteúdo institucional, restrito para `prayer_requests`.

## Estado conhecido

- Logo original em `Logo da 4ibib.png` (raster, com fundo, estilo metálico) — **a substituir** por versão limpa que o nano banana vai gerar (prompts ficaram registrados na conversa). Manter elementos: globo, cruz, "4ª", base.
- Login do admin e hero do site usam gradient escuro sóbrio (sem foto de Unsplash) — combina com perfil reformado.

---

# Backlog — TODO

Marcar com `[x]` ao concluir. Itens novos entram na seção que fizer sentido.

## 🔴 Bugs reais

- [x] **#1** Form do admin não preenche ao clicar "Editar" — `defaultValue` em form uncontrolled. Fix: `key={draft.id || 'new'}` no `<form>`. Afeta: avisos, programação, ministérios, perfil.
- [x] **#2** Lista de programação só mostra título+ministério — adicionar data/hora pra identificar evento.
- [x] **#3** Delete sem confirmação — adicionar `confirm()` antes de chamar delete.
- [x] **#4** `endsAt < startsAt` só falha no save (constraint do banco). Adicionar `min={startsAt}` no input + auto-shift quando startsAt muda.
- [x] **#5** Ministério/local/líder são free-text — vão criar duplicatas (`Louvor`/`louvor`/`LOUVOR`). Trocar por `<input list="...">` com `<datalist>` populado dos itens existentes.
- [ ] **#6** `profile.regular_meetings` (jsonb) não é editável pelo admin — schema permite, form ignora. Horários de culto recorrentes só dá pra mexer via SQL. Fix estrutural: extrair pra tabela `recurring_meetings (id, profile_id fk, title, weekday, starts_at time, description, sort_order)` — desbloqueia CRUD trivial no admin.
- [ ] **#7** `MOCK_ADMIN` (admin@4ibib.local/123456) entra no bundle de produção. Tree-shake ou mover pra package separado de seeds.

## 🟡 UX/UI

- [ ] **#8** Inputs do admin só com placeholder, sem `<label>` visível. Pior em `datetime-local` (sem placeholder).
- [ ] **#9** Pedidos de oração sem filtro por status, sem timestamp visível, sem ordenação.
- [ ] **#10** Sem busca/ordenação/paginação em qualquer lista do admin.
- [ ] **#11** Botões só com ícone (lápis/lixeira) sem tooltip nem `aria-label`.
- [ ] **#12** Sidebar do admin em mobile vira lista vertical sem destacar item ativo.
- [ ] **#13** Site sem header sticky — perde navegação ao rolar.
- [ ] **#14** Site sem `scroll-behavior: smooth` — links âncora pulam bruscamente.
- [ ] **#15** Hero do site ocupa 92vh — empurra todo conteúdo pra baixo da dobra.
- [ ] **#16** Bullet colorido do `.ministry-card` é minúsculo (36×6px). Trocar por borda lateral colorida.
- [ ] **#17** Footer do site sem links de navegação rápida.

## ♿ Acessibilidade

- [ ] **#18** Botões icon-only sem `aria-label` — leitor de tela lê nada.
- [ ] **#19** Forms do admin sem `<label>` associado (placeholder não conta).
- [ ] **#20** Sem skip link "pular para conteúdo".
- [ ] **#21** Verificar contraste AA de `#c2410c` no `#fffaf1` (laranja sobre creme).
- [ ] **#22** Uniformizar `:focus-visible` no site (já bom no admin).

## 🔒 Segurança

- [ ] **#23** Rotacionar a *legacy service_role JWT* (vazada em sessão anterior). Project Settings → API Keys → Disable legacy.
- [ ] **#24** Pedidos de oração sem rate-limit nem CAPTCHA — bot pode floodar. Adicionar Cloudflare Turnstile + RLS rate-limit ou edge function gate.
- [ ] **#25** Sem `maxlength` nos campos — alguém pode enviar 10MB de texto.
- [ ] **#26** Sem CSP — adicionar via `_headers` do Cloudflare Pages (`Content-Security-Policy`).
- [ ] **#27** `maps_url` aceita qualquer string. React 18+ bloqueia `javascript:`, mas validar no save (URL parseável + protocolo http/https).

## ⚡ Performance

- [ ] **#28** Bundle do admin: 412KB / 118KB gzip. Code-splitting por view com `React.lazy`.
- [ ] **#29** `getSnapshot()` recarrega tudo a cada save — adicionar SWR ou React Query.
- [ ] **#30** Sem prefetch entre site↔admin (cold-load).
- [ ] **#31** Verificar se React DevTools entra no bundle de produção (`mode === production`).

## 🌐 SEO / metadata

- [ ] **#32** Sem favicon, apple-touch-icon, manifest.webmanifest. (Esperando logo do nano banana.)
- [ ] **#33** Sem sitemap.xml nem robots.txt explícito.
- [ ] **#34** Sem OG image — link compartilhado em WhatsApp/FB sem preview visual.
- [ ] **#35** Sem Schema.org JSON-LD (Place + Church + opening hours) — perde ranking local no Google.
- [ ] **#36** `<title>` não muda ao navegar entre seções.

## 🗄️ Schema / banco

- [ ] **#37** `schedule_items.ministry` é text livre — não FK pra `ministries.id`. Renomear ministério não cascateia.
- [ ] **#38** Sem índices em `prayer_requests(created_at desc)` e `schedule_items(starts_at)` — ficará lento com algumas centenas de linhas.
- [ ] **#39** `church_profile` deveria ter constraint garantindo `id = 'main'` (singleton). Hoje RLS permite múltiplos.
- [ ] **#40** Sem audit log — quem alterou o quê.
- [ ] **#41** Schema é monolito — não usa migrations versionadas.
- [ ] **#58** Index parcial composto `schedule_items (starts_at) where status='scheduled'` — query do site filtra por `status='scheduled' and starts_at >= now()`, hoje só tem index plano em `starts_at`. Com 1000+ rows vira seq-scan filtrado.
- [ ] **#59** Index parcial `announcements (published_at desc) where pinned=true` — site só renderiza fixados; index parcial fica enxuto e cobre exatamente a query.
- [ ] **#60** `schedule_items.google_event_id` é `text not null default ''` em vez de `text` nullable — anti-pattern. Index parcial já é `where google_event_id <> ''` (deveria ser `is not null`). Trocar pra NULL é mais idiomático Postgres.
- [ ] **#61** Renomear `schedule_items.special_date` → `occasion_label`. O campo guarda texto tipo "Dia das Maes", "Aniversario da Igreja" — não é data. Nome atual confunde quem lê o schema.

## 🛠️ Manutenibilidade

- [ ] **#42** Sem ESLint nem Prettier — só typecheck.
- [ ] **#43** Sem CI/CD (GitHub Actions) — typecheck/test/build rodam só local.
- [ ] **#44** Sem pre-commit hook (husky/lint-staged).
- [ ] **#45** Sem env validation no startup — `VITE_SUPABASE_URL` vazio só explode no runtime.
- [ ] **#46** `createBackend()` duplicado em cada app — extrair pra package compartilhado.
- [ ] **#47** Sem error tracking (Sentry/Logtail) — erro em prod morre no console do usuário.
- [ ] **#48** Sem teste de UI (React Testing Library) nem E2E (Playwright).

## 🚀 Funcionalidades novas

- [ ] **#49** Calendário visual (mensal/semanal) em vez de só lista.
- [ ] **#50** Multi-admin — schema tem `role: owner|editor`, UI não usa.
- [ ] **#51** Inscrições em eventos com limite de vagas.
- [ ] **#52** Pregações/estudos (YouTube embed, PDF).
- [ ] **#53** PIX/doações online (QR code estático já ajuda).
- [ ] **#54** Newsletter/mailing list.
- [ ] **#55** Notificação push ao publicar aviso.
- [ ] **#56** Versionamento de conteúdo (rollback).
- [ ] **#57** Bio dos pastores/liderança com fotos.

## 🎨 Aguardando nano banana

- [ ] **Logo principal** (PNG 1024×1024 transparente) — globo + cruz + "4ª" + base, flat moderno, sem efeito 3D/metálico. Cores: símbolo `#172026`, "4ª" `#e05722`, acentos `#b91c1c`.
- [ ] **Favicon** (PNG 512×512 transparente) — versão simplificada chunky pra legibilidade em 16px.
- [ ] Quando chegarem: mover pra `apps/{site,admin}/public/`, integrar no header/sidebar/login/favicon, apagar `Logo da 4ibib.png` da raiz.

---

# Notas de operação

- **Branch principal**: `main` (sem PR ainda — repo no início).
- **Commits**: criar só quando o usuário pedir.
- **Antes de mudar SQL**: confirmar com o usuário (afeta o Supabase de produção dele).
- **Antes de instalar deps via apt/sudo**: pedir; sandbox geralmente bloqueia rede e/ou requer sudo.
