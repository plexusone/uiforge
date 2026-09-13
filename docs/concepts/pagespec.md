# PageSpec

A PageSpec is the complete declarative description of one page. The top-level shape:

```json
{
  "apiVersion": "ui.plexusone.dev/v1",
  "kind": "Page",
  "metadata": { "id": "...", "name": "...", "title": "..." },
  "profile": "dashboard | application | agent | portal | embedded",
  "context": { "entityId": "cust-42" },
  "layout": { "type": "responsive-grid", "config": { "columns": 12 } },
  "components": [ ... ],
  "interactions": [ ... ],
  "navigation": { "type": "sidebar", "items": [ ... ] },
  "theme": { "id": "brand", "tokens": { "primary": "#0f766e" } }
}
```

## Layouts

Five layout primitives cover the supported page shapes:

| Type | Behavior |
|---|---|
| `responsive-grid` | CSS grid; components place with `position` (`row`, `col`, `colSpan`, `rowSpan`) |
| `stack` | Flex column or row (`config.direction`) |
| `split-pane` | Named regions with fixed or flexible `config.sizes`, each optionally holding a nested layout |
| `tabs` | One tab per region, panels toggle on selection |
| `application-shell` | Header / sidebar / main / aside / footer grid areas; page components render in `main`, `navigation` renders in the sidebar |

## Component instances

```json
{
  "id": "revenue-metric",
  "type": "analytics.metric",
  "version": "^1.0",
  "position": { "row": 0, "col": 3, "colSpan": 3 },
  "properties": { "title": "Total Revenue", "format": "currency", "prefix": "$" },
  "data": { "primary": { "source": "sales-data", "operation": "totalRevenue" } },
  "children": [ ... ],
  "visibility": { "condition": "${state.filters.active}" },
  "style": {}
}
```

- **`type`** must resolve to a registered `ComponentSpec`; **`properties`** validate against its schema; required **`data`** inputs must be bound.
- **`version`** optionally pins compatibility: `1`, `1.2`, `1.2.3`, or caret forms (`^1.2`).
- **`children`** compose containers — cards, forms — which decide where children render.
- **`visibility.condition`** accepts `false` or a `${...}` expression over `{state, context}`; a falsy or unresolvable condition hides the component.

## Expressions

`${path.to.value}` expressions resolve against a context map — page `context`, page `state`, or an interaction's `event` payload — anywhere strings appear in properties, binding parameters, visibility conditions, and interaction params. A string that is exactly one expression resolves to the raw value; mixed strings interpolate.

## Interactions

Components never reach into each other. They emit events; page-level rules route them:

```json
{
  "when": { "component": "region-breakdown", "event": "click" },
  "then": [
    { "target": "orders-table", "action": "state.set",
      "params": { "path": "filters.region", "value": "${event.label}" } },
    { "target": "orders-table", "action": "component.refresh" }
  ]
}
```

Builtin actions: `state.set`, `state.toggle`, `component.refresh` (invalidates the target's data cache so its bindings re-fetch), and `navigate` (host-defined). Hosts register additional action handlers on the interaction engine.

## Validation

`registry.ValidatePage` reports every problem at once: apiVersion/kind, metadata, layout structure (per-primitive rules like split-pane region counts), duplicate component ids, unregistered types, property schema violations, version incompatibilities, unbound required data inputs, interaction references to unknown components, and profile constraint breaches.
