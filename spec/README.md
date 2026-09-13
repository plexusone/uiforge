# @plexusone/uiforge-spec

The renderer-independent layer of [UIForge](https://github.com/plexusone/uiforge), a specification-driven UI composition platform: the **UISpec** TypeScript types (PageSpec, ComponentInstance, LayoutSpec, Binding, Interaction, …) and the framework-free runtime engines shared by every UIForge renderer.

## What's inside

- **Types** — the TypeScript mirror of the UISpec IR (`apiVersion: ui.plexusone.dev/v1`); the Go types in the UIForge repository are the source of truth
- **`evaluateExpression`** — `${path.to.value}` expression evaluation over context maps
- **`PageState`** — hierarchical page state store with path subscriptions
- **`InteractionEngine`** — event → action dispatch (`state.set`, `state.toggle`, extensible handlers)
- **`DataSourceRegistry` / `DataSourceConnector`** — async data-source contract with expression-evaluated parameters and transforms
- **`resolveBinding` / `DataResolution`** — synchronous binding resolution and the loading/ready/error state model

Everything runs in Node or the browser with zero dependencies.

## Usage

```ts
import {
  type PageSpec,
  PageState,
  InteractionEngine,
  evaluateExpression,
} from '@plexusone/uiforge-spec'

const state = new PageState()
const engine = new InteractionEngine(state)
engine.dispatch(page.interactions ?? [], 'revenue-chart', 'pointSelected', { month: 'Jun' })
```

Most applications consume this package indirectly through a renderer:
[`@plexusone/uiforge-renderer`](https://www.npmjs.com/package/@plexusone/uiforge-renderer) (React) or
[`@plexusone/uiforge-renderer-lit`](https://www.npmjs.com/package/@plexusone/uiforge-renderer-lit) (web components).

## Documentation

Full docs at [plexusone.github.io/uiforge](https://plexusone.github.io/uiforge). MIT licensed.
