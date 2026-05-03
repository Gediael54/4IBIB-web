# ADR 0005 — Paleta visual bronze sobre navy

**Status**: Accepted (2026-05-02)

## Context

A 4a IBIB e uma igreja batista de perfil reformado, **nao neopentecostal**. A identidade visual precisa refletir essa sobriedade: institucional, calorosa mas sem excesso, distante de gradients neon, animacoes festivas ou tipografia futurista que sao comuns em sites de igrejas mais carismaticas. Ao mesmo tempo, nao queriamos um visual frio/corporativo que perdesse o tom acolhedor de comunidade.

Tambem precisavamos suportar light + dark mode no admin (uso prolongado de quem edita conteudo) e manter contraste WCAG AA em ambos.

## Decision

Adotar paleta **bronze sobre navy** com tokens centralizados em `apps/admin/src/styles/tokens.css`:

- Navy profundo como base institucional (autoridade, sobriedade, peso).
- Bronze quente como acento (calor, comunidade, contraste suficiente sobre navy).
- Off-white quase imperceptivel como surface no light mode.
- Inversao por **role** (nao por hue): no dark mode, `--color-background` e `--color-surface` trocam de funcao mantendo o mesmo bronze de acento. Isso preserva a identidade da marca em ambos os modos.

Tokens sao referenciados via CSS custom properties, e componentes consomem `--color-*`, `--space-*`, `--radius-*`, `--font-*` — nao hex/px hardcoded.

## Consequences

- Positivas:
  - Identidade visual coerente com perfil teologico/institucional da igreja.
  - Dark mode preserva marca (acento mantido) sem virar "tema invertido" generico.
  - Tokens centralizados facilitam ajustes globais (ex.: aumentar contraste, mudar saturacao).
  - Contraste AA garantido em ambos os modos.
- Negativas:
  - Paleta restrita: designers podem se sentir limitados ao adicionar feature visual nova.
  - Bronze quente reduz espaco pra cores semanticas fortes (success/warning/error) — tivemos que calibrar essas cores pra nao competir com o acento.

## Alternatives Considered

- **Gradient bombastico (rosa/laranja, "worship night")** — rejeitado: dissonante com o perfil reformado da igreja. Comunica emocao performatica em vez de gravidade institucional.
- **Branco puro + acento azul royal corporativo** — rejeitado: frio demais, perde o "acolhedor de comunidade".
- **Preto + dourado metalico** — rejeitado: caminho pretensioso, lembra clube fechado em vez de igreja aberta a comunidade.
- **Tema customizavel pelo usuario** — rejeitado: complexidade desproporcional pra um admin com 1-2 editores ativos.
