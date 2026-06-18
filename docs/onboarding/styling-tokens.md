# Styling: the design-token system

All presentational values — color, radius, spacing, typography, and motion — come
from CSS custom properties defined once in [`src/styles/tokens.css`](../../src/styles/tokens.css),
imported a single time from the root layout (`src/app/layout.tsx`). Component
stylesheets never hardcode raw values; they reference tokens. This keeps the
parchment-and-ink theme consistent and themeable from one place.

## Two-tier color model

Color uses two layers. **Primitives** are the raw palette — named by hue, never
used directly by components:

```css
--parchment: #f3efe3;
--ink-900: #1b1b1b;
--blue-500: #2f6fb0;
```

**Semantic** tokens name a _role_ and reference a primitive. Components use only
these:

```css
--color-surface-board: var(--parchment);
--color-outline-emphasis: var(--ink-900);
--color-water-river: var(--blue-500);
```

```css
/* in a component .module.css */
.board {
  background: var(--color-surface-board);
}
```

Why two tiers: a future theme (dark mode, a faction-tinted palette) remaps the
semantic layer to different primitives in a `[data-theme]` block — primitives and
component CSS stay untouched. Multiple roles can also intentionally share one
primitive (e.g. `--color-hex-stroke` and `--color-border-strong` both map to
`--taupe-500`).

## Scales

Radius, spacing, typography, and motion are flat single-tier scales (the two-tier
split is a color concern). Scales are named t-shirt style:

- Radius: `--radius-sm`, `--radius-md`.
- Spacing: `--space-3xs` … `--space-2xl`.
- Typography: `--font-size-label-*` (px, for in-`viewBox` SVG text) and
  `--font-size-ui-*` (rem, for HTML chrome).
- Motion: `--motion-fast`, `--motion-base`, plus `--ease-standard`.

## Domain palettes (terrain, faction)

Terrain and faction colors are **flat, namespaced tokens** (`--color-terrain-*`,
`--faction-*`) that hold their value directly, rather than the primitive→semantic
two tiers. Each maps to exactly one domain concept and is themed as a set, so a
shared primitive layer would be pure ceremony. Faction tokens are deliberately
**independent** of the UI accent palette — `--faction-macedon-fill` equals
`--gold-400` today but stays its own token so reskinning the reach highlight never
recolors Macedon.

These tokens are consumed from TypeScript, not CSS: `palette.ts` maps domain enums
(`TerrainType`, faction owner) to `var(--token)` strings, which board components
apply via an inline `style` prop. SVG presentation **attributes** (`fill=…`) do not
resolve `var()`, so colored SVG nodes use `style={{ fill }}` instead.

## Rules

- Component CSS (`*.module.css`) must contain **no raw color literals** (hex,
  `rgb()/rgba()`, `hsl()`, etc.) and **no raw `border-radius` lengths** — use
  tokens. `palette.ts` must likewise hold no raw color literals. Both are enforced
  by [`src/styles/cssGuards.test.ts`](../../src/styles/cssGuards.test.ts), which
  fails CI on a violation.
- For the core UI palette, add new colors as a primitive **and** a semantic alias;
  for a domain palette, add a namespaced token. Reach for an existing token before
  inventing one.
- `tokens.css` is the only place allowed to hold raw color values.

## Not yet tokenized

- SVG geometry (`stroke-width`, glyph sizes in px) stays inline — it is layout,
  not theme.
