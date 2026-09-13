# TRD — UIForge Technical Design

**Initiative:** INIT-UIFORGE-003
**Status:** Draft
**Date:** 2026-09-10
**Home repo:** github.com/plexusone/uiforge

## Architecture

```text
PageSpec (JSON, apiVersion ui.plexusone.dev/v1)
        │
        ▼
Schema validation          schema/ (generated from Go types)
        │
        ▼
Registry validation        registry/ (ComponentSpec manifests, profiles)
        │
        ▼
Runtime engines            pkg/expression  pkg/state  pkg/interaction  pkg/diff
        │
        ▼
Renderer                   renderers/react  |  renderers/lit
        │
        ▼
DOM (shared data-uiforge-* vocabulary)
```

The key principle: **code defines component capabilities; the spec composes and configures them.** Renderers never receive arbitrary HTML/CSS from specs — they map semantic component types to implementations.

## Repository Structure

```text
uiforge/
├── uispec/                 # Canonical UISpec Go types — source of truth
├── registry/               # Component registry, ComponentSpec manifests, profiles, page validation
├── pkg/
│   ├── expression/         # ${...} expression evaluation over context maps
│   ├── state/              # Page state store (filters, variables)
│   ├── interaction/        # Event → action engine (drill-down, cross-filter)
│   └── diff/               # PageSpec tree diffing for incremental re-render
├── schema/                 # Generated JSON Schemas + go:embed accessors + generator
├── theme/                  # DSS → UIForge theme adapter (semantic token bindings)
├── spec/                   # @plexusone/uiforge-spec — shared TS types + framework-free engines
├── renderers/
│   ├── react/              # @plexusone/uiforge-renderer (React 18/19)
│   └── lit/                # @plexusone/uiforge-renderer-lit (Lit 3 web components)
├── testdata/pagespecs/     # Golden PageSpec fixtures
├── examples/               # Example PageSpec documents
└── docs/specs/             # PRD, TRD, PLAN, ROADMAP
```

## UISpec Type System

Go structs in `uispec/` are the source of truth; schemas and TS types mirror them.

| File | Types |
|---|---|
| `page.go` | `PageSpec` (apiVersion, kind Page, metadata, profile, context, layout, components, interactions, navigation, theme), `PageMetadata` |
| `component.go` | `ComponentInstance` (id, type, version, position, properties, data, children, visibility, slot, style), `Position` |
| `layout.go` | `LayoutSpec` (responsive-grid, stack, split-pane, tabs, application-shell), `LayoutConfig`, `LayoutRegion` |
| `binding.go` | `Binding` (source, operation, parameters, transform, default) |
| `interaction.go` | `Interaction`, `InteractionTrigger`, `InteractionAction` |
| `navigation.go` | `NavigationSpec`, `NavItem` |
| `profile.go` | Experience profile identifiers and constraints |
| `capability.go` | Capability declarations |
| `theme.go` | `ThemeRef` (id, variant, tokens) |

## Component Registry

`registry.ComponentSpec` is the machine-readable component contract: properties schema, data inputs, events, actions, layout constraints, capabilities, design-system compliance. `registry.NewWithBuiltins()` loads the built-in namespaces:

- `core.*` — text, image, button, card, tabs, modal (generic primitives)
- `analytics.*` — line-chart, bar-chart, table, metric, gauge, filter (dashboard profile)
- `application.*` — input, select, checkbox, form, record-detail, record-list, action-bar, badge (application/portal profiles)
- `assistant.*` / `agent.*` — thread, composer, tool-call, run-status (agent profile)

`Registry.ValidatePage(*uispec.PageSpec)` checks every component instance against its manifest (unknown types, property validation, profile constraints). Golden fixtures under `testdata/pagespecs/` are validated in `registry/golden_test.go`.

## Schema Pipeline

Go types → `schema/generate/main.go` (invopop/jsonschema reflector, `//go:build ignore`) → `schema/{page,component}.schema.json` (draft 2020-12, `$id` under github.com/plexusone/uiforge) → embedded via `schema/schema.go`. Root `tools.go` (build tag `tools`) pins the generator dependency for `go mod tidy`. Schemas are linted with `schemakit lint --property-case camelCase`.

Regeneration must be deterministic: `go run schema/generate/main.go` from the repo root must leave a clean git diff.

## Renderer Contracts

Both renderers register component implementations keyed by spec `type` and emit the same DOM vocabulary: `data-uiforge-page`, `data-uiforge-profile`, `data-uiforge-layout`, `data-uiforge-cell`, `data-uiforge-region`, `data-uiforge-component`, `data-uiforge-missing`, `data-uiforge-error`; theme tokens surface as `--uiforge-*` CSS custom properties.

- **React** (`renderers/react`): `registerComponent(type, Component)` where a component receives `{ instance, children }`; `<PageRenderer page={spec}>` renders the tree with error boundaries; includes expression/state/interaction/datasource runtimes and assistant components.
- **Lit** (`renderers/lit`): `registerComponent(type, factory)` where a factory maps a `ComponentInstance` (plus an optional `PageContext` with state/engine/dispatch/data and pre-rendered children) to a lit template; `<uiforge-page .spec=${spec} .dataSources=${connectors}>` renders into shadow DOM. Supports all five layouts, navigation, theme tokens, visibility rules, and the expression/state/interaction engines; `core.*`, `analytics.*`, and `application.*` component packs are built in.

### Data binding resolution

Bindings resolve through a tiered runtime (`data.ts`, `datasource.ts`, and the page's binding cache):

1. `static` and `state` sources resolve synchronously.
2. Sources matching a registered `DataSourceConnector` (`{ id, execute(operation, params) → Promise }`) resolve asynchronously: the binding is `loading` (rendered as `data-uiforge-loading`), then settles to `ready` or `error` (`data-uiforge-data-error`). Binding `parameters` are `${...}`-evaluated against `{context, state}` before `execute`; `transform` expressions post-process results. Results are cached per component+binding; the `component.refresh` interaction action invalidates a component's cache so its bindings re-fetch.
3. External sources with no registered connector fall back to the binding's `default` — pages remain renderable without any data infrastructure.

The full runtime — connector interface, tiered resolution, per-component caching, loading/error markers, and `component.refresh` invalidation — exists identically in both renderers (`<uiforge-page .dataSources>` in Lit; the `dataSources` prop on `PageRenderer` in React), built on the single shared engines in `@plexusone/uiforge-spec`.

A fixture-driven conformance suite (`conformance.test.ts(x)` in each renderer package) renders every golden fixture in both renderers and asserts the shared DOM vocabulary — keep the two test files aligned.

Both renderers depend on **`@plexusone/uiforge-spec`** (`spec/`) — the renderer-independent package holding the UISpec TS types (mirroring the Go source of truth) and the framework-free runtime engines. The dependency is a `file:../../spec` link until npm publishing (RMI-UIFORGE-113) replaces it with a version; until then, renderer packages are consumable only from a full repo checkout. Build order: `spec/` first, then renderers.

## Design System Integration

UIForge does not define its own design-token model; it consumes **design-system-spec (DSS)** documents (`github.com/plexusone/design-system-spec`). The integration contract:

- **Semantic token vocabulary.** Components consume a fixed set of CSS custom properties named `--uiforge-<semantic>` after DSS's `ValidSemantics` vocabulary (primary, secondary, accent, danger, warning, success, info, neutral, surface, background, text, text-muted, text-inverse, border, focus, disabled, shadow), plus category keys `font-family` and `radius`. Every component style declares a hard-coded fallback, so unthemed pages render sensibly.
- **`theme` package.** `theme.FromDesignSystem(ds, opts)` maps a DSS document's foundations onto that vocabulary (colors by their declared `semantic`, first font family, `md` radius) and emits either a scoped stylesheet (`Theme.CSS(selector)`) or a `uispec.ThemeRef` for embedding in a PageSpec.
- **White-label / prefix policy.** The internal `--uiforge-*` prefix and `data-uiforge-*` DOM vocabulary are a **fixed machine contract** (like Lightning's `--slds-*` or Polaris `--p-*`) — they are never renamed. Brand adaptability lives at the boundary: `Options.SourcePrefix` emits bindings that reference the host design system's own variables (`--uiforge-primary: var(--plexus-cyan, #06b6d4)`), so reliant services keep their own prefix and can restyle at runtime; and theme values apply at each page scope (the `<uiforge-page>` root or any selector passed to `Theme.CSS`), so multiple tenants can carry different brands on one page without collisions.
- **Modes.** Light/dark uses DSS per-token `lightModeValue`/`darkModeValue` via `theme.Options.Mode`; `ThemeRef.variant` records the chosen mode.

## Versioning

- **apiVersion** (`ui.plexusone.dev/v1`) versions the IR contract; additive changes only within a version.
- **Module/package versions** (Go module tags, npm package versions) version implementations.
- Component manifests carry their own `version`; pages may pin component versions.

## Toolchain Constraints

- Go 1.26.6 (`go.mod`); shared CI runs `GOTOOLCHAIN=local` with a cached 1.26.x toolchain — do not raise the directive past what CI provides.
- npm packages build with plain `tsc`; tests run under vitest + jsdom; `dist/` is committed so packages are consumable via git before npm publishing (RMI-UIFORGE-113).
