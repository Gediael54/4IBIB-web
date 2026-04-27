# 4IBIB Web

Site publico e painel admin para uma igreja, com arquitetura modular e backend trocavel.

Stack escolhida:
- `React + TypeScript + Vite`
- `Supabase` para Auth, Postgres e RLS
- `Cloudflare Pages` para deploy gratuito do frontend
- `npm workspaces` para monorepo
- `Vitest` com cobertura de 100% nos pacotes compartilhados

## Estrutura

```text
apps/site          site publico
apps/admin         painel administrativo
packages/core      contratos, tipos e regras compartilhadas
packages/mock      backend local para desenvolvimento
packages/supabase  adapter Supabase
supabase           schema SQL, RLS e seed
docs               checklist de setup e deploy
```

## Desenvolvimento

```bash
npm install
npm run dev:site
npm run dev:admin
```

Sem `.env`, o projeto usa backend local mock.

Login demo:

```text
admin@4ibib.local
123456
```

## Producao

Use `.env.example` como base:

```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY_PUBLICA
```

Leia [docs/setup-checklist.md](docs/setup-checklist.md) antes de conectar Supabase e Cloudflare.

## Validacao

```bash
npm run typecheck
npm test
npm run build
```
