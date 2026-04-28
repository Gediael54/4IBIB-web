# Supabase

`schema.sql` e o unico script. Cole ele inteiro no SQL Editor do Supabase para
aplicar (ou reaplicar) tudo: estrutura, indices, RLS, bootstrap e seed dos
eventos.

## Estrutura do arquivo

1. Extensoes
2. Tabelas (estado final, todas as constraints inline)
3. Funcoes
4. Indices
5. Views
6. Triggers
7. RLS e policies
8. Bootstrap (singleton de `church_profile` + reunioes recorrentes padrao)
9. Seed da programacao (entre os marcadores `BEGIN SEED` / `END SEED`,
   gerado a partir de `sources/Escala-de-cultos.xlsx`)

Tudo e idempotente: rodar de novo nao duplica dados nem quebra dados ja
existentes.

## Atualizar o seed

Edite a planilha em `sources/Escala-de-cultos.xlsx` e rode:

```bash
npm run seed:schedule
```

O script substitui apenas o bloco entre os marcadores `BEGIN SEED` e
`END SEED` no fim de `schema.sql`. As demais secoes nao sao tocadas.
