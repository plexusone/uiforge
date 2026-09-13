# Data Binding

Component instances declare named data inputs; bindings say where each input's value comes from. The component's manifest declares which inputs exist and which are required.

```json
"data": {
  "primary": {
    "source": "sales-data",
    "operation": "totalRevenue",
    "parameters": { "customerId": "${context.customerId}" },
    "transform": "${result.total}",
    "default": 0
  }
}
```

## Resolution tiers

1. **`static`** — `parameters.value` is the value. Synchronous.
2. **`state`** — reads `parameters.path` from the page state store. Synchronous, and re-renders reflect state changes.
3. **A registered connector** — any other `source` matching a `DataSourceConnector`'s id resolves asynchronously (see below).
4. **No connector** — falls back to the binding's `default`. Pages always render, even with zero data infrastructure.

## Connectors

A connector is the entire host-side contract:

```ts
interface DataSourceConnector {
  id: string
  execute(operation: string, params: Record<string, unknown>): Promise<unknown>
}
```

Pass connectors to the renderer — `<uiforge-page .dataSources=${[connector]}>` (Lit) or `<PageRenderer dataSources={[connector]}>` (React). Binding `parameters` are `${...}`-evaluated against `{context, state}` before `execute`; a `transform` expression post-processes the result with `${result...}` available.

## Loading, error, and caching semantics

While a connector binding is in flight the component renders a `data-uiforge-loading="<input>"` marker; on rejection, `data-uiforge-data-error="<input>"` with the failure message; on success, the value. Results are **cached per component + input** — interaction-driven re-renders do not re-fetch.

To re-fetch declaratively, target the component with the `component.refresh` action:

```json
{
  "when": { "component": "refresh-button", "event": "click" },
  "then": [{ "target": "orders-table", "action": "component.refresh" }]
}
```

This invalidates the target's cache; its bindings re-resolve on the next render. The demo (`examples/demo/`) shows the full loop with a deliberately slow connector.
