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
supabase           schema.sql unico (estrutura, RLS, policies e seed inline) para rodar no Supabase
docs               checklist de setup e deploy
```

## Desenvolvimento

```bash
npm install
npm run dev:site
npm run dev:admin
```

Sem `.env`, o projeto usa backend local mock para conteudo.

Para habilitar login local no admin, defina credenciais mock em `.env.local`:

```bash
VITE_MOCK_ADMIN_EMAIL=admin.local@4ibib.test
VITE_MOCK_ADMIN_PASSWORD=troque-esta-senha
VITE_MOCK_ADMIN_DISPLAY_NAME=Administrador
```

## Producao

Use `.env.example` como base:

```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY_PUBLICA
VITE_PRAYER_ENDPOINT=/api/prayer
VITE_TURNSTILE_SITE_KEY=SUA_SITE_KEY_PUBLICA
VITE_SENTRY_DSN=SEU_DSN_PUBLICO_OPCIONAL
```

Configure como secrets no Cloudflare Pages, nunca no frontend:

```bash
TURNSTILE_SECRET_KEY=SUA_SECRET_KEY_DO_TURNSTILE
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_DO_SUPABASE
```

Como a secret do Turnstile ja foi compartilhada em conversa, rotacione-a no painel do Cloudflare Turnstile e atualize `TURNSTILE_SECRET_KEY`.

Leia [docs/setup-checklist.md](docs/setup-checklist.md) antes de conectar Supabase e Cloudflare.

No Supabase SQL Editor, rode o arquivo unico:

```text
supabase/schema.sql
```

Ele e idempotente e junta schema, enums, RLS, policies, funcoes, triggers e seed da programacao inline (regerado por `npm run seed:schedule`).

## Validacao

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run seed:schedule
```
