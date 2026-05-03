# ADR 0004 — Publishable key do Supabase embedada no bundle frontend

**Status**: Accepted (2026-05-02)

## Context

Tanto o site publico quanto o admin sao SPAs estaticos servidos via Cloudflare Pages. Para conversar com Supabase (Postgres + Auth), o cliente browser precisa de uma chave. Supabase oferece dois tipos:

- `sb_publishable_*` (antiga `anon key`) — segura para frontend; sozinha, so consegue o que RLS permite ao role `anon` ou ao role do usuario logado.
- `service_role` / `secret key` — bypass de RLS; **nunca** pode ir pro browser.

A questao e: tudo bem hardcodar `sb_publishable_*` no bundle Vite, ou deveriamos proxiar via backend pra esconder ate isso?

## Decision

Embedar `VITE_SUPABASE_PUBLISHABLE_KEY` no bundle Vite (`.env` na raiz, `envDir: "../.."`). Nunca colocar `service_role` no `.env` do Vite — secrets de servidor ficam apenas em variaveis de ambiente do Cloudflare Pages / Supabase Edge Functions, fora do alcance do build do frontend.

Mutations sensiveis (insert/update/delete em `admin_users`, `prayer_requests`, etc.) sao protegidas por:

1. **Auth obrigatorio** no painel admin (Supabase Auth com email/senha via `signInWithPassword`).
2. **RLS policies** que checam `is_admin()` (ver ADR 0002).
3. **Audit log** via trigger captura toda mutacao com `auth.uid()` do executor.

## Consequences

- Positivas:
  - Sem backend proprio pra manter. Cliente browser conversa direto com Postgres via Supabase.
  - Build estatico cacheavel agressivamente em CDN (Cloudflare Pages).
  - Latencia minima: zero hops intermediarios.
  - Rotacao de key publica e trivial (gerar nova no painel, atualizar `.env`, rebuild).
- Negativas:
  - URL e chave publica do projeto Supabase ficam visiveis em DevTools. Nao e secret, mas e um indicador de attack surface — DDoS no projeto e mitigado por rate limit do Supabase.
  - Qualquer fragilidade em RLS vira fragilidade publica imediatamente — RLS precisa de auditoria continua.

## Alternatives Considered

- **Proxy backend (Cloudflare Workers ou Functions)** — rejeitado: triplicaria complexidade pra esconder algo que ja e safe-by-design. Reservamos Workers/Functions pra casos onde RLS nao cobre (ex.: validacao Turnstile pre-insert no form de oracao).
- **Edge Function pra cada read** — rejeitado: latencia +50-100ms por chamada, custo de manutencao alto, e perde o realtime/`select` rico que o supabase-js da gratis.
- **Rotacionar service_role pra ficar em secrets do Pages** — ja eh assim. ADR cobre apenas a publishable key.
