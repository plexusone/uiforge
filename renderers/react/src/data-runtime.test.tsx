import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PageRenderer } from './PageRenderer.js'
import { clearRegistry } from './registry.js'
import { registerAnalyticsComponents } from './components/analytics.js'
import type { DataSourceConnector } from '@plexusone/uiforge-spec'
import { API_VERSION, KIND_PAGE, type PageSpec } from '@plexusone/uiforge-spec'

// React counterpart of renderers/lit/src/data-runtime.test.ts — keep the
// covered behaviors aligned.

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

function metric(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-uiforge-component="revenue"]') as HTMLElement
}

describe('data-source runtime', () => {
  beforeEach(() => {
    registerAnalyticsComponents()
  })

  afterEach(() => {
    clearRegistry()
    cleanup()
  })

  it('shows a loading state, then renders the resolved value', async () => {
    const d = deferred<number>()
    const connectors: DataSourceConnector[] = [{ id: 'sales-data', execute: () => d.promise }]
    const { container } = render(<PageRenderer page={salesPage()} dataSources={connectors} />)

    expect(metric(container).querySelector('[data-uiforge-loading="primary"]')).toBeTruthy()

    d.resolve(606000)
    await waitFor(() => {
      expect(metric(container).querySelector('[data-uiforge-loading="primary"]')).toBeNull()
      expect(metric(container).textContent).toContain('606,000')
    })
  })

  it('shows an error state when the connector rejects', async () => {
    const d = deferred<number>()
    const connectors: DataSourceConnector[] = [{ id: 'sales-data', execute: () => d.promise }]
    const { container } = render(<PageRenderer page={salesPage()} dataSources={connectors} />)

    d.reject(new Error('upstream unavailable'))
    await waitFor(() => {
      const error = metric(container).querySelector('[data-uiforge-data-error="primary"]')
      expect(error?.textContent).toContain('upstream unavailable')
    })
  })

  it('evaluates ${...} expressions in binding parameters before execute', async () => {
    const calls: Array<[string, Record<string, unknown>]> = []
    const connectors: DataSourceConnector[] = [
      {
        id: 'sales-data',
        execute: (operation, params) => {
          calls.push([operation, params])
          return Promise.resolve(1)
        },
      },
    ]
    const { container } = render(<PageRenderer page={salesPage()} dataSources={connectors} />)

    await waitFor(() => expect(metric(container).textContent).toContain('1'))
    expect(calls).toEqual([['totalRevenue', { customerId: 'cust-42' }]])
  })

  it('caches resolved data across re-renders and only fetches once', async () => {
    let executions = 0
    const connectors: DataSourceConnector[] = [
      {
        id: 'sales-data',
        execute: () => {
          executions++
          return Promise.resolve(42)
        },
      },
    ]
    const { container } = render(<PageRenderer page={salesPage()} dataSources={connectors} />)
    await waitFor(() => expect(metric(container).textContent).toContain('42'))

    // Force extra render passes through the interaction path: a bar-chart
    // click dispatches and re-renders.
    fireEvent.click(metric(container))
    await waitFor(() => expect(metric(container).textContent).toContain('42'))

    expect(executions).toBe(1)
  })

  it('re-fetches after a component.refresh interaction invalidates the cache', async () => {
    let executions = 0
    const spec = salesPage({
      components: [
        ...salesPage().components,
        {
          id: 'refresher',
          type: 'analytics.bar-chart',
          properties: { title: 'Refresh' },
          data: {
            primary: {
              source: 'static',
              operation: 'value',
              parameters: { value: [{ label: 'go', value: 1 }] },
            },
          },
        },
      ],
      interactions: [
        {
          when: { component: 'refresher', event: 'click' },
          then: [{ target: 'revenue', action: 'component.refresh' }],
        },
      ],
    })
    const connectors: DataSourceConnector[] = [
      {
        id: 'sales-data',
        execute: () => {
          executions++
          return Promise.resolve(executions * 100)
        },
      },
    ]
    const { container } = render(<PageRenderer page={spec} dataSources={connectors} />)
    await waitFor(() => expect(metric(container).textContent).toContain('100'))
    expect(executions).toBe(1)

    const bar = container.querySelector('[data-uiforge-component="refresher"] svg rect')!
    fireEvent.click(bar)

    await waitFor(() => expect(metric(container).textContent).toContain('200'))
    expect(executions).toBe(2)
  })

  it('falls back to the binding default when no connector is registered', () => {
    const spec = salesPage()
    spec.components[0].data!.primary.default = 7
    const { container } = render(<PageRenderer page={spec} />)
    expect(metric(container).textContent).toContain('7')
    expect(metric(container).querySelector('[data-uiforge-loading="primary"]')).toBeNull()
  })
})
