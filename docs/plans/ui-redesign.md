# Fase 16 — UI redesign

Documento de recomendacao apos pesquisa em ~12 referencias de admin UI de alta qualidade. Baseado em Linear, Vercel Geist, Stripe, Supabase Studio, Notion, Sanity Studio, Shopify Polaris, GitHub, Resend e CMS Design System (USA gov). Segue convencao do projeto (PT-BR sem acentos, vanilla CSS, sem UI library).

## Status

- **Wave 1** — Tokens + shell + theme toggle: ✅ COMPLETA.
- **Wave 2** — Padroes de lista e form (primitivos): ✅ COMPLETA.
- **Wave 3** — Migracao das views: ⏳ EM ANDAMENTO.
- **Wave 4** — Mobile: ⏳ EM ANDAMENTO.
- **Wave 5** — Polish (toasts, axe-core): ⏸ PENDENTE.

## 16.1 Resumo de pesquisa

- **Linear (refresh 2026)** — migrou de HSL para LCH para uniformidade visual entre matizes. Sidebar intencionalmente "mais opaca" para o conteudo principal sobressair. Inter Display em headings. Reduziu uso de chrome (azul) para ficar mais neutro/atemporal.
- **Vercel Geist** — sistema monocromatico extremo (preto/branco + 1 acento), com escala de 10 niveis numerados. Suporte P3. Theme switcher sempre presente em settings/footer.
- **Stripe Dashboard** — densidade alta com hierarquia via peso de fonte (nao tamanho). Skeletons "shimmer" no formato do conteudo, nao spinners. Patterns explicitos em docs (List, Form, EmptyState).
- **Supabase Studio** — sidebar dupla auto-collapsivel: nivel 1 (areas funcionais) + nivel 2 (sub-tarefas). Patterns publicados (Forms, Layout, EmptyState).
- **Notion** — dois command palettes: Cmd+P (navegacao/acoes globais) e "/" inline (insercao de blocos).
- **Sanity Studio** — `field groups` em formularios longos (tabs internas) e `fieldsets` para agrupar campos relacionados. Schema-driven UI.
- **Shopify Polaris** — escala de espaco baseada em multiplicador percentual de 4px (spacing-100, spacing-200). Type scale ratio 1.2 (major third).
- **Resend / Render / Railway** — minimalismo radical: 3-5 cards no dashboard, fonte Inter, sem cores acessorias, acento unico.
- **CMS Design System (USA)** — autosave so em campos de baixo impacto, sempre com loading state. Validacao on-submit com summary no topo + inline. Sticky save bar com status indicator.

## 16.2 Principios para ESTE admin

1. **Densidade media-alta, nao maxima.** Lideranca da igreja nao usa o admin oito horas por dia. Espaco em branco generoso vence sobre densidade Linear-style. Alvo: 14px body, 13px tabelas, 16px headings de view.
2. **Sidebar simples de 1 nivel.** 10 views nao justifica double-sidebar. Lista vertical icones + labels; nao colapsavel em desktop.
3. **Acento bronze preservado, neutralizado em modo escuro.** Bronze-on-navy e identidade. Light mode usa acento bronze sobre fundo creme/off-white. Vercel-style: 1 acento, restante neutro.
4. **Mobile = drawer + bottom-action-bar contextual.** 10 views nao cabe em bottom tab bar. Drawer (offcanvas) navegacao + barras de acao contextuais (sticky bottom) para Save/Cancel/Delete em forms. Annual schedule precisa modo "lista por mes" no mobile.
5. **Forms longos com field groups (Sanity-style).** ProfileView e VolunteerView se beneficiam de tabs internas; AnnouncementForm fica linear.
6. **Skeletons shaped, nao spinners.** Substituir LoaderCircle das listas por linhas-skeleton com shimmer. Spinners so em mutations curtas (botao salvar).
7. **Cmd-K continua protagonista.** Adicionar dica visivel "Cmd+K" no header.
8. **Sem dark-mode-first.** Light default + toggle persistente. `prefers-color-scheme` so se usuario nunca tocou no toggle.

## 16.3 Design tokens

### Cores — modo claro (default)

```css
:root,
[data-theme="light"] {
  /* Surfaces */
  --bg-base: #fbf9f5;
  --bg-elevated: #ffffff;
  --bg-sunken: #f2eee6;
  --bg-overlay: rgba(20, 20, 22, 0.45);

  /* Text */
  --text-primary: #1a1a1f;
  --text-secondary: #43434b;
  --text-tertiary: #6b6b73;
  --text-muted: #9a9aa0;
  --text-on-accent: #ffffff;

  /* Borders */
  --border-subtle: #ece7dc;
  --border-default: #ddd6c5;
  --border-strong: #b8ae94;

  /* Accent (bronze) */
  --accent: #8b6f3a;
  --accent-hover: #75592a;
  --accent-active: #5f4720;
  --accent-soft: #f0e7d4;
  --accent-ring: rgba(139, 111, 58, 0.35);

  /* Semantic */
  --success: #2f7a48;
  --success-soft: #dbeedd;
  --warning: #b47416;
  --warning-soft: #f8eac9;
  --danger: #b23a3a;
  --danger-soft: #f4dcdc;
  --info: #2d5faf;
  --info-soft: #dce5f4;
}
```

### Cores — modo escuro

```css
[data-theme="dark"] {
  --bg-base: #0f1620;
  --bg-elevated: #18212e;
  --bg-sunken: #0a0f17;
  --bg-overlay: rgba(0, 0, 0, 0.65);

  --text-primary: #ece7dc;
  --text-secondary: #bfb7a4;
  --text-tertiary: #8c8678;
  --text-muted: #5c594f;
  --text-on-accent: #1a1a1f;

  --border-subtle: #1f2a3a;
  --border-default: #2a3849;
  --border-strong: #455567;

  --accent: #d6a867;
  --accent-hover: #e2b97d;
  --accent-active: #bc8f4e;
  --accent-soft: rgba(214, 168, 103, 0.15);
  --accent-ring: rgba(214, 168, 103, 0.45);

  --success: #6bb97e;
  --success-soft: rgba(107, 185, 126, 0.15);
  --warning: #e5b664;
  --warning-soft: rgba(229, 182, 100, 0.15);
  --danger: #e07878;
  --danger-soft: rgba(224, 120, 120, 0.15);
  --info: #7ea5dd;
  --info-soft: rgba(126, 165, 221, 0.15);
}
```

Todos os pares text/bg verificados contra WCAG AA (≥4.5:1 body, ≥3:1 large).

### Spacing — base 4px

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-8: 48px;
--space-10: 64px;
--space-12: 96px;
```

### Radius

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-2xl: 16px;
--radius-full: 9999px;
```

### Tipografia — ratio 1.2 (major third)

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-display: "Inter", system-ui, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

--text-xs: 12px;
--text-sm: 13px;
--text-base: 14px;
--text-md: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 32px;

--leading-tight: 1.25;
--leading-snug: 1.4;
--leading-base: 1.5;
--leading-loose: 1.7;

--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;

--tracking-tight: -0.01em;
--tracking-base: 0;
--tracking-wide: 0.04em;
```

Inter habilitada com `font-feature-settings: "cv11", "ss01", "ss03"` para tabular numerals.

### Shadows / elevacao

```css
/* Light */
--shadow-sm: 0 1px 2px rgba(20, 20, 22, 0.04);
--shadow-md: 0 2px 4px rgba(20, 20, 22, 0.06), 0 1px 2px rgba(20, 20, 22, 0.04);
--shadow-lg: 0 8px 16px rgba(20, 20, 22, 0.08), 0 2px 4px rgba(20, 20, 22, 0.04);
--shadow-xl: 0 24px 48px rgba(20, 20, 22, 0.12), 0 8px 16px rgba(20, 20, 22, 0.06);

/* Dark redefine para opacidade maior + ring sutil */
[data-theme="dark"] {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 2px 4px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  --shadow-xl: 0 24px 48px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}
```

### Z-index

```css
--z-base: 0;
--z-sticky: 10;
--z-drawer: 40;
--z-modal: 50;
--z-toast: 60;
--z-cmdk: 70;
--z-tooltip: 80;
```

## 16.4 Layout strategy

**Desktop (≥1024px)** — sidebar fixa de 240px (logo + 10 NavButtons + theme toggle + user menu rodape) + workspace fluido. Workspace max-width 1200px centralizado. Padding 32px horizontal, 24px vertical. Sidebar nao colapsavel.

**Tablet (768-1023px)** — sidebar reduz para 64px (so icones com tooltip on hover). Workspace padding 24/20. Theme toggle move para popover do user menu.

**Mobile (<768px)** — sidebar desaparece. Topbar fixa: hamburger (esquerda) + titulo da view (centro) + acao primaria contextual (direita). Hamburger abre drawer overlay (push da esquerda, 280px, com backdrop). Forms longas ganham sticky bottom action bar com Save/Cancel.

```css
--bp-sm: 480px;
--bp-md: 768px;
--bp-lg: 1024px;
--bp-xl: 1280px;
```

## 16.5 Component patterns

**ListView (CrudPanel)**

- Header: titulo (text-xl semibold) + contador (text-sm tertiary) + acao primaria a direita.
- Toolbar: search input (icon left, 36px alto) + filtros (chips) + view toggle. Padding 12/16. Sticky abaixo do view header.
- Rows: 56px altura padrao em lista, 40px em tabelas densas. Padding 12/16. Border-bottom `--border-subtle`. Hover bg `--bg-sunken`. Selected bg `--accent-soft` + border-left 2px `--accent`.
- Empty state: icone Lucide 32px tertiary + headline 16px + body 14px + CTA. Centralizado, padding 64px.
- Mobile: rows viram cards stackados (8px gap), padding 12px, swipe-actions opcional.

**Form**

- Field stack: label (text-sm semibold) + input (38px alto, padding 8/12, radius-md) + helper-text (text-xs tertiary) + error (text-xs danger).
- Field groups (Sanity-style) para forms longos: tabs no topo do form ("Geral", "Detalhes", "Avancado").
- Inline validation on blur, on-submit summary no topo.
- Sticky bottom action bar quando ha mudancas: "Voce tem alteracoes nao salvas | Descartar | Salvar". Slide-up 300ms.
- Autosave so em rascunho (continua localStorage) — nunca silent commit ao banco.
- Mobile: 1 coluna sempre. Action bar sticky bottom.

**Dashboard cards**

- Surface elevada, padding 24px, radius-lg, shadow-sm.
- Layout: eyebrow (text-xs uppercase tertiary tracking-wide) + valor (text-3xl semibold) + delta/contexto (text-sm secondary) + CTA opcional bottom (text-sm accent).
- Gap entre cards: 16px desktop, 12px mobile.

**Toolbar (acoes em massa)**

- Sticky abaixo do header quando ≥1 row selecionado. Bg accent-soft, 48px alto, padding 16px. Texto "X selecionados" + acoes.

**Empty / loading / error**

- Loading: skeleton com shimmer, mesmo formato dos rows reais (3-5 linhas), respeita `prefers-reduced-motion` (fade pulse fallback).
- Error: banner top da view, bg danger-soft, border-left 3px danger, "Erro ao carregar. [Tentar novamente]".

**Modal / dialog**

- `<dialog>` element nativo + custom styling. Max-width 480px (small) / 640px (medium) / 800px (large).
- Header (titulo + close X) + body (padding 24px) + footer (right-aligned actions).
- Backdrop bg-overlay. Slide+fade in 200ms. Foco preso, restore on close.
- Mobile: full-width com 16px margin, slide from bottom.

**Toast**

- Stack bottom-right desktop, top-center mobile. Max 3 visiveis, oldest dismisses primeiro.
- Duracao: 4s default, 8s para acoes com Undo. Padding 12/16, radius-md, shadow-lg.
- Variants: default (bg-elevated), success/warning/danger (semantic-soft bg + semantic border-left 3px).

**Command palette**

- Modal centralizado top, max-width 640px, top-offset 96px desktop, 16px mobile.
- Input 44px alto, sem border, font-size 16px (evita zoom iOS).
- Sections agrupadas por dominio. Item: 40px alto, icone + label + shortcut hint (kbd) + tipo (eyebrow).
- Focus trap circular, navegacao via setas, Enter executa, Esc fecha.

## 16.6 Notas por view

1. **Dashboard** — grid 4col desktop, 2col tablet, 1col mobile. Cards bg-elevated. Alertas (pending prayers, missing preacher) no topo como banners horizontais full-width antes do grid.
2. **Avisos** — list desktop com colunas: status badge | titulo | categoria | expira em | acoes. Mobile: card stack. Form com field groups: "Conteudo" / "Publicacao" / "Imagem".
3. **Programacao** — list com checkbox column quando bulk-mode ativo. Date range filter em chips no toolbar. Mobile: cards agrupados por mes (sticky month header).
4. **Escala anual** — desktop: grid sticky-header dates × roles, scroll horizontal/vertical. **Mobile: layout completamente diferente** — lista por data com expand para ver/editar roles. Auto-distribute e generator viram bottom drawer.
5. **Voluntarios** — list com avatar + nome + role + ministerio + count. Form com field groups: "Identidade" / "Contato e Foto" / "Disponibilidade" / "Notas". Mobile: cards.
6. **Oracao** — split view desktop: lista esquerda 380px + detalhe direita. Tablet/mobile: list-only, item abre em pagina dedicada. WhatsApp button proeminente. Filter chip "nao vistos" sempre visivel.
7. **Ministerios** — list com handle de drag (futuro) + color swatch + nome + slug. Form curto coluna unica. Mobile direto.
8. **Perfil** — secao unica em scroll com sub-headings ancoradas + lateral nav anchor links desktop. Recurring meetings como sub-lista inline. Mobile: tabs no topo.
9. **Audit log** — tabela densa (40px rows) com filter bar persistente. Diff before/after expansivel inline. Mobile: cards com filtros num drawer.
10. **Equipe** — list simples avatar + email + role + acoes. Invite form acima da lista (collapsed) ou em modal. Mobile direto.

## 16.7 Mecanismo de tema

```css
:root {
  /* tokens light */
}
[data-theme="dark"] {
  /* tokens dark */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* mesmos tokens dark */
  }
}
```

Inicializacao no `index.html` antes de qualquer asset (anti-FOUC):

```html
<script>
  (function () {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  })();
</script>
```

Toggle no admin sidebar: tres estados (Sistema / Claro / Escuro). "Sistema" remove `data-theme` e remove key. Persistencia imediata.

## 16.8 Estrategia mobile

- **Paradigma**: drawer (offcanvas) push da esquerda + topbar fixa + sticky bottom action bar contextual. Bottom tab bar **rejeitada** (10 views nao cabem, "Mais" e ruim).
- **Views que precisam rework dedicado**: AnnualSchedule (grid → lista por data), PrayersView (split → list+detail nav), AuditLog (tabela → cards com filter drawer).
- **Views responsivas simples** (so reflow): Announcements, Schedule, Volunteers, Ministries, Team.
- **Views com layout near-identico**: Dashboard (grid colapsa), Profile (tabs no topo).
- **Tap targets**: minimo 44x44px.
- **Inputs em mobile**: font-size 16px obrigatorio (evita auto-zoom iOS).

## 16.9 Fases de implementacao

**Wave 1 — Tokens + shell + theme toggle (1 sessao)** ✅

- `apps/admin/src/styles/tokens.css` com todos os custom properties.
- `styles.css` consumindo tokens.
- Theme toggle (Sistema/Claro/Escuro) + persistencia + script anti-FOUC.
- Shell (Sidebar + Workspace) usando tokens.

**Wave 2 — Padroes de lista e form (2 sessoes)** ✅

- `components/ListView.tsx`, `components/Form.tsx` + `FieldGroup.tsx` + `StickyActionBar.tsx`.
- `Skeleton.tsx`, `Toast.tsx`, `Modal.tsx`, `EmptyState.tsx`.

**Wave 3 — Migracao das demais views (2 sessoes)** ⏳

- Migrar Announcements, Schedule, Volunteers, Prayers, AuditLog, Dashboard, Ministries, Profile, Team.
- Field groups onde indicado.
- Substituir LoaderCircle por Skeleton.

**Wave 4 — Mobile (2 sessoes)** ⏳

- Drawer + topbar mobile.
- Rework dedicado: AnnualSchedule (lista-por-data), PrayersView (list+detail nav), AuditLog (cards).
- Reflow das demais views.

**Wave 5 — Polish (1 sessao)** ⏸

- Toast notifications substituindo `alert()`/`confirm()` non-destructive.
- Cmd-K com novo styling + dica visivel no header.
- Animacoes respeitando `prefers-reduced-motion`.
- Audit AA contrast com axe-core.

## 16.10 Tradeoffs e riscos

**O que pode incomodar a lideranca**:

- Tema escuro novo pode parecer estranho em contexto de igreja. Mitigacao: light default sempre, toggle discreto no rodape.
- Mobile drawer escondendo nav — se usam pouco mobile hoje, podem nao notar; se muito, podem reclamar do tap a mais.
- Mudanca de bronze-on-navy para light-default pode soar como perda de identidade. Mitigacao: bronze permanece como acento unico, navy sobrevive integro como base do dark mode.

**Riscos de overdesign**:

- Field groups podem ser excessivos em forms de 4-5 campos. Aplicar so em Profile e Volunteer.
- Skeletons shaped em todas as listas — esforco real. Prioridade: top-3 (Schedule, Volunteers, Prayers).
- Two-column profile com nav lateral pode ser overkill — fallback simples e scroll com sticky h2.

**Mais facil de cortar se overdesign**:

1. Field groups em form — voltar para form linear simples.
2. Skeleton shimmer customizado — manter LoaderCircle.
3. Theme toggle "Sistema" — manter so 2 estados.
4. Layout mobile dedicado de AuditLog — usar tabela com scroll horizontal.
5. Two-column ProfileView — voltar para scroll linear.

**Tradeoff principal**: privilegiar consistencia (todas as views passam pelos mesmos componentes) acima de otimizacao por view. Custa flexibilidade pontual mas ganha previsibilidade absoluta — alinhado com "lideranca usa pouco, precisa lembrar rapido".
