# Authoring Pages Programmatically

Hand-writing PageSpec JSON is fine for fixtures; programs should use the fluent builders — `authoring` (Go) and the same API in `@plexusone/uiforge-spec` (TypeScript). Both produce plain PageSpecs, set `apiVersion`/`kind` automatically, and report every construction problem at `Build()` time. Registry validation stays a separate, explicit step.

## Go

```go
import (
    "github.com/plexusone/uiforge/authoring"
    "github.com/plexusone/uiforge/registry"
    "github.com/plexusone/uiforge/uispec"
)

page, err := authoring.NewPage("sales", "Sales Dashboard").
    Profile(uispec.ProfileDashboard).
    Context("customerId", "cust-42").
    Grid(12, "16px").
    Theme("brand", map[string]string{"primary": "#0f766e"}).
    Add(
        authoring.Component("revenue", "analytics.metric").
            At(0, 0).Span(3, 1).
            Prop("title", "Revenue").
            Bind("primary", "sales-data", "totalRevenue",
                authoring.Param("customerId", "${context.customerId}")).
            Default("primary", 0),
        authoring.Component("note", "core.text").
            Prop("content", "Filtered").
            VisibleWhen("${state.filters.active}"),
    ).
    OnEvent("revenue", "click",
        authoring.SetState("revenue", "filters.month", "${event.label}"),
        authoring.Refresh("revenue"),
    ).
    Build()
if err != nil { ... }

r, _ := registry.NewWithBuiltins()
if err := r.ValidatePage(page); err != nil { ... }
```

Layout shortcuts: `Grid`, `Stack`, `AppShell(regions...)`; anything else via `Layout(uispec.LayoutSpec{...})`. Bindings: `Bind` (connector), `BindState(path, default)`, `BindStatic(value)`, `Default`. Containers compose with `Child(...)`; navigation with `Navigation(type, NavItem(...))`. The builder pre-checks what it can (theme tokens against the design-token contract, required ids, a layout) — everything component-contract-shaped is the registry's job.

## TypeScript

The identical API, camelCased, from `@plexusone/uiforge-spec`:

```ts
import { newPage, component, setState, refresh } from '@plexusone/uiforge-spec'

const page = newPage('sales', 'Sales Dashboard')
  .profile('dashboard')
  .grid(12, '16px')
  .theme('brand', { primary: '#0f766e' })
  .add(
    component('revenue', 'analytics.metric')
      .at(0, 0).span(3, 1)
      .prop('title', 'Revenue')
      .bind('primary', 'sales-data', 'totalRevenue', { customerId: '${context.customerId}' })
      .default('primary', 0),
  )
  .onEvent('revenue', 'click', setState('revenue', 'filters.month', '${event.label}'), refresh('revenue'))
  .build() // throws AuthoringError listing every problem
```

`build()` returns a deep clone, so the builder can keep evolving without mutating what you already shipped. This is the API AI agents and visual tooling should target: emit builder calls or the resulting JSON — never renderer code.
