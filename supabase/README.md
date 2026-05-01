# Supabase

`schema.sql` e o unico script. Cole ele inteiro no SQL Editor do Supabase para
aplicar tudo: estrutura, indices, RLS, funcoes, triggers e seed dos eventos.

## Estrutura do arquivo

1. Reset (drop tudo do schema public)
2. Extensoes
3. Enum types
4. Tabelas (estado final, todas as constraints inline)
5. Funcoes
6. Indices
7. Triggers
8. RLS e policies
9. Seed da programacao (entre os marcadores `BEGIN SEED` / `END SEED`,
   gerado a partir das planilhas em `sources/`)

Roda numa transacao so — se algo falha, rollback.

## Atualizar o seed

Edite as planilhas em `sources/` e rode:

```bash
npm run seed:schedule
```

O script substitui apenas o bloco entre os marcadores `BEGIN SEED` e
`END SEED` no fim de `schema.sql`. As demais secoes nao sao tocadas.
