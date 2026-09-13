# UIForge

UIForge is a **specification-driven UI composition platform**. Pages are described in **UISpec** — a deterministic JSON Intermediate Representation — validated against a versioned component registry, and rendered by interchangeable runtimes (React and standard web components via Lit).

The core idea: **code defines component capabilities; the spec composes and configures them.** Instead of hand-coding every screen, teams (and AI agents) author declarative PageSpecs that reference registered, contract-checked components — the same model that powers customizable platforms like Salesforce Lightning, Splunk Dashboard Studio, and Shopify themes, but as a vendor-neutral open foundation.

```text
PageSpec JSON ──► Schema validation ──► Registry validation ──► Runtime engines ──► Renderer (React | Lit)
```

## A minimal PageSpec

```json
{
  "apiVersion": "ui.plexusone.dev/v1",
  "kind": "Page",
  "metadata": { "id": "hello", "name": "hello", "title": "Hello" },
  "profile": "dashboard",
  "layout": { "type": "responsive-grid", "config": { "columns": 12, "gap": "16px" } },
  "components": [
    {
      "id": "greeting",
      "type": "core.text",
      "position": { "col": 0, "colSpan": 6 },
      "properties": { "content": "Hello, UIForge", "variant": "heading" }
    }
  ]
}
```

## Packages

| Package | Description |
|---|---|
| `uispec` (Go) | Canonical UISpec types — PageSpec, ComponentInstance, LayoutSpec, Binding, Interaction. Go structs are the source of truth. |
| `registry` (Go) | Component registry with `ComponentSpec` manifests (properties schema, data inputs, events, capabilities, layout constraints), experience profiles, and page validation. Built-in `core.*`, `analytics.*`, `application.*`, and `assistant.*`/`agent.*` namespaces. |
| `pkg/expression` (Go) | `${...}` expression evaluation over context maps |
| `pkg/state` (Go) | Page state store (filters, variables) |
| `pkg/interaction` (Go) | Event → action engine (drill-down, cross-filter) |
| `pkg/diff` (Go) | PageSpec tree diffing |
| `schema` (Go) | JSON Schemas generated from the Go types, embedded for runtime validation |
| `theme` (Go) | Adapts [design-system-spec](https://github.com/plexusone/design-system-spec) documents into UIForge themes — semantic token bindings, scoped stylesheets, white-label prefix mapping |
| [`spec`](spec) | `@plexusone/uiforge-spec` — UISpec TypeScript types + framework-free runtime engines shared by all renderers |
| [`renderers/react`](renderers/react) | `@plexusone/uiforge-renderer` — renders PageSpec as a React component tree |
| [`renderers/lit`](renderers/lit) | `@plexusone/uiforge-renderer-lit` — renders PageSpec as standard web components (`<uiforge-page>`) |

Both renderers emit the same `data-uiforge-*` DOM vocabulary, so tooling and tests target either interchangeably.

## Quick start (Go)

```go
import (
    "encoding/json"

    "github.com/plexusone/uiforge/registry"
    "github.com/plexusone/uiforge/uispec"
)

var page uispec.PageSpec
_ = json.Unmarshal(pageJSON, &page)

r := registry.NewWithBuiltins()
if errs := r.ValidatePage(&page); len(errs) > 0 {
    // reject invalid composition before rendering
}
```

## Quick start (web components)

```ts
import { registerCoreComponents } from '@plexusone/uiforge-renderer-lit'

registerCoreComponents()
const el = document.createElement('uiforge-page')
el.spec = pageSpec
document.body.appendChild(el)
```

## Demo

A browser demo of the Lit renderer (no bundler — import maps + the built dist):

```bash
cd renderers/lit && npm install && npm run build && cd ../..
python3 -m http.server        # from the repo root
# open http://localhost:8000/examples/demo/
```

## Development

```bash
go test ./...                    # Go core (includes golden PageSpec fixture validation)
golangci-lint run ./...
go run schema/generate/main.go   # regenerate JSON schemas (must leave a clean diff)
go run docs/generate/main.go     # regenerate the component reference from registry manifests
mkdocs build                     # docs site (docs/ + mkdocs.yml)

cd spec            && npm install && npm run build && npm test   # build spec first
cd ../renderers/react && npm install && npm run build && npm test
cd ../lit             && npm install && npm run build && npm test
```

## Status

v0.1 — core IR, registry (external manifest loading, version resolution, properties validation), runtime engines, DSS theme adapter, and **two fully parallel renderers**: React and Lit each ship all five layouts, navigation, children/slots, expression/state/interaction engines, an async data-source runtime (connectors, loading/error states, caching, `component.refresh`), and matching core/analytics/application component packs — verified by a fixture-driven cross-renderer conformance suite. See [docs/specs](docs/specs) for the PRD, TRD, plan, and roadmap.
