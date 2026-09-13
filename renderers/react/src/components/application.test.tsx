import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PageRenderer } from '../PageRenderer.js'
import { clearRegistry } from '../registry.js'
import { registerApplicationComponents } from './application.js'
import { registerCoreComponents } from './core.js'
import type { PageSpec } from '@plexusone/uiforge-spec'

// Drives the application-profile golden fixture end-to-end with the real
// core.* and application.* components registered — the React counterpart of
// renderers/lit/src/components/application.test.ts.
const FIXTURE = resolve(process.cwd(), '../../testdata/pagespecs/customer-record.json')

function loadFixture(): PageSpec {
  return JSON.parse(readFileSync(FIXTURE, 'utf8')) as PageSpec
}

describe('application components (customer-record fixture)', () => {
  beforeEach(() => {
    registerCoreComponents()
    registerApplicationComponents()
  })

  afterEach(() => {
    clearRegistry()
    cleanup()
  })

  it('renders the application shell with sidebar navigation', () => {
    const { container } = render(<PageRenderer page={loadFixture()} />)
    const sidebar = container.querySelector('[data-uiforge-region="sidebar"]')
    const nav = sidebar?.querySelector('[data-uiforge-nav="sidebar"]')
    expect(nav).toBeTruthy()
    expect(nav?.querySelector('[data-uiforge-nav-item="overview"]')?.textContent).toContain(
      'Overview',
    )
    expect(nav?.querySelector('[data-uiforge-nav-item="accounts"]')).toBeTruthy()
  })

  it('renders the card container with its children', () => {
    const { container } = render(<PageRenderer page={loadFixture()} />)
    const card = container.querySelector('[data-uiforge-component="customer-card"]')
    expect(card?.textContent).toContain('Acme Corp')

    const badge = card?.querySelector('[data-uiforge-component="status-badge"]')
    expect(badge?.getAttribute('data-uiforge-tone')).toBe('success')

    const detail = card?.querySelector('[data-uiforge-component="customer-detail"]')
    expect(detail?.querySelector('[data-uiforge-field="industry"]')?.textContent).toContain(
      'Manufacturing',
    )
    expect(detail?.querySelector('[data-uiforge-field="owner"]')?.textContent).toContain('J. Doe')
  })

  it('renders form controls with bound default values', () => {
    const { container } = render(<PageRenderer page={loadFixture()} />)
    const form = container.querySelector('[data-uiforge-component="edit-form"]')
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

  it('writes input changes to state and dispatches form submit interactions', () => {
    const spec = loadFixture()
    // Observable effect: a marker component becomes visible once the form's
    // submit interaction sets state.form.saved.
    spec.components.push({
      id: 'saved-note',
      type: 'core.text',
      properties: { content: 'Saved!' },
      visibility: { condition: '${state.form.saved}' },
    })
    const { container } = render(<PageRenderer page={spec} />)
    const input = container.querySelector(
      '[data-uiforge-component="name-input"] input',
    ) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Acme Holdings' } })
    expect(input.value).toBe('Acme Holdings')
    expect(container.querySelector('[data-uiforge-component="saved-note"]')).toBeNull()

    const form = container.querySelector('[data-uiforge-component="edit-form"]') as HTMLFormElement
    fireEvent.submit(form)

    expect(container.querySelector('[data-uiforge-component="saved-note"]')?.textContent).toContain(
      'Saved!',
    )
  })

  it('dispatches action-bar actions with expression-evaluated params', () => {
    const spec = loadFixture()
    // Observable effect: the fixture's action interaction stores
    // ${event.action} at state.form.lastAction; surface it via visibility.
    spec.components.push({
      id: 'action-note',
      type: 'core.text',
      properties: { content: 'acted' },
      visibility: { condition: '${state.form.lastAction}' },
    })
    const { container } = render(<PageRenderer page={spec} />)
    expect(container.querySelector('[data-uiforge-component="action-note"]')).toBeNull()

    const bar = container.querySelector('[data-uiforge-component="record-actions"]')
    const del = bar?.querySelector('[data-uiforge-action="delete"]') as HTMLElement
    fireEvent.click(del)

    expect(container.querySelector('[data-uiforge-component="action-note"]')).toBeTruthy()
  })
})
