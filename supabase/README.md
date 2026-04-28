# Supabase

Use `apply-now.sql` no SQL Editor do Supabase para aplicar tudo de uma vez.

## Arquivos

- `schema.sql`: versao canonica do banco organizada em secoes:
  1. Extensoes
  2. Tabelas (estado final)
  3. Funcoes
  4. Migracoes legadas (idempotentes; viram no-op em bancos novos)
  5. Indices
  6. Views
  7. Triggers
  8. RLS e policies
  9. Bootstrap (singleton de `church_profile` + reunioes recorrentes padrao)
- `seed.sql`: programacao gerada a partir de `sources/Escala-de-cultos.xlsx`.
- `apply-now.sql`: arquivo consolidado gerado a partir de `schema.sql` + `seed.sql`.
- `sources/`: arquivos externos usados para gerar seeds.

## Como ler `schema.sql`

Para entender o estado final do banco, leia da secao 1 ate a 3 e depois 5 a 9.
A secao 4 so existe para subir bancos antigos ate a forma canonica e e
totalmente segura em bancos novos. Cada subsecao explica de onde para onde
estao migrando.

## Regenerar o consolidado

Apos alterar `schema.sql`, a planilha ou `scripts/seed-from-xlsx.mjs`:

```bash
npm run supabase:build
```

Isso regera `seed.sql` e `apply-now.sql`.
