import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { registerCoreComponents } from './components/core.js'
import { clearRegistry } from './registry.js'
import { API_VERSION, KIND_PAGE, type PageSpec } from '@plexusone/uiforge-spec'
import type { UIForgePage } from './uiforge-page.js'
import './uiforge-page.js'

function themedSpec(): PageSpec {
  return {
    apiVersion: API_VERSION,
    kind: KIND_PAGE,
    metadata: { id: 'themed', name: 'themed', title: 'Themed' },
    layout: { type: 'stack' },
    theme: {
      id: 'brand',
      variant: 'dark',
      density: 'compact',
      densities: { comfortable: 1, compact: 0.75 },
      tokens: { primary: '#0f766e', surface: '#111111' },
      modes: {
        light: { primary: '#0d9488', surface: '#ffffff' },
      },
    },
    components: [{ id: 't', type: 'core.text', properties: { content: 'hello' } }],
  }
}

async function renderPage(spec: PageSpec): Promise<UIForgePage> {
  const el = document.createElement('uiforge-page')
  el.spec = spec
  document.body.appendChild(el)
  await el.updateComplete
  return el
}

function root(el: UIForgePage): HTMLElement {
  return el.shadowRoot?.querySelector('[data-uiforge-page]') as HTMLElement
}

describe('theme modes and density', () => {
  beforeEach(() => registerCoreComponents())
  afterEach(() => {
    clearRegistry()
    document.body.innerHTML = ''
  })

  it('applies the default mode from theme.variant', async () => {
    const el = await renderPage(themedSpec())
    const page = root(el)
    expect(page.getAttribute('data-uiforge-mode')).toBe('dark')
    // dark has no overlay — base tokens apply
    expect(page.style.getPropertyValue('--uiforge-primary')).toBe('#0f766e')
  })

  it('switches modes at runtime via the mode property', async () => {
    const el = await renderPage(themedSpec())
    el.mode = 'light'
    await el.updateComplete

    const page = root(el)
    expect(page.getAttribute('data-uiforge-mode')).toBe('light')
    expect(page.style.getPropertyValue('--uiforge-primary')).toBe('#0d9488')
    expect(page.style.getPropertyValue('--uiforge-surface')).toBe('#ffffff')

    el.mode = 'dark'
    await el.updateComplete
    expect(root(el).style.getPropertyValue('--uiforge-primary')).toBe('#0f766e')
  })

  it('surfaces density as an attribute and scale factor', async () => {
    const el = await renderPage(themedSpec())
    const page = root(el)
    expect(page.getAttribute('data-uiforge-density')).toBe('compact')
    expect(page.style.getPropertyValue('--uiforge-density')).toBe('0.75')
  })

  it('resolves an arbitrary, document-specific density name', async () => {
    const spec = themedSpec()
    spec.theme = { ...spec.theme, density: 'spacious', densities: { spacious: 1.25 } }
    const el = await renderPage(spec)
    const page = root(el)
    expect(page.getAttribute('data-uiforge-density')).toBe('spacious')
    expect(page.style.getPropertyValue('--uiforge-density')).toBe('1.25')
  })

  it('leaves the density scale unset when density has no matching densities entry', async () => {
    const spec = themedSpec()
    spec.theme = { ...spec.theme, density: 'roomy', densities: { compact: 0.75 } }
    const el = await renderPage(spec)
    const page = root(el)
    expect(page.getAttribute('data-uiforge-density')).toBe('roomy')
    expect(page.style.getPropertyValue('--uiforge-density')).toBe('')
  })

  it('omits mode and density markers when the theme does not use them', async () => {
    const spec = themedSpec()
    spec.theme = { id: 'plain', tokens: { primary: '#000000' } }
    const el = await renderPage(spec)
    const page = root(el)
    expect(page.hasAttribute('data-uiforge-mode')).toBe(false)
    expect(page.hasAttribute('data-uiforge-density')).toBe(false)
    expect(page.style.getPropertyValue('--uiforge-density')).toBe('')
  })
})
