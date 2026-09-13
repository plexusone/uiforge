import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerApplicationComponents } from './application.js'
import { registerCoreComponents } from './core.js'
import { clearRegistry } from '../registry.js'
import type { PageSpec } from '@plexusone/uiforge-spec'
import type { UIForgePage } from '../uiforge-page.js'
import '../uiforge-page.js'

// Drives the application-profile golden fixture end-to-end with the real
// core.* and application.* components registered.
const FIXTURE = resolve(process.cwd(), '../../testdata/pagespecs/customer-record.json')

function loadFixture(): PageSpec {
  return JSON.parse(readFileSync(FIXTURE, 'utf8')) as PageSpec
}

async function renderPage(spec: PageSpec): Promise<UIForgePage> {
  const el = document.createElement('uiforge-page')
  el.spec = spec
  document.body.appendChild(el)
  await el.updateComplete
  return el
}

function shadow(el: UIForgePage): ShadowRoot {
  return el.shadowRoot!
}

describe('application components (customer-record fixture)', () => {
  beforeEach(() => {
    registerCoreComponents()
    registerApplicationComponents()
  })

  afterEach(() => {
    clearRegistry()
    document.body.innerHTML = ''
  })

  it('renders the application shell with sidebar navigation', async () => {
    const el = await renderPage(loadFixture())
    const sidebar = shadow(el).querySelector('[data-uiforge-region="sidebar"]')
    const nav = sidebar?.querySelector('[data-uiforge-nav="sidebar"]')
    expect(nav).toBeTruthy()
    expect(nav?.querySelector('[data-uiforge-nav-item="overview"]')?.textContent).toContain(
      'Overview',
    )
    // Nested children render as a sub-list.
    expect(nav?.querySelector('[data-uiforge-nav-item="accounts"]')).toBeTruthy()
  })

  it('renders the card container with its children', async () => {
    const el = await renderPage(loadFixture())
    const card = shadow(el).querySelector('[data-uiforge-component="customer-card"]')
    expect(card?.textContent).toContain('Acme Corp')

    const badge = card?.querySelector('[data-uiforge-component="status-badge"]')
    expect(badge?.getAttribute('data-uiforge-tone')).toBe('success')

    const detail = card?.querySelector('[data-uiforge-component="customer-detail"]')
    expect(detail?.querySelector('[data-uiforge-field="industry"]')?.textContent).toContain(
      'Manufacturing',
    )
    expect(detail?.querySelector('[data-uiforge-field="owner"]')?.textContent).toContain('J. Doe')
  })

  it('renders form controls with bound default values', async () => {
    const el = await renderPage(loadFixture())
    const form = shadow(el).querySelector('[data-uiforge-component="edit-form"]')
    expect(form?.tagName).toBe('FORM')

    const input = form?.querySelector(
      '[data-uiforge-component="name-input"] input',
    ) as HTMLInputElement
    expect(input.value).toBe('Acme Corp')

    const select = form?.querySelector(
      '[data-uiforge-component="tier-select"] select',
    ) as HTMLSelectElement
    expect(select.value).toBe('Gold')

    const checkbox = form?.querySelector(
      '[data-uiforge-component="active-check"] input',
    ) as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('writes input changes to state and dispatches form submit interactions', async () => {
    const el = await renderPage(loadFixture())
    const input = shadow(el).querySelector(
      '[data-uiforge-component="name-input"] input',
    ) as HTMLInputElement
    input.value = 'Acme Holdings'
    input.dispatchEvent(new Event('change'))
    expect(el.state.get('form.name')).toBe('Acme Holdings')

    const form = shadow(el).querySelector('[data-uiforge-component="edit-form"]') as HTMLFormElement
    form.dispatchEvent(new Event('submit'))
    await el.updateComplete
    expect(el.state.get('form.saved')).toBe(true)
  })

  it('dispatches action-bar actions with expression-evaluated params', async () => {
    const el = await renderPage(loadFixture())
    const bar = shadow(el).querySelector('[data-uiforge-component="record-actions"]')
    const del = bar?.querySelector('[data-uiforge-action="delete"]') as HTMLElement
    del.click()
    await el.updateComplete
    expect(el.state.get('form.lastAction')).toBe('delete')
  })

  it('renders a record list with selection events', async () => {
    const spec = loadFixture()
    spec.layout = { type: 'stack' }
    spec.navigation = undefined
    spec.interactions = [
      {
        when: { component: 'people', event: 'select' },
        then: [
          {
            target: 'people',
            action: 'state.set',
            params: { path: 'selected', value: '${event.id}' },
          },
        ],
      },
    ]
    spec.components = [
      {
        id: 'people',
        type: 'application.record-list',
        properties: { title: 'People', selectable: true },
        data: {
          records: {
            source: 'static',
            operation: 'value',
            parameters: {
              value: [
                { id: 'p1', name: 'Ada', role: 'Eng' },
                { id: 'p2', name: 'Grace', role: 'Ops' },
              ],
            },
          },
        },
      },
    ]
    const el = await renderPage(spec)
    const list = shadow(el).querySelector('[data-uiforge-component="people"]')
    expect(list?.querySelectorAll('tbody tr').length).toBe(2)

    const secondRow = list?.querySelectorAll('tbody tr')[1] as HTMLElement
    secondRow.click()
    await el.updateComplete
    expect(el.state.get('selected')).toBe('p2')
  })

  it('core.button dispatches click through interactions', async () => {
    const spec = loadFixture()
    spec.layout = { type: 'stack' }
    spec.navigation = undefined
    spec.interactions = [
      {
        when: { component: 'go', event: 'click' },
        then: [{ target: 'go', action: 'state.set', params: { path: 'clicked', value: true } }],
      },
    ]
    spec.components = [{ id: 'go', type: 'core.button', properties: { label: 'Go' } }]
    const el = await renderPage(spec)
    const button = shadow(el).querySelector('[data-uiforge-component="go"]') as HTMLElement
    button.click()
    await el.updateComplete
    expect(el.state.get('clicked')).toBe(true)
  })
})
