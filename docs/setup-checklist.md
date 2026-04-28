# Setup Checklist

Este projeto foi montado para comecar gratis e continuar facil de migrar.

Stack recomendada:

- Frontend: Cloudflare Pages
- Backend: Supabase
- App: React + Vite + TypeScript
- Monorepo: npm workspaces

## Contas Que Voce Precisa Criar

1. GitHub
   Use para guardar o codigo e conectar deploy automatico.

2. Cloudflare
   Use para hospedar o site publico e o painel admin como site estatico.

3. Supabase
   Use para banco Postgres, Auth e policies de seguranca.

4. Dominio
   Opcional no comeco. Pode usar o subdominio gratuito do Cloudflare Pages.

## Dados Que Voce Vai Precisar Me Passar

Crie um arquivo `.env` baseado em `.env.example`:

```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY_PUBLICA
VITE_PRAYER_ENDPOINT=/api/prayer
VITE_TURNSTILE_SITE_KEY=SUA_SITE_KEY_PUBLICA
VITE_SENTRY_DSN=SEU_DSN_PUBLICO_OPCIONAL
```

Nao envie nem coloque no frontend:

- `service_role key`
- senha do banco
- tokens pessoais do GitHub ou Cloudflare

## Passos No Supabase

1. Criar um projeto Supabase.
2. Abrir `SQL Editor`.
3. Rodar o arquivo unico `supabase/apply-now.sql`.
4. Ir em `Authentication > Users`.
5. Criar o usuario admin com email e senha.
6. Copiar o `User UID` do usuario criado.
7. Rodar no SQL Editor:

```sql
insert into public.admin_users (user_id, role)
values ('COLE_AQUI_O_USER_UID', 'owner');
```

Sem esse registro em `admin_users`, o usuario ate consegue autenticar, mas nao consegue editar conteudo.

## Passos No Cloudflare Pages

1. Criar um projeto Pages conectado ao GitHub.
2. Build command:

```bash
npm run build
```

3. Output directory:

```bash
dist
```

4. Adicionar variaveis de ambiente:

```bash
VITE_BACKEND=supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA_PUBLISHABLE_KEY_PUBLICA
VITE_PRAYER_ENDPOINT=/api/prayer
VITE_TURNSTILE_SITE_KEY=SUA_SITE_KEY_PUBLICA
VITE_SENTRY_DSN=SEU_DSN_PUBLICO_OPCIONAL
```

Adicionar como secrets, nao como plaintext publico:

```bash
TURNSTILE_SECRET_KEY=SUA_SECRET_KEY_DO_TURNSTILE
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY_DO_SUPABASE
```

## Seguranca

O frontend usa a `anon key`, que e publica por natureza. A seguranca real fica nas policies RLS geradas em `supabase/apply-now.sql`.
Em projetos novos do Supabase, prefira a `Publishable key` em vez da legacy `anon key`.

Para o formulario publico de oracao, o site usa Cloudflare Turnstile no navegador e a Pages Function `/api/prayer` no servidor. Essa function valida o token anti-spam, aplica rate-limit por IP hasheado e grava no Supabase com `SUPABASE_SERVICE_ROLE_KEY`.

Se uma secret foi compartilhada em conversa ou print, rotacione:

1. Cloudflare Dashboard > Turnstile > widget > rotate secret key.
2. Cloudflare Pages > Settings > Variables and Secrets > atualize `TURNSTILE_SECRET_KEY`.
3. Faça novo deploy.

Para a legacy service_role JWT do Supabase:

1. Supabase Dashboard > Project Settings > API Keys.
2. Confirme que o frontend usa `sb_publishable_...`.
3. Procure usos antigos de `anon`, `service_role`, `sb_secret_...` ou JWT começando com `eyJ`.
4. Depois de confirmar que nada depende das chaves antigas, desabilite/rotacione as legacy API keys no painel.

Regras aplicadas:

- Conteudo institucional pode ser lido por qualquer pessoa.
- Avisos, programacao, ministerios e perfil so podem ser editados por usuarios em `admin_users`.
- Pedidos de oracao podem ser enviados pelo publico apenas via Pages Function `/api/prayer`, com Turnstile e rate-limit.
- Pedidos de oracao nao podem ser lidos pelo publico.
- Apenas admins autenticados podem listar e atualizar pedidos de oracao.

## Como O SQL Do Supabase Esta Organizado

Para operar no painel do Supabase, use somente `supabase/apply-now.sql`. Ele e gerado a partir de arquivos menores para manter o repo organizado:

- `supabase/schema.sql`: estrutura, funcoes, indices, triggers, RLS, policies e bootstrap.
- `supabase/seed.sql`: programacao gerada da planilha.
- `supabase/apply-now.sql`: arquivo consolidado para colar/rodar no SQL Editor.
- `supabase/sources/`: fontes externas, como a planilha da programacao.

Quando alterar estrutura ou a planilha, rode:

```bash
npm run supabase:build
```

## Por Que Existem Duas Pastas Com Supabase?

`supabase/` guarda infraestrutura:

- schema SQL
- tabelas
- triggers
- RLS
- seeds
- script consolidado `apply-now.sql`

`packages/supabase/` guarda codigo da aplicacao:

- adapter TypeScript
- mapeamento das tabelas para os tipos do dominio
- auth gateway
- repository usado pelos apps

Essa separacao evita acoplamento. O site e o painel dependem de `packages/core`, nao de detalhes do Supabase.

## Como Rodar Local

```bash
npm install
npm run dev:site
npm run dev:admin
```

Por padrao, sem `.env`, o projeto usa `VITE_BACKEND=mock` para dados locais. Para habilitar login local no admin, crie `.env.local` com credenciais mock:

```bash
VITE_MOCK_ADMIN_EMAIL=admin.local@4ibib.test
VITE_MOCK_ADMIN_PASSWORD=troque-esta-senha
VITE_MOCK_ADMIN_DISPLAY_NAME=Administrador
```

## Validacao

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

O projeto esta configurado para exigir 100% de cobertura nos pacotes compartilhados `core`, `mock`, `runtime` e `supabase`.
