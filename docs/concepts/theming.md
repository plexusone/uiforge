# Theming & Design Systems

UIForge components never hard-code brand decisions. They consume a fixed set of semantic CSS custom properties, and themes bind values to that contract.

## The semantic token contract

Component styles read `--uiforge-<semantic>` variables named after the [design-system-spec](https://github.com/plexusone/design-system-spec) (DSS) semantic vocabulary — `primary`, `secondary`, `accent`, `danger`, `warning`, `success`, `info`, `neutral`, `surface`, `background`, `text`, `text-muted`, `text-inverse`, `border`, `focus`, `disabled`, `shadow` — plus the category keys `font-family` and `radius`. Every component declares a sensible fallback, so unthemed pages still render well.

The internal `--uiforge-*` prefix is a **fixed machine contract** (like Lightning's `--slds-*` or Polaris's `--p-*`). It is never renamed; brands are expressed as values.

## Theming a page

`ThemeRef.tokens` apply at the page root, scoping the brand to that page instance — two differently-branded pages coexist on one screen with no collisions:

```json
"theme": { "id": "brand", "variant": "dark", "tokens": { "primary": "#0f766e", "radius": "0.5rem" } }
```

## From a DSS document (Go)

The `theme` package maps any design-system-spec document onto the contract — colors by their declared DSS semantic, the font stack, the radius scale:

```go
import "github.com/plexusone/uiforge/theme"

t, _ := theme.FromDesignSystem(dssDoc, theme.Options{
    Mode:         theme.ModeDark,
    SourcePrefix: "--acme", // white-label: reference the host brand's own variables
})

css := t.CSS("uiforge-page.tenant-a")   // scoped stylesheet
ref := t.ThemeRef("acme", theme.ModeDark) // or embed directly in a PageSpec
```

## Modes and density

`ThemeRef` supports per-mode token overlays and a spacing density:

```json
"theme": {
  "id": "brand",
  "variant": "dark",
  "density": "compact",
  "tokens": { "primary": "#0f766e", "surface": "#111111" },
  "modes": { "light": { "primary": "#0d9488", "surface": "#ffffff" } }
}
```

`variant` names the default mode; hosts switch at runtime via the `mode` prop (`PageRenderer`) or property (`<uiforge-page>`) — the active overlay applies over `tokens` and the page root carries `data-uiforge-mode`. `theme.FromDesignSystemWithModes` (Go) derives the overlays from a DSS document's per-token light/dark values, and `CSSWithModes` emits base + `[data-uiforge-mode="…"]` override blocks for stylesheet-based theming.

`density: "compact"` stamps `data-uiforge-density` and publishes `--uiforge-density: 0.75`; the builtin packs scale their paddings with it (`calc(12px * var(--uiforge-density, 1))`) — custom components should do the same for density-aware spacing. Validation enforces that mode overlay keys stay on the token contract and that density is `comfortable`/`compact`.

First-class density and generalized modes are proposed upstream to design-system-spec — see [the proposal](https://github.com/plexusone/uiforge/blob/main/docs/proposals/dss-density-and-modes.md).

## White-labeling

With `SourcePrefix` set, generated bindings reference the host design system's own custom properties with raw values as fallbacks:

```css
uiforge-page.tenant-a {
  --uiforge-primary: var(--acme-primary-500, #0f766e);
}
```

The host's brand stylesheet stays authoritative — restyle at runtime by changing `--acme-*` values — while UIForge components remain brand-agnostic. Reliant services keep their own prefix; UIForge adapts at the boundary.
