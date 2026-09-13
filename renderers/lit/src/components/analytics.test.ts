import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerAnalyticsComponents } from './analytics.js'
import { clearRegistry } from '../registry.js'
import {
  API_VERSION,
  KIND_PAGE,
  type ComponentInstance,
  type PageSpec,
} from '@plexusone/uiforge-spec'
import type { UIForgePage } from '../uiforge-page.js'
import '../uiforge-page'

function page(components: ComponentInstance[], overrides: Partial<PageSpec> = {}): PageSpec {
  return {
    apiVersion: API_VERSION,
    kind: KIND_PAGE,
    metadata: { id: 'analytics-page', name: 'analytics-page', title: 'Analytics' },
    layout: { type: 'stack' },
    components,
    ...overrides,
  }
}

async function renderPage(spec: PageSpec): Promise<UIForgePage> {
  const el = document.createElement('uiforge-page')
  el.spec = spec
  document.body.appendChild(el)
  await el.updateComplete
  return el
}

function component(el: UIForgePage, id: string): HTMLElement {
  return el.shadowRoot?.querySelector(`[data-uiforge-component="${id}"]`) as HTMLElement
}

describe('analytics components', () => {
  beforeEach(() => {
    registerAnalyticsComponents()
  })

  afterEach(() => {
    clearRegistry()
    document.body.innerHTML = ''
  })

  it('renders a metric with static data and currency formatting', async () => {
    const el = await renderPage(
      page([
        {
          id: 'revenue',
          type: 'analytics.metric',
          properties: { title: 'Total Revenue', format: 'currency', prefix: '$' },
          data: {
            primary: { source: 'static', operation: 'value', parameters: { value: 1234567.89 } },
          },
        },
      ]),
    )
    const metric = component(el, 'revenue')
    expect(metric.textContent).toContain('Total Revenue')
    expect(metric.textContent).toContain('$1,234,567.89')
  })

  it('renders an empty state when external data is unresolved', async () => {
    const el = await renderPage(
      page([
        {
          id: 'orders',
          type: 'analytics.metric',
          properties: { title: 'Orders' },
          data: { primary: { source: 'sales-data', operation: 'query' } },
        },
      ]),
    )
    expect(component(el, 'orders').textContent).toContain('No data')
  })

  it('falls back to the binding default for external sources', async () => {
    const el = await renderPage(
      page([
        {
          id: 'orders',
          type: 'analytics.metric',
          properties: { title: 'Orders' },
          data: { primary: { source: 'sales-data', operation: 'query', default: 42 } },
        },
      ]),
    )
    expect(component(el, 'orders').textContent).toContain('42')
  })

  it('renders a table with columns inferred from row keys', async () => {
    const rows = [
      { order: 'A-1', region: 'West', total: 120 },
      { order: 'A-2', region: 'East', total: 80 },
    ]
    const el = await renderPage(
      page([
        {
          id: 'orders-table',
          type: 'analytics.table',
          properties: { title: 'Recent Orders' },
          data: { primary: { source: 'static', operation: 'value', parameters: { value: rows } } },
        },
      ]),
    )
    const table = component(el, 'orders-table')
    expect(table.querySelectorAll('th').length).toBe(3)
    expect(table.querySelectorAll('tbody tr').length).toBe(2)
    expect(table.textContent).toContain('A-2')
  })

  it('renders line and bar charts as SVG from series data', async () => {
    const series = [
      { month: 'Jan', revenue: 100 },
      { month: 'Feb', revenue: 200 },
      { month: 'Mar', revenue: 150 },
    ]
    const el = await renderPage(
      page([
        {
          id: 'trend',
          type: 'analytics.line-chart',
          properties: { title: 'Revenue Trend', xAxis: 'month', yAxis: 'revenue' },
          data: {
            primary: { source: 'static', operation: 'value', parameters: { value: series } },
          },
        },
        {
          id: 'breakdown',
          type: 'analytics.bar-chart',
          properties: { title: 'By Month' },
          data: {
            primary: { source: 'static', operation: 'value', parameters: { value: series } },
          },
        },
      ]),
    )
    expect(component(el, 'trend').querySelector('svg polyline')).toBeTruthy()
    expect(component(el, 'breakdown').querySelectorAll('svg rect').length).toBe(3)
  })

  it('renders a gauge with a meter bar', async () => {
    const el = await renderPage(
      page([
        {
          id: 'cpu',
          type: 'analytics.gauge',
          properties: { title: 'CPU', unit: '%', min: 0, max: 100 },
          data: { primary: { source: 'static', operation: 'value', parameters: { value: 65 } } },
        },
      ]),
    )
    const gauge = component(el, 'cpu')
    expect(gauge.textContent).toContain('65%')
    expect(gauge.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('65')
  })

  it('filter writes state and triggers interactions on change', async () => {
    const spec = page(
      [
        {
          id: 'period-filter',
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
        {
          id: 'note',
          type: 'analytics.metric',
          properties: { title: 'Filtered' },
          data: { primary: { source: 'sales-data', operation: 'query' } },
          visibility: { condition: '${state.filters.changed}' },
        },
      ],
      {
        interactions: [
          {
            when: { component: 'period-filter', event: 'change' },
            then: [
              {
                target: 'note',
                action: 'state.set',
                params: { path: 'filters.changed', value: true },
              },
            ],
          },
        ],
      },
    )
    const el = await renderPage(spec)
    expect(el.shadowRoot?.querySelector('[data-uiforge-cell="note"]')).toBeNull()

    const select = component(el, 'period-filter').querySelector('select') as HTMLSelectElement
    select.value = 'daily'
    select.dispatchEvent(new Event('change'))
    await el.updateComplete

    expect(el.state.get('filters.period')).toBe('daily')
    expect(el.state.get('filters.changed')).toBe(true)
    expect(el.shadowRoot?.querySelector('[data-uiforge-cell="note"]')).toBeTruthy()
  })
})
