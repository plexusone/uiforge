# Architecture

UIForge is organized as a pipeline from declarative specification to rendered DOM:

```text
PageSpec (JSON, apiVersion ui.plexusone.dev/v1)
        │
        ▼
Schema validation          generated JSON Schemas (from the Go types)
        │
        ▼
Registry validation        ComponentSpec manifests, experience profiles
        │
        ▼
Runtime engines            expressions · state · interactions · data binding
        │
        ▼
Renderer                   React  |  Lit web components
        │
        ▼
DOM (shared data-uiforge-* vocabulary)
```

The key principle: **renderers never receive arbitrary HTML or CSS from specs.** Pages reference semantic component types; the registry defines what each type accepts; the design system decides how it looks.

## Repository layout

| Path | Role |
|---|---|
| `uispec/` | Canonical UISpec Go types — the source of truth |
| `registry/` | Component registry, manifests, profiles, page validation |
| `pkg/expression`, `pkg/state`, `pkg/interaction`, `pkg/diff` | Go runtime engines |
| `schema/` | Generated JSON Schemas + `go:embed` accessors |
| `theme/` | design-system-spec → UIForge theme adapter |
| `spec/` | `@plexusone/uiforge-spec` — shared TS types + framework-free engines |
| `renderers/react/`, `renderers/lit/` | The two renderers with their component packs |
| `testdata/pagespecs/` | Golden fixtures driving registry validation and renderer conformance |

## Go types are the source of truth

The UISpec Go structs generate the JSON Schemas (`schema/generate/main.go`), and the TypeScript types in `@plexusone/uiforge-spec` mirror them. Component manifests likewise generate the [Component Reference](../components/index.md) pages. Nothing schema-shaped is hand-written twice.

## The cross-renderer DOM contract

Both renderers emit the same attribute vocabulary, so tooling, tests, and stylesheets target either interchangeably:

`data-uiforge-page`, `data-uiforge-profile`, `data-uiforge-layout`, `data-uiforge-cell`, `data-uiforge-region`, `data-uiforge-nav`, `data-uiforge-nav-item`, `data-uiforge-component`, `data-uiforge-missing`, `data-uiforge-error`, `data-uiforge-loading`, `data-uiforge-data-error` — plus `--uiforge-*` CSS custom properties for theme tokens.

A fixture-driven conformance suite renders every golden PageSpec through both renderers and asserts this contract.

## Experience profiles

A page declares a profile — `dashboard`, `application`, `agent`, `portal`, or `embedded` — and validation enforces that profile's constraints: which layout primitives are allowed, which component namespaces may appear, required layout slots, and maximum nesting depth. One composition model, several governed experience types.
