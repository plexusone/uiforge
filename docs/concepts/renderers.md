# Renderers

UIForge ships two renderers that consume identical PageSpecs and emit an identical `data-uiforge-*` DOM vocabulary. Pick by host stack; switch without touching your specs.

## Lit web components — `@plexusone/uiforge-renderer-lit`

Standard custom elements; works in any framework or plain HTML:

```ts
import { registerCoreComponents, registerApplicationComponents } from '@plexusone/uiforge-renderer-lit'

registerCoreComponents()
registerApplicationComponents()

const el = document.createElement('uiforge-page')
el.spec = pageSpec
el.initialState = { filters: { region: 'All' } }
el.dataSources = [connector]
document.body.appendChild(el)
```

Custom components are factories receiving the instance, a `PageContext` (`state`, `engine`, `dispatch`, `data`), and pre-rendered children:

```ts
import { html, registerComponent } from '@plexusone/uiforge-renderer-lit'

registerComponent('acme.widget', (instance, ctx, children) =>
  html`<div data-uiforge-component=${instance.id}
    @click=${() => ctx?.dispatch(instance.id, 'click', {})}>
    ${instance.properties?.title} ${children}
  </div>`)
```

## React — `@plexusone/uiforge-renderer`

```tsx
import { PageRenderer, registerComponent, useUIForge } from '@plexusone/uiforge-renderer'

function AcmeWidget({ instance, children }) {
  const ctx = useUIForge()
  return (
    <div data-uiforge-component={instance.id}
      onClick={() => ctx?.dispatch(instance.id, 'click', {})}>
      {instance.properties?.title} {children}
    </div>
  )
}
registerComponent('acme.widget', AcmeWidget)

<PageRenderer page={pageSpec} dataSources={[connector]} initialState={...} onError={...} />
```

## What both guarantee

- All five layout primitives, sidebar navigation, children/slot composition
- Visibility rules, theme tokens as scoped `--uiforge-*` properties
- The expression/state/interaction engines and the async data runtime (from `@plexusone/uiforge-spec`)
- Unknown component types render a `data-uiforge-missing` placeholder; component failures render `data-uiforge-error` without taking down the page
- The builtin `core.*`, `analytics.*`, and `application.*` packs with matching DOM

The conformance suites (`conformance.test.ts` / `.tsx`) hold the two implementations to the same output for every golden fixture — treat the DOM vocabulary as a public API.
