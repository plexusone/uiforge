import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PageRenderer } from './PageRenderer.js'
import { clearRegistry } from './registry.js'
import { registerCoreComponents } from './components/core.js'
import { API_VERSION, KIND_PAGE, type PageSpec } from '@plexusone/uiforge-spec'

// React counterpart of renderers/lit/src/modes.test.ts — keep aligned.

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
      tokens: { primary: '#0f766e', surface: '#111111' },
      modes: {
        light: { primary: '#0d9488', surface: '#ffffff' },
      },
    },
    components: [{ id: 't', type: 'core.text', properties: { content: 'hello' } }],
  }
}

function root(container: HTMLElement): HTMLElement {
  return container.querySelector('[data-uiforge-page]') as HTMLElement
}

describe('theme modes and density', () => {
  beforeEach(() => registerCoreComponents())
  afterEach(() => {
    clearRegistry()
    cleanup()
  })

  it('applies the default mode from theme.variant', () => {
    const { container } = render(<PageRenderer page={themedSpec()} />)
    const page = root(container)
    expect(page.getAttribute('data-uiforge-mode')).toBe('dark')
    expect(page.style.getPropertyValue('--uiforge-primary')).toBe('#0f766e')
  })

  it('switches modes via the mode prop', () => {
    const { container, rerender } = render(<PageRenderer page={themedSpec()} mode="light" />)
    const page = root(container)
    expect(page.getAttribute('data-uiforge-mode')).toBe('light')
    expect(page.style.getPropertyValue('--uiforge-primary')).toBe('#0d9488')
    expect(page.style.getPropertyValue('--uiforge-surface')).toBe('#ffffff')

    rerender(<PageRenderer page={themedSpec()} mode="dark" />)
    expect(root(container).style.getPropertyValue('--uiforge-primary')).toBe('#0f766e')
  })

  it('surfaces density as an attribute and scale factor', () => {
    const { container } = render(<PageRenderer page={themedSpec()} />)
    const page = root(container)
    expect(page.getAttribute('data-uiforge-density')).toBe('compact')
    expect(page.style.getPropertyValue('--uiforge-density')).toBe('0.75')
  })

  it('omits mode and density markers when the theme does not use them', () => {
    const spec = themedSpec()
    spec.theme = { id: 'plain', tokens: { primary: '#000000' } }
    const { container } = render(<PageRenderer page={spec} />)
    const page = root(container)
    expect(page.hasAttribute('data-uiforge-mode')).toBe(false)
    expect(page.hasAttribute('data-uiforge-density')).toBe(false)
    expect(page.style.getPropertyValue('--uiforge-density')).toBe('')
  })
})
