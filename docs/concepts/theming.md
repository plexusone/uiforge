# Theming & Design Systems

UIForge components never hard-code brand decisions. They consume a fixed set of semantic CSS custom properties, and themes bind values to that contract.

## The semantic token contract

Component styles read `--uiforge-<semantic>` variables named after the [design-system-spec](https://github.com/plexusone/systemspec-designsystem) (DSS) semantic vocabulary — `primary`, `secondary`, `accent`, `danger`, `warning`, `success`, `info`, `neutral`, `surface`, `background`, `text`, `text-muted`, `text-inverse`, `border`, `focus`, `disabled`, `shadow` — plus the category keys `font-family` and `radius`. Every component declares a sensible fallback, so unthemed pages still render well.

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

`ThemeRef` supports per-mode token overlays and an open, document-defined set of spacing densities:

```json
"theme": {
  "id": "brand",
  "variant": "dark",
  "density": "compact",
  "densities": { "comfortable": 1, "compact": 0.75 },
  "tokens": { "primary": "#0f766e", "surface": "#111111" },
  "modes": { "light": { "primary": "#0d9488", "surface": "#ffffff" } }
}
```

`variant` names the default mode; hosts switch at runtime via the `mode` prop (`PageRenderer`) or property (`<uiforge-page>`) — the active overlay applies over `tokens` and the page root carries `data-uiforge-mode`. `theme.FromDesignSystemWithModes` (Go) derives overlays for every mode the DSS document declares (or light/dark, for documents that only use the `lightModeValue`/`darkModeValue` sugar fields), and `CSSWithModes` emits base + `[data-uiforge-mode="…"]` override blocks for stylesheet-based theming.

`density` selects a key in `densities`, which holds every declared density's spacing scale multiplier (any names, not just `comfortable`/`compact`) — resolved from a DSS document's `Foundations.Densities` by the same `theme.FromDesignSystemWithModes`. Renderers stamp `data-uiforge-density` and, when `density` has a matching `densities` entry, publish `--uiforge-density: <scale>`; the builtin packs scale their paddings with it (`calc(12px * var(--uiforge-density, 1))`) — custom components should do the same for density-aware spacing. Validation is structural rather than a fixed enum: `theme.density` must be a key present in `theme.densities`, and every declared scale must be positive.

Both generalized modes and open density were proposed upstream ([systemspec-designsystem#9](https://github.com/plexusone/systemspec-designsystem/issues/9)) and shipped in DSS v0.7.0 ([`Foundations.Densities`](https://github.com/plexusone/systemspec-designsystem)); `theme.FromDesignSystemWithModes` consumes DSS's `Modes`/`ColorToken.EffectiveModes()` and `Foundations.Densities` directly — UIForge no longer maintains its own closed `comfortable`/`compact` enum. Scope is limited to the scale factor; DSS's per-token `spacingOverrides` aren't consumed yet, since UIForge has no spacing-token contract for components to bind against (see the [proposal](https://github.com/plexusone/uiforge/blob/main/docs/proposals/dss-density-and-modes.md) for status).

## White-labeling

With `SourcePrefix` set, generated bindings reference the host design system's own custom properties with raw values as fallbacks:

```css
uiforge-page.tenant-a {
  --uiforge-primary: var(--acme-primary-500, #0f766e);
}
```

The host's brand stylesheet stays authoritative — restyle at runtime by changing `--acme-*` values — while UIForge components remain brand-agnostic. Reliant services keep their own prefix; UIForge adapts at the boundary.
