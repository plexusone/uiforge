import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerAnalyticsComponents } from './components/analytics.js'
import { clearRegistry } from './registry.js'
import { API_VERSION, KIND_PAGE, type PageSpec } from '@plexusone/uiforge-spec'
import type { UIForgePage } from './uiforge-page.js'
import './uiforge-page.js'

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

async function renderPage(caps?: string[], onExecute?: () => void): Promise<UIForgePage> {
  const el = document.createElement('uiforge-page')
  el.spec = spec()
  el.dataSources = [
    {
      id: 'sales-data',
      execute: () => {
        onExecute?.()
        return Promise.resolve(42)
      },
    },
  ]
  if (caps) el.capabilities = caps
  document.body.appendChild(el)
  await el.updateComplete
  await new Promise((r) => setTimeout(r, 0))
  await el.updateComplete
  return el
}

describe('capability enforcement', () => {
  beforeEach(() => registerAnalyticsComponents())
  afterEach(() => {
    clearRegistry()
    document.body.innerHTML = ''
  })

  it('denies connector fetches without data.read', async () => {
    let executions = 0
    const el = await renderPage([], () => executions++)
    const error = el.shadowRoot?.querySelector('[data-uiforge-data-error="primary"]')
    expect(error?.textContent).toContain('data.read')
    expect(executions).toBe(0)
  })

  it('allows connector fetches when data.read is granted', async () => {
    const el = await renderPage(['data.read', 'state.write'])
    expect(el.shadowRoot?.querySelector('[data-uiforge-data-error="primary"]')).toBeNull()
    expect(
      el.shadowRoot?.querySelector('[data-uiforge-component="revenue"]')?.textContent,
    ).toContain('42')
  })

  it('remains unrestricted when no grant set is supplied', async () => {
    const el = await renderPage(undefined)
    expect(
      el.shadowRoot?.querySelector('[data-uiforge-component="revenue"]')?.textContent,
    ).toContain('42')
    expect(el.hasCapability('anything.at.all')).toBe(true)
  })

  it('blocks state writes without state.write but still dispatches the event', async () => {
    const el = await renderPage(['data.read'])
    const select = el.shadowRoot?.querySelector(
      '[data-uiforge-component="period"] select',
    ) as HTMLSelectElement
    select.value = 'daily'
    select.dispatchEvent(new Event('change'))
    await el.updateComplete

    expect(el.state.get('filters.period')).toBeUndefined()

    const granted = await renderPage(['data.read', 'state.write'])
    const select2 = granted.shadowRoot?.querySelector(
      '[data-uiforge-component="period"] select',
    ) as HTMLSelectElement
    select2.value = 'daily'
    select2.dispatchEvent(new Event('change'))
    await granted.updateComplete
    expect(granted.state.get('filters.period')).toBe('daily')
  })
})
