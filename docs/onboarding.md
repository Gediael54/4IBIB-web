# Onboarding — 4IBIB Web

Guia rapido pra um dev novo (ou voluntario tecnico) ter o ambiente local rodando em <30 minutos.

## Pre-requisitos

- **Node.js 20.x ou superior** (recomendado: instalar via [nvm](https://github.com/nvm-sh/nvm)).
- **npm 10+** (vem com Node 20).
- **Git** configurado com chave SSH no GitHub.
- Acesso ao projeto Supabase (peca pra alguem do time as credenciais publicas).

## Setup em 4 passos

### 1. Clonar e instalar deps

```bash
git clone git@github.com:Gediael54/4IBIB-web.git
cd 4IBIB-web
npm install
```

### 2. Configurar variaveis de ambiente

Copia `.env.example` pra `.env` na raiz do repo:

```bash
cp .env.example .env
```

Preenche com as credenciais do Supabase:

```bash
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

A `Publishable key` (`sb_publishable_*`) e segura no bundle. **Nunca** colocar `service_role` ou `secret key` em `.env` (sao secrets de servidor — ficam so no painel da Cloudflare Pages).

`VITE_TURNSTILE_SITE_KEY` e opcional em dev — se vazia, validacao anti-spam fica em modo passivo.

### 3. Rodar dev

```bash
npm run dev:site      # site publico em http://localhost:5173
npm run dev:admin     # admin em http://localhost:5174
```

Os dois rodam em paralelo (terminais diferentes ou tmux).

### 4. Validar

```bash
npm test              # vitest com cobertura
npm run typecheck     # typecheck nos 4 workspaces
npm run build         # gera dist/ pronto pra Cloudflare Pages
```

Tudo verde = ambiente OK.

## Estrutura essencial

| Pasta                      | O que tem                                                          |
| -------------------------- | ------------------------------------------------------------------ |
| `apps/site/`               | Site publico (React + Vite). Porta 5173 em dev.                    |
| `apps/admin/`              | Painel CMS (React + Vite). Porta 5174 em dev. Deploy em `/admin/`. |
| `packages/core/`           | Tipos de dominio + utilidades puras. Cobertura 100% obrigatoria.   |
| `packages/supabase/`       | Adapter pro Supabase. Cobertura 100% obrigatoria.                  |
| `supabase/schema.sql`      | Fonte unica idempotente de schema, RLS, funcoes e seed.            |
| `functions/api/`           | Cloudflare Pages Functions (prayer, health, login-alert etc.).     |
| `scripts/compose-dist.mjs` | Combina site + admin num unico `dist/` pra deploy.                 |
| `docs/plans/`              | Planos de longo prazo.                                             |
| `docs/adr/`                | Architecture decision records.                                     |

`apps/*` consomem **somente** `@4ibib/core` (tipos puros) + `@4ibib/supabase` (adapter). Detalhes do Supabase nao vazam pra UI — qualquer mudanca de backend e contida no adapter.

## Convencoes (importantes)

- **Sem comentarios explicando WHAT** — codigo auto-explicativo. Comentario so pra WHY nao-obvio.
- **Strings em PT-BR sem acentos** (compatibilidade mais ampla; convencao do projeto).
- **Conventional commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`...).
- **Sem `Co-Authored-By`** no trailer.
- **Staging individual** por arquivo (sem `git add -A` ou `.`).
- **Um commit = uma mudanca logica** com descricao precisa.
- **Cobertura 100%** em `packages/core` e `packages/supabase` (gate no Vitest).

## Comandos do dia a dia

```bash
npm run dev:site         # site
npm run dev:admin        # admin
npm test                 # vitest com cobertura
npm run typecheck        # typecheck em todos os workspaces
npm run build            # build completo + compose dist
npm run lint             # eslint
npm run format           # prettier
npm run seed:schedule    # regenera bloco de seed inline em supabase/schema.sql
```

## Health check

Apos deploy, valide com:

```bash
curl https://4ibib-web.pages.dev/api/health
```

Deve retornar 200 com `{ ok: true, checks: { env: true, supabase: true } }`. Se 503, abre o painel da Cloudflare Pages e checa as env vars.

## Troubleshooting comum

### `VITE_SUPABASE_URL nao configurada` ao subir o admin

Falta o `.env` na raiz. Confere com `ls -la .env`. Se existir mas estiver vazio, preenche conforme [secao 2](#2-configurar-variaveis-de-ambiente).

### Testes quebrando com timeout/network

O Supabase real exige conexao. Se voce ta sem internet ou o projeto Supabase ta fora, alguns testes podem quebrar. Os testes do `core` e `supabase` (mockados) nao dependem de internet — esses devem sempre passar.

### Cobertura abaixo de 100% em `core`/`supabase`

Voce alterou um arquivo desses workspaces e nao adicionou testes. Olhe o relatorio `coverage/index.html`, identifique o que ta faltando e cubra antes de commitar.

### Build do admin reclama de Turnstile

Se `VITE_TURNSTILE_SITE_KEY` esta vazia, o widget e pulado em dev. Em producao, configure a chave no painel Cloudflare Pages.

### Pre-commit hook falha

`husky` + `lint-staged` rodam ESLint + Prettier nos arquivos staged. Resolva os erros indicados (rode `npm run format` e `npm run lint`) e tente o commit de novo. **Nunca** use `--no-verify` pra pular hooks.

## Por onde comecar a contribuir

1. Le [`CLAUDE.md`](../CLAUDE.md) — contexto completo, decisoes confirmadas e backlog.
2. Olha [`docs/plans/quality-roadmap.md`](./plans/quality-roadmap.md) e [`docs/plans/admin-master-plan.md`](./plans/admin-master-plan.md) pra ver as fases ativas.
3. Pega uma tarefa do backlog em CLAUDE.md (`#23`, `#51`, etc.).
4. ADRs em [`docs/adr/`](./adr/) explicam decisoes arquiteturais — sempre consulta antes de propor refator.

## Links uteis

- [`README.md`](../README.md) — overview e deploy.
- [`CLAUDE.md`](../CLAUDE.md) — contexto pra agentes IA + decisoes do time.
- [`docs/setup-checklist.md`](./setup-checklist.md) — provisionamento Supabase + Cloudflare passo a passo.
- [`docs/plans/`](./plans/) — planos de longo prazo (admin master, quality roadmap, UI redesign).
- [`docs/adr/`](./adr/) — architecture decision records.
