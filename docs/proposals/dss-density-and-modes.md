# Proposal: First-Class Density and Discrete Modes in design-system-spec

**From:** UIForge (github.com/plexusone/uiforge)
**To:** systemspec-designsystem (github.com/plexusone/systemspec-designsystem, formerly design-system-spec)
**Status:** Filed and closed as [systemspec-designsystem#9](https://github.com/plexusone/systemspec-designsystem/issues/9) — both modes and density shipped in DSS v0.7.0 and are now consumed by UIForge's `theme` package (RMI-UIFORGE-127 for modes, RMI-UIFORGE-128 for density; scope limited to the scale factor, not per-token `spacingOverrides` — see §2)

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

## 2. Density — shipped in DSS v0.7.0, consumed by UIForge in RMI-UIFORGE-128

DSS v0.7.0 shipped this half of the proposal too: `Foundations.Densities` (named densities with a `scale` multiplier and optional per-token `spacingOverrides`), `ThemeToken.densitySensitive`, and density-aware CSS generation (`[data-density="…"]` blocks, a `--density` custom property). UIForge's `theme` package no longer has its own closed density model — `ThemeRef.Density`/`Densities` are an open ID/scale pair resolved by `theme.FromDesignSystemWithModes` from `Foundations.Densities`, replacing the old fixed `comfortable`/`compact` enum (a breaking change, RMI-UIFORGE-128 — no backward-compat constraint, since the old enum predated any DSS integration at all). Scope is intentionally limited to the scale factor: DSS's per-token `spacingOverrides` aren't consumed, since UIForge has no spacing-token vocabulary for components to bind against — a candidate future extension if that's ever added.

**Before this proposal:** DSS had a spacing scale but no density concept — no way to say "compact mode multiplies spacing by 0.75" or to declare per-density token values.

**UIForge's original downstream model (pre-DSS-integration):** `ThemeRef.density ∈ {comfortable, compact}`, a fixed enum with no connection to any design system document; renderers stamped `data-uiforge-density` and published a hardcoded `--uiforge-density: 0.75` for `compact` only. Component spacing consumes the scale via `calc()`, unchanged by either the original model or the current one.

## Compatibility

Both proposals were additive **on the DSS side** — the existing `lightModeValue`/`darkModeValue` pair is kept as sugar for the generalized map, and documents without `modes`/`densities` behave exactly as before. UIForge's own adapter migrations were not required to preserve backward compatibility with the old downstream models: RMI-UIFORGE-127 (modes) was additive, but RMI-UIFORGE-128 (density) was a deliberate breaking change — the old `comfortable`/`compact` enum wasn't derived from any DSS document, so there was no meaningful compatibility to preserve, and the open ID/scale model needed for full openness isn't representable as a closed TypeScript union anyway.
