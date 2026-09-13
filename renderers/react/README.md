# @plexusone/uiforge-renderer

The React renderer for [UIForge](https://github.com/plexusone/uiforge), a specification-driven UI composition platform. Renders declarative **PageSpec** JSON documents as a React component tree, validated against a governed component registry.

```tsx
import {
  PageRenderer,
  registerCoreComponents,
  registerAnalyticsComponents,
  registerApplicationComponents,
} from '@plexusone/uiforge-renderer'

registerCoreComponents()
registerAnalyticsComponents()
registerApplicationComponents()

export function App() {
  return <PageRenderer page={pageSpec} dataSources={[myConnector]} />
}
```

## Features

- All five UISpec layout primitives (responsive-grid, stack, split-pane, tabs, application-shell) plus sidebar navigation
- Builtin component packs: `core.*`, `analytics.*` (dependency-free SVG charts), `application.*` (forms, records, actions)
- Async data runtime: pluggable connectors, loading/error states, per-component caching, declarative `component.refresh`
- `${...}` expressions, page state, event→action interactions, visibility rules
- Semantic theming via scoped `--uiforge-*` CSS custom properties (design-system-spec compatible)
- Error boundaries per component; unknown types degrade to placeholders

Custom components register against the same contract:

```tsx
import { registerComponent, useUIForge } from '@plexusone/uiforge-renderer'

function AcmeWidget({ instance, children }) {
  const ctx = useUIForge()
  return <div onClick={() => ctx?.dispatch(instance.id, 'click', {})}>{children}</div>
}
registerComponent('acme.widget', AcmeWidget)
```

The emitted `data-uiforge-*` DOM vocabulary is identical to the Lit renderer's ([`@plexusone/uiforge-renderer-lit`](https://www.npmjs.com/package/@plexusone/uiforge-renderer-lit)) — switch renderers without touching your specs.

## Documentation

Full docs at [plexusone.github.io/uiforge](https://plexusone.github.io/uiforge). Peer dependencies: React 18 or 19. MIT licensed.
