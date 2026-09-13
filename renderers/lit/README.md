# @plexusone/uiforge-renderer-lit

The web-components renderer for [UIForge](https://github.com/plexusone/uiforge), a specification-driven UI composition platform. Renders declarative **PageSpec** JSON documents through a standard custom element — `<uiforge-page>` — usable in any framework or plain HTML.

```ts
import {
  registerCoreComponents,
  registerAnalyticsComponents,
  registerApplicationComponents,
} from '@plexusone/uiforge-renderer-lit'

registerCoreComponents()
registerAnalyticsComponents()
registerApplicationComponents()

const el = document.createElement('uiforge-page')
el.spec = pageSpec
el.dataSources = [myConnector]
document.body.appendChild(el)
```

## Features

- Standard web components (Lit 3) — no framework required, native browser ESM friendly
- All five UISpec layout primitives (responsive-grid, stack, split-pane, tabs, application-shell) plus sidebar navigation
- Builtin component packs: `core.*`, `analytics.*` (dependency-free SVG charts), `application.*` (forms, records, actions)
- Async data runtime: pluggable connectors, loading/error states, per-component caching, declarative `component.refresh`
- `${...}` expressions, page state, event→action interactions, visibility rules
- Semantic theming via scoped `--uiforge-*` CSS custom properties (design-system-spec compatible), including white-label brand mapping

Custom components are simple template factories:

```ts
import { html, registerComponent } from '@plexusone/uiforge-renderer-lit'

registerComponent(
  'acme.widget',
  (instance, ctx, children) =>
    html`<div @click=${() => ctx?.dispatch(instance.id, 'click', {})}>
      ${instance.properties?.title} ${children}
    </div>`,
)
```

The emitted `data-uiforge-*` DOM vocabulary is identical to the React renderer's ([`@plexusone/uiforge-renderer`](https://www.npmjs.com/package/@plexusone/uiforge-renderer)) — switch renderers without touching your specs.

## Documentation

Full docs at [plexusone.github.io/uiforge](https://plexusone.github.io/uiforge). MIT licensed.
