# ADR 0001 — Arquitetura hexagonal com core puro e adapter Supabase

**Status**: Accepted (2026-05-02)

## Context

O projeto comecou como um SPA simples consumindo Supabase. A medida que o painel admin cresceu (CRUDs de avisos, ministerios, escala anual, voluntarios, oracoes, audit log), surgiu o risco de espalhar chamadas `supabase-js` por componentes React, dificultando teste, troca de backend e enforcement de regras de dominio. Tambem precisavamos garantir que as utilidades de dominio (parse de nomes, formatacao de data, validacao de contato) fossem 100% testaveis sem subir cliente HTTP.

Alem disso, a interface de leitura/escrita (`ContentRepository`) crescia de forma nao-coesa: componentes pequenos importavam um repo gigante, violando ISP.

## Decision

Adotar separacao em tres camadas no monorepo:

1. **`packages/core`** — tipos de dominio, contratos (`ContentRepository` fragmentado em sub-interfaces por agregado: `AnnouncementsRepository`, `MinistriesRepository`, etc.), e utilidades puras. Zero dependencias de runtime alem de TypeScript. Cobertura 100%.
2. **`packages/supabase`** — implementacao concreta dos contratos via `@supabase/supabase-js`. Cobertura 100%.
3. **`apps/site` e `apps/admin`** — UI React. Importam apenas `@4ibib/core` (contratos/utils) e `@4ibib/supabase` (factory de adapter). Nao instanciam clients Supabase diretamente.

## Consequences

- Positivas:
  - Testes unitarios de regra de dominio rodam em milissegundos, sem mock de rede.
  - Trocar Supabase por outro backend (ou edge function intermediaria) requer apenas novo adapter, sem tocar UI.
  - ISP respeitado: cada view importa so o sub-repositorio que precisa.
  - Gate de cobertura 100% em `core` e `supabase` evita regressao silenciosa.
- Negativas:
  - Indirection extra: ler um campo as vezes passa por contrato + adapter + view.
  - Disciplina exigida: tentacao de chamar Supabase direto em prototipos.

## Alternatives Considered

- **Cliente Supabase direto na UI** — rejeitado: acopla view ao SDK, dificulta teste sem mock pesado, e espalha string de tabela/coluna por componentes.
- **Backend Node intermediario (Express/Fastify)** — rejeitado: time pequeno, sem operacao de servidor 24/7 desejada. Cloudflare Pages + Supabase entrega o mesmo SLA com custo zero. Edge functions ficam reservadas para casos pontuais (Turnstile validation).
