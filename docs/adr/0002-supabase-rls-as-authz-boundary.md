# ADR 0002 — Supabase RLS como fronteira autoritativa de autorizacao

**Status**: Accepted (2026-05-02)

## Context

O painel admin escreve em todas as tabelas relevantes (avisos, ministerios, escala, voluntarios, oracoes, audit log) usando o mesmo cliente Supabase exposto no bundle do navegador. A `Publishable key` (`sb_publishable_*`) e segura no frontend, mas nao carrega permissoes — qualquer pessoa com o link do admin pode tentar disparar `update`/`delete`. Precisavamos de uma fronteira de autorizacao que **nao confiasse no front** e nao dependesse de um backend Node intermediario.

Tambem queriamos evitar recursao infinita de policies (problema classico quando policy de tabela A consulta tabela B que tambem tem policy referenciando A).

## Decision

RLS habilitado em **todas** as tabelas. Policies escritas em SQL, autoritativas no banco, expressas via funcoes `security definer`:

- `is_admin()` — checa se `auth.uid()` esta em `admin_users`.
- `is_owner(row_user uuid)` — checa propriedade para casos restritos.

Funcoes `security definer` evitam recursao ao executar com privilegio do owner do schema. UI nunca decide autorizacao — apenas reflete o que o banco aceita ou rejeita. Frontend trata erro `403` como "nao autorizado" e exibe mensagem.

Leitura publica (anon) liberada apenas para conteudo institucional (avisos publicados, programacao, ministerios). `prayer_requests` e `content_audit_log` exigem `is_admin()`.

## Consequences

- Positivas:
  - Uma unica fonte de verdade para authz (o banco).
  - Bypass de UI nao concede privilegio: chamar a API direto com a mesma key publica nao escala permissao.
  - Admin pode ser servido como SPA estatica em CDN sem backend proprio.
  - Audit log via trigger captura mutacoes mesmo se feitas fora da UI.
- Negativas:
  - Erros de policy aparecem como `403` opaco na UI; debugging exige inspecionar logs do Supabase.
  - Escrever SQL de policy e mais hostil que escrever middleware Node.
  - Mudancas de schema exigem revisar matriz inteira de RLS pra evitar lock-out.

## Alternatives Considered

- **Autorizacao em backend Node proprio** — rejeitado: introduz infra a manter, latencia extra, e duplica regra que o Postgres ja consegue expressar. Reservamos backend custom (edge functions) so pra casos que RLS nao cobre (validacao Turnstile pre-insert).
- **Roles em JWT + checagem na UI** — rejeitado: confiar no front pra authz e furo classico de seguranca. JWT roles ate sao usadas como input pras policies, mas a decisao final e do banco.
