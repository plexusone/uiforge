# Authoring Components

This guide covers building your own UIForge components — the same contract the builtin `core.*`, `analytics.*`, and `application.*` packs follow. A component is three things:

1. **A manifest** (`ComponentSpec` JSON) — the machine-readable contract: what the component accepts, emits, and needs.
2. **An implementation** per renderer you support — a React component and/or a Lit template factory.
3. **A registration** — the manifest into the Go registry (for validation), the implementation into the renderer registry (for rendering), both keyed by the same `type`.

Pages never reference your code — they reference your registered type. That separation is what makes specs portable, validatable, and AI-generatable.

!!! note "Trust model"
    Registered components today run as **trusted native code** in the host page. Declare `capabilities` in your manifest now (they document intent and are validated structurally); runtime capability enforcement and sandboxed execution for untrusted components are roadmapped (RMI-UIFORGE-123/124).

## 1. The manifest

Every component type is `namespace.name`. Pick a namespace you own (your org or product slug) — `core`, `analytics`, `application`, and `assistant` are reserved for builtins.

```json
{
  "id": "acme.kpi-ribbon",
  "version": "1.0.0",
  "category": "visualization",
  "runtime": "react",
  "propertiesSchema": {
    "type": "object",
    "required": ["title"],
    "properties": {
      "title":   { "type": "string" },
      "variant": { "type": "string", "enum": ["compact", "standard"] },
      "showDelta": { "type": "boolean" }
    }
  },
  "dataInputs": {
    "metrics": { "type": "array", "description": "KPI values to display", "required": true }
  },
  "events": {
    "select": {
      "description": "A KPI tile was clicked",
      "schema": { "type": "object", "properties": { "metric": { "type": "string" } } }
    }
  },
  "actions": ["refresh"],
  "layoutConstraints": { "minWidth": "320px", "minHeight": "80px" },
  "capabilities": ["data.read"],
  "designSystem": {
    "tokens": ["primary", "surface", "border", "text-muted", "radius"],
    "variants": ["compact", "standard"]
  }
}
```

What the registry enforces when this loads (`Register`, `LoadManifest`, `LoadManifestFile`, `LoadManifestDir`):

- `id` must be `namespace.name`; `version` is required.
- **`designSystem.tokens` must be on the design-token contract** (`uispec.ValidThemeTokenKeys` — the DSS semantic vocabulary plus `font-family`/`radius`). Declaring `color-blurple` is a registration error: components can only depend on tokens themes can actually supply.

What `ValidatePage` then enforces for every instance of your type on a page:

- Properties against your `propertiesSchema` (the enforced subset: `required`, primitive `type`s, `enum`, `additionalProperties: false`). Strings containing `${...}` expressions are exempt from type checks — they resolve at runtime.
- Required `dataInputs` must be bound.
- If the instance pins a `version` (`1`, `1.2`, `1.2.3`, `^1.2`, `^1.2.3`), it must be compatible with your registered version.
- Interactions may only reference events that exist — so declare every event you dispatch.

Load manifests from Go:

```go
r, _ := registry.NewWithBuiltins()
if err := r.LoadManifestFile("manifests/acme.kpi-ribbon.json"); err != nil { ... }
// or a directory of them:
n, err := r.LoadManifestDir("manifests/")
```

## 2. The implementation contract

Whatever you render, honor these rules — they're what keeps custom components indistinguishable from builtins:

- **Root attribute**: emit `data-uiforge-component={instance.id}` on your root element. Tooling, tests, and interactions target it.
- **Style through the token contract only**: consume `--uiforge-<key>` custom properties with hard-coded fallbacks — `var(--uiforge-primary, #2563eb)` — never brand literals without a token in front. Use only keys your manifest declares.
- **Never reach into other components**: dispatch events (`ctx.dispatch(...)` / `useUIForge().dispatch(...)`) and let page-level interaction rules route them. Event names must match your manifest.
- **Async data states**: when reading connector-backed bindings, render the shared vocabulary — `data-uiforge-loading` while in flight, `data-uiforge-data-error` on failure. The `resolveBoundData` + `renderDataStatus`/`DataStatus` helpers do this for you.
- **Containers place `children`** where they belong; leaf components ignore them.
- **Dual renderers, identical DOM**: if you ship both React and Lit implementations, they must emit the same elements and `data-uiforge-*` attributes (see the builtin packs for the pattern, and the conformance suites for how to test it).

## 3. Lit implementation

A component is a template factory: `(instance, ctx?, children?) => TemplateResult`. `ctx` is the `PageContext` — `state`, `engine`, `dispatch`, and `data` (the binding resolver).

```ts
import { html, type TemplateResult } from 'lit'
import {
  registerComponent,
  renderDataStatus,
  resolveBoundData,
  type PageContext,
  type ComponentInstance,
} from '@plexusone/uiforge-renderer-lit'

export function renderKpiRibbon(
  instance: ComponentInstance,
  ctx?: PageContext,
): TemplateResult {
  const res = resolveBoundData(instance, ctx, 'metrics')
  const status = renderDataStatus(res, 'metrics')
  const metrics = Array.isArray(res?.value) ? (res.value as { name: string; value: number }[]) : []

  return html`
    <div
      data-uiforge-component=${instance.id}
      style="display: flex; gap: 12px; padding: 12px;
             background: var(--uiforge-surface, #ffffff);
             border: 1px solid var(--uiforge-border, #e2e8f0);
             border-radius: var(--uiforge-radius, 0.5rem)"
    >
      ${status ??
      metrics.map(
        (m) => html`
          <button
            style="border: none; background: none; cursor: pointer; color: var(--uiforge-primary, #2563eb)"
            @click=${() => ctx?.dispatch(instance.id, 'select', { metric: m.name })}
          >
            <div style="color: var(--uiforge-text-muted, #64748b)">${m.name}</div>
            <strong>${m.value.toLocaleString()}</strong>
          </button>
        `,
      )}
    </div>
  `
}

registerComponent('acme.kpi-ribbon', renderKpiRibbon)
```

For form-style controls that write back to page state, use `writeBinding(instance, ctx, 'value', v, 'change', { value: v })` — it stores to the bound state path and dispatches in one call.

## 4. React implementation

A component receives `{ instance, children }` and reaches the page runtime through `useUIForge()`:

```tsx
import {
  registerComponent,
  useUIForge,
  resolveBoundData,
  DataStatus,
  type ComponentProps,
} from '@plexusone/uiforge-renderer'

export function KpiRibbon({ instance }: ComponentProps) {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'metrics')
  const metrics = Array.isArray(res?.value) ? (res.value as { name: string; value: number }[]) : []

  return (
    <div
      data-uiforge-component={instance.id}
      style={{
        display: 'flex', gap: 12, padding: 12,
        background: 'var(--uiforge-surface, #ffffff)',
        border: '1px solid var(--uiforge-border, #e2e8f0)',
        borderRadius: 'var(--uiforge-radius, 0.5rem)',
      }}
    >
      {res?.status === 'loading' || res?.status === 'error' ? (
        <DataStatus res={res} name="metrics" />
      ) : (
        metrics.map((m) => (
          <button
            key={m.name}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--uiforge-primary, #2563eb)' }}
            onClick={() => ctx?.dispatch(instance.id, 'select', { metric: m.name })}
          >
            <div style={{ color: 'var(--uiforge-text-muted, #64748b)' }}>{m.name}</div>
            <strong>{m.value.toLocaleString()}</strong>
          </button>
        ))
      )}
    </div>
  )
}

registerComponent('acme.kpi-ribbon', KpiRibbon)
```

The same `writeBinding` helper exists here for state-bound controls.

## 5. Using it in a page

```json
{
  "id": "quarterly-kpis",
  "type": "acme.kpi-ribbon",
  "version": "^1.0",
  "position": { "row": 0, "col": 0, "colSpan": 12 },
  "properties": { "title": "Quarter to Date", "variant": "compact" },
  "data": {
    "metrics": { "source": "finance-api", "operation": "quarterKpis", "default": [] }
  }
}
```

Wire an interaction to your declared event:

```json
{
  "when": { "component": "quarterly-kpis", "event": "select" },
  "then": [
    { "target": "detail-table", "action": "state.set",
      "params": { "path": "filters.metric", "value": "${event.metric}" } },
    { "target": "detail-table", "action": "component.refresh" }
  ]
}
```

## 6. Testing

Test through the page, not the factory in isolation — that exercises visibility, bindings, and interactions the way production will:

- **Lit**: create a `<uiforge-page>`, set `.spec` (and `.dataSources` with a controllable fake connector), `await el.updateComplete`, query `el.shadowRoot`. See `renderers/lit/src/components/application.test.ts` and `data-runtime.test.ts` for the patterns, including the settle helper for async connector chains.
- **React**: `render(<PageRenderer page={spec} dataSources={[fake]} />)` with Testing Library; `waitFor` the loading marker to resolve. See `renderers/react/src/data-runtime.test.tsx`.
- **Go**: round-trip your manifest through `LoadManifest` and validate representative pages with `ValidatePage` — it catches contract violations before any browser is involved.

If you ship both renderer implementations, mirror the conformance-suite approach: render the same spec through both and assert on the shared `data-uiforge-*` attributes.
