# Supabase

Use `apply-now.sql` no SQL Editor do Supabase.

Arquivos fonte:

- `schema.sql`: estrutura, funcoes, indices, triggers, RLS, policies e dados bootstrap.
- `seed.sql`: programacao gerada de `sources/Escala-de-cultos.xlsx`.
- `apply-now.sql`: arquivo consolidado gerado para execucao manual.
- `sources/`: arquivos externos usados para gerar seeds.

Ao alterar `schema.sql`, a planilha ou `scripts/seed-from-xlsx.mjs`, rode:

```bash
npm run supabase:build
```

Isso regenera o seed e o script consolidado.
