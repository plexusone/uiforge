import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { html } from 'lit'
import { registerCoreComponents } from './components/core.js'
import { clearRegistry, registerComponent } from './registry.js'
import { API_VERSION, KIND_PAGE, type LayoutSpec, type PageSpec } from '@plexusone/uiforge-spec'
import type { UIForgePage } from './uiforge-page.js'
import './uiforge-page.js'

function pageSpec(overrides: Partial<PageSpec> = {}): PageSpec {
  return {
    apiVersion: API_VERSION,
    kind: KIND_PAGE,
    metadata: { id: 'test-page', name: 'test-page', title: 'Test Page' },
    profile: 'dashboard',
    layout: { type: 'stack' },
    components: [
      {
        id: 'greeting',
        type: 'core.text',
        properties: { content: 'Hello UIForge', variant: 'heading' },
      },
      { id: 'mystery', type: 'custom.widget' },
    ],
    ...overrides,
  }
}

async function renderPage(
  spec: PageSpec,
  initialState?: Record<string, unknown>,
): Promise<UIForgePage> {
  const el = document.createElement('uiforge-page')
  el.spec = spec
  if (initialState) el.initialState = initialState
  document.body.appendChild(el)
  await el.updateComplete
  return el
}

function root(el: UIForgePage): Element | null | undefined {
  return el.shadowRoot?.querySelector('[data-uiforge-page]')
}

describe('<uiforge-page>', () => {
  beforeEach(() => {
    registerCoreComponents()
  })

  afterEach(() => {
    clearRegistry()
    document.body.innerHTML = ''
  })

  it('renders a stack page with registered and missing components', async () => {
    const el = await renderPage(pageSpec())
    const page = root(el)
    expect(page?.getAttribute('data-uiforge-page')).toBe('test-page')
    expect(page?.getAttribute('data-uiforge-profile')).toBe('dashboard')

    const layout = page?.querySelector('[data-uiforge-layout="stack"]')
    expect(layout).toBeTruthy()

    const heading = layout?.querySelector('[data-uiforge-component="greeting"]')
    expect(heading?.tagName).toBe('H2')
    expect(heading?.textContent).toContain('Hello UIForge')

    const missing = layout?.querySelector('[data-uiforge-missing="custom.widget"]')
    expect(missing?.textContent).toContain('custom.widget')
  })

  it('renders a responsive grid with explicit cell placement', async () => {
    const spec = pageSpec({
      layout: { type: 'responsive-grid', config: { columns: 6, gap: '8px' } },
      components: [
        {
          id: 'img-1',
          type: 'core.image',
          position: { row: 1, col: 2, colSpan: 3 },
          properties: { src: 'https://example.com/a.png', alt: 'A' },
        },
      ],
    })
    const el = await renderPage(spec)
    const layout = root(el)?.querySelector('[data-uiforge-layout="responsive-grid"]')
    expect(layout).toBeTruthy()

    const cell = layout?.querySelector('[data-uiforge-cell="img-1"]') as HTMLElement
    expect(cell).toBeTruthy()
    expect(cell.style.gridColumn).toBe('3 / span 3')
    expect(cell.style.gridRow).toBe('2 / span 1')

    const img = cell.querySelector('img[data-uiforge-component="img-1"]')
    expect(img?.getAttribute('alt')).toBe('A')
  })

  it('renders split-pane regions with sizes and nested layouts', async () => {
    const spec = pageSpec({
      layout: {
        type: 'split-pane',
        config: { direction: 'horizontal', sizes: ['260px'] },
        regions: [{ name: 'sidebar', layout: { type: 'stack' } }, { name: 'main' }],
      },
      components: [],
    })
    const el = await renderPage(spec)
    const layout = root(el)?.querySelector('[data-uiforge-layout="split-pane"]')
    expect(layout).toBeTruthy()

    const sidebar = layout?.querySelector('[data-uiforge-region="sidebar"]') as HTMLElement
    expect(sidebar.style.flex).toBe('0 0 260px')
    expect(sidebar.querySelector('[data-uiforge-layout="stack"]')).toBeTruthy()

    const main = layout?.querySelector('[data-uiforge-region="main"]') as HTMLElement
    expect(main.style.flexGrow).toBe('1')
  })

  it('renders tabs and switches the active panel on click', async () => {
    const spec = pageSpec({
      layout: { type: 'tabs', regions: [{ name: 'overview' }, { name: 'details' }] },
      components: [],
    })
    const el = await renderPage(spec)
    const layout = root(el)?.querySelector('[data-uiforge-layout="tabs"]')
    const tabs = layout?.querySelectorAll('[role="tab"]')
    expect(tabs?.length).toBe(2)

    const overview = layout?.querySelector(
      '[role="tabpanel"][data-uiforge-region="overview"]',
    ) as HTMLElement
    const details = layout?.querySelector(
      '[role="tabpanel"][data-uiforge-region="details"]',
    ) as HTMLElement
    expect(overview.hidden).toBe(false)
    expect(details.hidden).toBe(true)
    ;(tabs?.[1] as HTMLElement).click()
    await el.updateComplete

    const detailsAfter = root(el)?.querySelector(
      '[role="tabpanel"][data-uiforge-region="details"]',
    ) as HTMLElement
    expect(detailsAfter.hidden).toBe(false)
  })

  it('renders an application shell with region slots and main components', async () => {
    const spec = pageSpec({
      layout: {
        type: 'application-shell',
        regions: [{ name: 'header' }, { name: 'sidebar' }, { name: 'main' }],
      },
    })
    const el = await renderPage(spec)
    const layout = root(el)?.querySelector('[data-uiforge-layout="application-shell"]')
    expect(layout?.querySelector('[data-uiforge-region="header"]')).toBeTruthy()
    expect(layout?.querySelector('[data-uiforge-region="sidebar"]')).toBeTruthy()
    expect(layout?.querySelector('[data-uiforge-region="aside"]')).toBeNull()

    const main = layout?.querySelector('[data-uiforge-region="main"]')
    expect(main?.querySelector('[data-uiforge-component="greeting"]')).toBeTruthy()
  })

  it('reports unknown layouts but still renders components', async () => {
    const el = await renderPage(pageSpec({ layout: { type: 'canvas' } as unknown as LayoutSpec }))
    const err = root(el)?.querySelector('[data-uiforge-error="unknown layout: canvas"]')
    expect(err).toBeTruthy()
    expect(err?.querySelector('[data-uiforge-component="greeting"]')).toBeTruthy()
  })

  it('applies theme tokens as --uiforge-* custom properties', async () => {
    const el = await renderPage(
      pageSpec({ theme: { id: 'corporate', tokens: { primary: '#0f172a' } } }),
    )
    const page = root(el) as HTMLElement
    expect(page.style.getPropertyValue('--uiforge-primary')).toBe('#0f172a')
  })

  it('hides components whose visibility condition evaluates falsy', async () => {
    const spec = pageSpec({
      components: [
        { id: 'always', type: 'core.text', properties: { content: 'shown' } },
        {
          id: 'never',
          type: 'core.text',
          properties: { content: 'hidden' },
          visibility: { condition: 'false' },
        },
        {
          id: 'by-state',
          type: 'core.text',
          properties: { content: 'toggled' },
          visibility: { condition: '${state.showExtra}' },
        },
      ],
    })
    const el = await renderPage(spec, { showExtra: false })
    const layout = root(el)?.querySelector('[data-uiforge-layout="stack"]')
    expect(layout?.querySelector('[data-uiforge-cell="always"]')).toBeTruthy()
    expect(layout?.querySelector('[data-uiforge-cell="never"]')).toBeNull()
    expect(layout?.querySelector('[data-uiforge-cell="by-state"]')).toBeNull()
  })

  it('renders a data-uiforge-error cell when a component factory throws', async () => {
    registerComponent('boom.widget', () => {
      throw new Error('kaboom')
    })
    const el = await renderPage(pageSpec({ components: [{ id: 'exploder', type: 'boom.widget' }] }))
    const err = root(el)?.querySelector('[data-uiforge-error="exploder"]')
    expect(err?.textContent).toContain('kaboom')
  })

  it('dispatches interactions that update page state', async () => {
    registerComponent(
      'demo.button',
      (instance, ctx) =>
        html`<button
          data-uiforge-component=${instance.id}
          @click=${() => ctx?.dispatch(instance.id, 'press', { value: 'clicked' })}
        >
          go
        </button>`,
    )
    const spec = pageSpec({
      components: [
        { id: 'trigger', type: 'demo.button' },
        {
          id: 'result',
          type: 'core.text',
          properties: { content: 'now visible' },
          visibility: { condition: '${state.pressed}' },
        },
      ],
      interactions: [
        {
          when: { component: 'trigger', event: 'press' },
          then: [
            { target: 'result', action: 'state.set', params: { path: 'pressed', value: true } },
          ],
        },
      ],
    })
    const el = await renderPage(spec)
    expect(root(el)?.querySelector('[data-uiforge-cell="result"]')).toBeNull()

    const button = root(el)?.querySelector('[data-uiforge-component="trigger"]') as HTMLElement
    button.click()
    await el.updateComplete

    expect(el.state.get('pressed')).toBe(true)
    expect(root(el)?.querySelector('[data-uiforge-cell="result"]')).toBeTruthy()
  })

  it('renders nothing without a spec', async () => {
    const el = document.createElement('uiforge-page')
    document.body.appendChild(el)
    await el.updateComplete
    expect(el.shadowRoot?.querySelector('[data-uiforge-page]')).toBeNull()
  })
})
