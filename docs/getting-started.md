# Getting Started

## A minimal PageSpec

Every UIForge page is a JSON document:

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

## Validate it (Go)

```go
import (
    "encoding/json"

    "github.com/plexusone/uiforge/registry"
    "github.com/plexusone/uiforge/uispec"
)

var page uispec.PageSpec
_ = json.Unmarshal(pageJSON, &page)

r, _ := registry.NewWithBuiltins()
if err := r.ValidatePage(&page); err != nil {
    // every problem is reported: unknown component types, missing required
    // data inputs, property schema violations, profile constraint breaches
}
```

## Render it (web components)

```ts
import {
  registerCoreComponents,
  registerAnalyticsComponents,
} from '@plexusone/uiforge-renderer-lit'

registerCoreComponents()
registerAnalyticsComponents()

const el = document.createElement('uiforge-page')
el.spec = pageSpec
el.dataSources = [myConnector] // optional — see Data Binding
document.body.appendChild(el)
```

## Render it (React)

```tsx
import {
  PageRenderer,
  registerCoreComponents,
  registerAnalyticsComponents,
} from '@plexusone/uiforge-renderer'

registerCoreComponents()
registerAnalyticsComponents()

export function App() {
  return <PageRenderer page={pageSpec} dataSources={[myConnector]} />
}
```

## Install

```bash
pnpm add @plexusone/uiforge-renderer-lit   # web components
pnpm add @plexusone/uiforge-renderer       # React
pnpm add @plexusone/uiforge-spec           # types + engines only
```

(or `npm install` — the packages are plain ESM with no install scripts.)

## Run the demo

A complete sales dashboard — defined as one PageSpec, rendered by `<uiforge-page>` with a live async data source — ships in the repo with no bundler required:

```bash
cd spec && npm install && npm run build && cd ..
cd renderers/lit && npm install && npm run build && cd ../..
python3 -m http.server   # from the repository root
# open http://localhost:8000/examples/demo/
```

Change the region filter to watch the interaction engine update page state and re-render, and note the orders table's loading state resolving through a delayed connector.
