# Proposal: First-Class Density and Discrete Modes in design-system-spec

**From:** UIForge (github.com/plexusone/uiforge)
**To:** systemspec-designsystem (github.com/plexusone/systemspec-designsystem, formerly design-system-spec)
**Status:** Filed and closed as [systemspec-designsystem#9](https://github.com/plexusone/systemspec-designsystem/issues/9) — modes shipped in DSS v0.7.0; density is not yet addressed upstream (see §2)

## Motivation

UIForge consumes DSS documents as its design-token source ([theming docs](https://plexusone.github.io/uiforge/concepts/theming/)). Two concepts UIForge needed have no first-class DSS representation, so UIForge modeled them downstream (RMI-UIFORGE-125). Upstreaming them would let any DSS consumer share the semantics.

## 1. Discrete modes — shipped in DSS v0.7.0

DSS v0.7.0 shipped this half of the proposal: a document-level `modes` declaration, `ColorToken.modes` (generalized per-token values, with `lightModeValue`/`darkModeValue` folded in as sugar via `EffectiveModes()`), a `mode-completeness` spec lint rule, and mode-aware CSS/bindings/W3C generation. UIForge's `theme` package (RMI-UIFORGE-127) now consumes these directly and no longer derives overlays by diffing a fixed light/dark pair. Density (below) is not yet addressed upstream.

**Today:** DSS models light/dark per token (`ColorToken.lightModeValue` / `darkModeValue`), and `ThemeBindings.themeMode` selects one at binding time. There is no way to enumerate a document's modes, no mode-completeness validation, and no room for modes beyond light/dark (high-contrast, brand sub-themes).

**UIForge's downstream model:** a base token set plus named overlays — `modes: { "<mode>": { "<token>": value } }` — derived by diffing per-mode generation against the base (`theme.FromDesignSystemWithModes`). Renderers switch modes at runtime by applying the overlay and stamping `data-uiforge-mode`.

**Proposed for DSS:**

- A document-level `modes` declaration (e.g. `["light", "dark"]`, extensible to arbitrary names), replacing the implicit two-mode assumption.
- Per-token mode values generalized from the light/dark field pair to a map: `values: { light: "#fff", dark: "#111", "high-contrast": "#000" }` (with `value` remaining the base/default).
- `dss lint` checks: every declared mode resolves every semantic token (completeness), and contrast metadata per mode.
- `GenerateCSS` emitting mode override blocks keyed by a selector convention (attribute or class), mirroring what consumers already do by hand.

## 2. Density

**Today:** DSS has a spacing scale but no density concept — no way to say "compact mode multiplies spacing by 0.75" or to declare per-density token values.

**UIForge's downstream model:** `ThemeRef.density ∈ {comfortable, compact}`; renderers stamp `data-uiforge-density` and publish a `--uiforge-density` scale factor (1 / 0.75) that component spacing consumes via `calc()`.

**Proposed for DSS:**

- A `density` section under foundations: named densities with either a spacing multiplier (`{ "compact": { "scale": 0.75 } }`) or per-density spacing-token overrides for non-linear designs.
- Components' `themingContract` able to declare density-sensitive tokens.
- Generated CSS exposing the density factor as a custom property so consumers share one convention.

## Compatibility

Both proposals are additive. The existing `lightModeValue`/`darkModeValue` pair can be kept as sugar for the generalized map; documents without `modes`/`density` behave exactly as today. UIForge would migrate its adapter (`theme` package) to the first-class fields once available and delete its diff-based derivation.
