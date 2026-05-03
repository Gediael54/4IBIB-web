# 4IBIB Web

Site publico e painel admin da **4a Igreja Batista Independente Betel** (igreja batista de perfil reformado, nao neopentecostal).

Para detalhes operacionais, decisoes confirmadas com o time e backlog aberto, leia [`CLAUDE.md`](./CLAUDE.md). Planos de longo prazo vivem em [`docs/plans/`](./docs/plans/) e decisoes de arquitetura em [`docs/adr/`](./docs/adr/).

## Stack

- React 19 + Vite 7 + TypeScript estrito
- Supabase (Postgres + Auth + RLS) como unico backend
- Cloudflare Pages para hospedagem (site em `/`, admin em `/admin/`)
- npm workspaces para o monorepo
- Vitest com cobertura de 100% obrigatoria em `packages/core` e `packages/supabase`

## Estrutura

```text
apps/
  site/        # site publico (porta 5173 em dev)
  admin/       # painel CMS (porta 5174 em dev, deploy em /admin/)
packages/
  core/        # tipos de dominio + utilidades puras
  supabase/    # adapter para Supabase
supabase/
  schema.sql   # fonte unica idempotente: estrutura, RLS, funcoes, triggers, seed
  sources/     # planilhas/fontes externas de seed
scripts/       # compose-dist e geracao de seed inline
docs/
  plans/       # planos de longo prazo
  adr/         # architecture decision records
```

`apps/*` consomem somente `@4ibib/core` (tipos/regras puras) e `@4ibib/supabase` (adapter). Detalhes de Supabase nao vazam pra UI.

## Setup local

1. Instalar dependencias.

   ```bash
   npm install
   ```

2. Copiar `.env.example` para `.env` na raiz do repo e preencher as variaveis. As variaveis `VITE_*` sao lidas pelo Vite a partir da raiz (cada `apps/*/vite.config.ts` aponta `envDir: "../.."`):

   ```bash
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   A `Publishable key` (`sb_publishable_*`) e segura no bundle. A `service_role` / `secret key` **nunca** vai pro `.env` do Vite — secrets de servidor (Cloudflare Pages, Turnstile) ficam no painel do provedor.

3. Comandos de desenvolvimento:

   ```bash
   npm run dev:site      # site em http://localhost:5173
   npm run dev:admin     # admin em http://localhost:5174
   npm run typecheck     # typecheck em todos os workspaces
   npm test              # vitest run com cobertura
   npm run build         # gera dist/ pronto pra Cloudflare Pages
   ```

Antes de conectar Supabase real e Cloudflare, leia [`docs/setup-checklist.md`](./docs/setup-checklist.md). No Supabase SQL Editor, rode `supabase/schema.sql` (idempotente) — ele aplica schema, enums, RLS, policies, funcoes, triggers e seed da programacao inline (regerado por `npm run seed:schedule`).

## Deploy

Hospedagem em Cloudflare Pages.

- **Build command**: `npm run build`
- **Output directory**: `dist/`

O script `scripts/compose-dist.mjs` combina o build do site com o build do admin sob `/admin/` no mesmo `dist/`.

## Testes

Vitest com gate de cobertura 100% em `packages/core` e `packages/supabase` (configurado em `vitest.config.ts`). Quebrar a cobertura quebra o pipeline. Apps nao tem gate de cobertura mas devem manter typecheck verde.

```bash
npm test
npm run typecheck
```

## Contribuindo

- **Conventional commits** (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:` etc.).
- **Sem trailer `Co-Authored-By`**.
- **Staging individual** por arquivo (sem `git add -A` ou `git add .`).
- **Um commit por mudanca logica**, mensagem descrevendo exatamente o que foi alterado.
- Ao criar commits via Claude, usar a skill em `~/.claude/skills/commit/SKILL.md`.
- Strings em PT-BR sem acentos (convencao do projeto, compatibilidade mais ampla).
- Sem comentarios explicando WHAT — codigo auto-explicativo. Comentario so pra WHY nao-obvio.

## Links

- [`CLAUDE.md`](./CLAUDE.md) — contexto completo do projeto, decisoes e backlog
- [`docs/plans/admin-master-plan.md`](./docs/plans/admin-master-plan.md) — plano master de features do admin
- [`docs/plans/quality-roadmap.md`](./docs/plans/quality-roadmap.md) — roadmap de qualidade S+++
- [`docs/plans/ui-redesign.md`](./docs/plans/ui-redesign.md) — fase de redesign visual
- [`docs/adr/`](./docs/adr/) — architecture decision records
- [`docs/setup-checklist.md`](./docs/setup-checklist.md) — checklist de provisionamento Supabase + Cloudflare
