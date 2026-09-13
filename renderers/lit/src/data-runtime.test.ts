import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerAnalyticsComponents } from './components/analytics.js'
import { clearRegistry } from './registry.js'
import type { DataSourceConnector } from '@plexusone/uiforge-spec'
import { API_VERSION, KIND_PAGE, type PageSpec } from '@plexusone/uiforge-spec'
import type { UIForgePage } from './uiforge-page.js'
import './uiforge-page.js'

// Deferred lets tests control exactly when a connector settles.
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (err: Error) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function salesPage(overrides: Partial<PageSpec> = {}): PageSpec {
  return {
    apiVersion: API_VERSION,
    kind: KIND_PAGE,
    metadata: { id: 'data-page', name: 'data-page', title: 'Data Page' },
    context: { customerId: 'cust-42' },
    layout: { type: 'stack' },
    components: [
      {
        id: 'revenue',
        type: 'analytics.metric',
        properties: { title: 'Revenue' },
        data: {
          primary: {
            source: 'sales-data',
            operation: 'totalRevenue',
            parameters: { customerId: '${context.customerId}' },
          },
        },
      },
    ],
    ...overrides,
  }
}

async function renderPage(
  spec: PageSpec,
  dataSources?: DataSourceConnector[],
): Promise<UIForgePage> {
  const el = document.createElement('uiforge-page')
  el.spec = spec
  if (dataSources) el.dataSources = dataSources
  document.body.appendChild(el)
  await el.updateComplete
  return el
}

function metric(el: UIForgePage): HTMLElement {
  return el.shadowRoot?.querySelector('[data-uiforge-component="revenue"]') as HTMLElement
}

// settle flushes the microtask chain (connector settle → cache write →
// requestUpdate) and waits for the resulting render.
async function settle(el: UIForgePage): Promise<void> {
  await new Promise((r) => setTimeout(r, 0))
  await el.updateComplete
  await new Promise((r) => setTimeout(r, 0))
  await el.updateComplete
}

describe('data-source runtime', () => {
  beforeEach(() => {
    registerAnalyticsComponents()
  })

  afterEach(() => {
    clearRegistry()
    document.body.innerHTML = ''
  })

  it('shows a loading state, then renders the resolved value', async () => {
    const d = deferred<number>()
    const el = await renderPage(salesPage(), [{ id: 'sales-data', execute: () => d.promise }])

    expect(metric(el).querySelector('[data-uiforge-loading="primary"]')).toBeTruthy()

    d.resolve(606000)
    await settle(el)

    expect(metric(el).querySelector('[data-uiforge-loading="primary"]')).toBeNull()
    expect(metric(el).textContent).toContain('606,000')
  })

  it('shows an error state when the connector rejects', async () => {
    const d = deferred<number>()
    const el = await renderPage(salesPage(), [{ id: 'sales-data', execute: () => d.promise }])

    d.reject(new Error('upstream unavailable'))
    await d.promise.catch(() => undefined)
    await settle(el)

    const error = metric(el).querySelector('[data-uiforge-data-error="primary"]')
    expect(error?.textContent).toContain('upstream unavailable')
  })

  it('evaluates ${...} expressions in binding parameters before execute', async () => {
    const calls: Array<[string, Record<string, unknown>]> = []
    const el = await renderPage(salesPage(), [
      {
        id: 'sales-data',
        execute: (operation, params) => {
          calls.push([operation, params])
          return Promise.resolve(1)
        },
      },
    ])
    await el.updateComplete

    expect(calls).toEqual([['totalRevenue', { customerId: 'cust-42' }]])
  })

  it('caches resolved data across re-renders and only fetches once', async () => {
    let executions = 0
    const el = await renderPage(salesPage(), [
      {
        id: 'sales-data',
        execute: () => {
          executions++
          return Promise.resolve(42)
        },
      },
    ])
    await settle(el)

    // Force extra render passes through the interaction path.
    el.dispatch('revenue', 'click', {})
    await settle(el)

    expect(executions).toBe(1)
    expect(metric(el).textContent).toContain('42')
  })

  it('re-fetches after a component.refresh interaction invalidates the cache', async () => {
    let executions = 0
    const spec = salesPage({
      components: [
        ...salesPage().components,
        { id: 'refresher', type: 'analytics.metric', properties: { title: 'N/A' } },
      ],
      interactions: [
        {
          when: { component: 'refresher', event: 'click' },
          then: [{ target: 'revenue', action: 'component.refresh' }],
        },
      ],
    })
    const el = await renderPage(spec, [
      {
        id: 'sales-data',
        execute: () => {
          executions++
          return Promise.resolve(executions * 100)
        },
      },
    ])
    await settle(el)
    expect(executions).toBe(1)

    el.dispatch('refresher', 'click', {})
    await settle(el)

    expect(executions).toBe(2)
    expect(metric(el).textContent).toContain('200')
  })

  it('falls back to the binding default when no connector is registered', async () => {
    const spec = salesPage()
    spec.components[0].data!.primary.default = 7
    const el = await renderPage(spec) // no dataSources at all
    expect(metric(el).textContent).toContain('7')
    expect(metric(el).querySelector('[data-uiforge-loading="primary"]')).toBeNull()
  })
})
