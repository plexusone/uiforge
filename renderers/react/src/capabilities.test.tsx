import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PageRenderer } from './PageRenderer.js'
import { clearRegistry } from './registry.js'
import { registerAnalyticsComponents } from './components/analytics.js'
import { API_VERSION, KIND_PAGE, type PageSpec } from '@plexusone/uiforge-spec'
import type { DataSourceConnector } from '@plexusone/uiforge-spec'

// React counterpart of renderers/lit/src/capabilities.test.ts — keep aligned.

function spec(): PageSpec {
  return {
    apiVersion: API_VERSION,
    kind: KIND_PAGE,
    metadata: { id: 'cap-page', name: 'cap-page', title: 'Capabilities' },
    layout: { type: 'stack' },
    components: [
      {
        id: 'revenue',
        type: 'analytics.metric',
        properties: { title: 'Revenue' },
        data: { primary: { source: 'sales-data', operation: 'total' } },
      },
      {
        id: 'period',
        type: 'analytics.filter',
        properties: { label: 'Period', options: ['daily', 'monthly'] },
        data: {
          value: {
            source: 'state',
            operation: 'get',
            parameters: { path: 'filters.period' },
            default: 'monthly',
          },
        },
      },
    ],
  }
}

function connector(onExecute?: () => void): DataSourceConnector[] {
  return [
    {
      id: 'sales-data',
      execute: () => {
        onExecute?.()
        return Promise.resolve(42)
      },
    },
  ]
}

describe('capability enforcement', () => {
  beforeEach(() => registerAnalyticsComponents())
  afterEach(() => {
    clearRegistry()
    cleanup()
  })

  it('denies connector fetches without data.read', () => {
    let executions = 0
    const { container } = render(
      <PageRenderer page={spec()} dataSources={connector(() => executions++)} capabilities={[]} />,
    )
    const error = container.querySelector('[data-uiforge-data-error="primary"]')
    expect(error?.textContent).toContain('data.read')
    expect(executions).toBe(0)
  })

  it('allows connector fetches when data.read is granted', async () => {
    const { container } = render(
      <PageRenderer page={spec()} dataSources={connector()} capabilities={['data.read']} />,
    )
    await waitFor(() =>
      expect(container.querySelector('[data-uiforge-component="revenue"]')?.textContent).toContain(
        '42',
      ),
    )
    expect(container.querySelector('[data-uiforge-data-error="primary"]')).toBeNull()
  })

  it('remains unrestricted when no grant set is supplied', async () => {
    const { container } = render(<PageRenderer page={spec()} dataSources={connector()} />)
    await waitFor(() =>
      expect(container.querySelector('[data-uiforge-component="revenue"]')?.textContent).toContain(
        '42',
      ),
    )
  })

  it('blocks state writes without state.write but allows them when granted', () => {
    const page = spec()
    // Observable effect: a component becomes visible once filters.period is written.
    page.components.push({
      id: 'written-note',
      type: 'analytics.metric',
      properties: { title: 'Written' },
      data: { primary: { source: 'x', operation: 'y', default: 1 } },
      visibility: { condition: '${state.filters.period}' },
    })

    const denied = render(<PageRenderer page={page} capabilities={['data.read']} />)
    const select = denied.container.querySelector(
      '[data-uiforge-component="period"] select',
    ) as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'daily' } })
    expect(denied.container.querySelector('[data-uiforge-component="written-note"]')).toBeNull()
    cleanup()

    const granted = render(
      <PageRenderer page={spec()} capabilities={['data.read', 'state.write']} />,
    )
    const select2 = granted.container.querySelector(
      '[data-uiforge-component="period"] select',
    ) as HTMLSelectElement
    fireEvent.change(select2, { target: { value: 'daily' } })
    // State write succeeded — the bound select reflects it after re-render.
    expect(
      (
        granted.container.querySelector(
          '[data-uiforge-component="period"] select',
        ) as HTMLSelectElement
      ).value,
    ).toBe('daily')
  })
})
