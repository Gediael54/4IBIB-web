# ADR 0003 — Monorepo com npm workspaces

**Status**: Accepted (2026-05-02)

## Context

O projeto tem dois apps (`site` publico e `admin` CMS) que compartilham contratos de dominio (`packages/core`) e adapter de backend (`packages/supabase`). Precisavamos de uma estrategia de monorepo que:

- Evitasse duplicacao de versao de TypeScript/React/Vite.
- Permitisse `import` direto entre pacotes em dev sem build step intermediario.
- Fosse trivial pra um time pequeno (1-2 devs) operar sem aprender ferramenta nova.
- Funcionasse no build do Cloudflare Pages, que ja roda `npm install` por padrao.

Alternativas modernas (pnpm, yarn berry, turborepo, nx) ofereceriam cache de build incremental e symlinks mais eficientes, mas custariam complexidade.

## Decision

Usar **npm workspaces** nativo. `package.json` raiz declara:

```json
"workspaces": ["apps/*", "packages/*"]
```

Scripts orquestrados via `--workspaces` ou referencia direta (`npm run dev --workspace apps/site`). Sem turbo, sem nx, sem pnpm.

## Consequences

- Positivas:
  - Zero ferramenta extra: qualquer dev que conhece `npm` consegue contribuir.
  - `npm install` na raiz resolve tudo. Cloudflare Pages funciona sem config especial.
  - `tsconfig` references + `paths` permitem import cross-package sem build prevoo.
  - Vitest roda nativo nos workspaces sem plugin.
- Negativas:
  - Sem cache de build incremental: `npm test` re-executa tudo do zero.
  - Resolucao de deps duplicadas e menos esperta que pnpm (algumas hoists pesados em `node_modules`).
  - Ao crescer (ex.: 5+ apps), provavelmente migraremos pra pnpm + turborepo.

## Alternatives Considered

- **pnpm workspaces** — rejeitado por ora: melhor `node_modules` flat e content-addressable store, mas exige ferramenta extra no CI/local. Reavaliar quando passar de 3 packages.
- **turborepo** — rejeitado por ora: cache distribuido de build seria valioso so se tivessemos CI pesado e build de 10+ minutos. Hoje `npm run build` leva ~30s.
- **nx** — rejeitado: opinionado demais pra um monorepo pequeno; convencao engessa estrutura.
