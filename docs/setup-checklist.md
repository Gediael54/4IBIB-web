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
```

Nao envie nem coloque no frontend:
- `service_role key`
- senha do banco
- tokens pessoais do GitHub ou Cloudflare

## Passos No Supabase

1. Criar um projeto Supabase.
2. Abrir `SQL Editor`.
3. Rodar o arquivo `supabase/schema.sql`.
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
```

## Seguranca

O frontend usa a `anon key`, que e publica por natureza. A seguranca real fica nas policies RLS em `supabase/schema.sql`.
Em projetos novos do Supabase, prefira a `Publishable key` em vez da legacy `anon key`.

Regras aplicadas:
- Conteudo institucional pode ser lido por qualquer pessoa.
- Avisos, programacao, ministerios e perfil so podem ser editados por usuarios em `admin_users`.
- Pedidos de oracao podem ser enviados pelo publico.
- Pedidos de oracao nao podem ser lidos pelo publico.
- Apenas admins autenticados podem listar e atualizar pedidos de oracao.

## Por Que Existem Duas Pastas Com Supabase?

`supabase/` guarda infraestrutura:
- schema SQL
- tabelas
- triggers
- RLS
- seeds

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

Por padrao, sem `.env`, o projeto usa `VITE_BACKEND=mock`, com dados locais e login demo:

```text
admin@4ibib.local
123456
```

## Validacao

```bash
npm run typecheck
npm test
npm run build
```

O projeto esta configurado para exigir 100% de cobertura nos pacotes compartilhados `core` e `mock`.
