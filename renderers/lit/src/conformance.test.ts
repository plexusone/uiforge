// Renderer conformance: every golden PageSpec fixture must render with the
// shared data-uiforge-* DOM vocabulary. The React renderer runs the same
// assertions in renderers/react/src/conformance.test.tsx — keep them aligned.
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { clearRegistry } from './registry.js'
import type { PageSpec } from '@plexusone/uiforge-spec'
import type { UIForgePage } from './uiforge-page.js'
import './uiforge-page.js'

// vitest runs with cwd at the package root (renderers/lit)
const FIXTURE_DIR = resolve(process.cwd(), '../../testdata/pagespecs')

const fixtures: Array<[string, PageSpec]> = readdirSync(FIXTURE_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(join(FIXTURE_DIR, f), 'utf8')) as PageSpec])

async function renderPage(spec: PageSpec): Promise<UIForgePage> {
  const el = document.createElement('uiforge-page')
  el.spec = spec
  document.body.appendChild(el)
  await el.updateComplete
  return el
}

afterEach(() => {
  clearRegistry()
  document.body.innerHTML = ''
})

describe('golden fixture conformance', () => {
  it.each(fixtures)('%s renders the shared DOM vocabulary', async (_name, spec) => {
    const el = await renderPage(spec)
    const shadow = el.shadowRoot!

    const root = shadow.querySelector(`[data-uiforge-page="${spec.metadata.id}"]`)
    expect(root).toBeTruthy()
    if (spec.profile) {
      expect(root?.getAttribute('data-uiforge-profile')).toBe(spec.profile)
    }

    const layout = root?.querySelector(`[data-uiforge-layout="${spec.layout.type}"]`)
    expect(layout).toBeTruthy()

    if (spec.layout.type === 'responsive-grid' || spec.layout.type === 'stack') {
      for (const comp of spec.components) {
        if (comp.visibility?.condition) continue
        const cell = layout?.querySelector(`[data-uiforge-cell="${comp.id}"]`)
        expect(cell, `component ${comp.id} should render a cell`).toBeTruthy()
        // No components are registered — every type must fall back to the
        // missing-component marker rather than disappearing or throwing.
        expect(cell?.querySelector(`[data-uiforge-missing="${comp.type}"]`)).toBeTruthy()
      }
    }

    for (const region of spec.layout.regions ?? []) {
      expect(
        layout?.querySelector(`[data-uiforge-region="${region.name}"]`),
        `region ${region.name} should render`,
      ).toBeTruthy()
    }

    if (spec.navigation) {
      const nav = layout?.querySelector(`[data-uiforge-nav="${spec.navigation.type}"]`)
      expect(nav, 'navigation should render').toBeTruthy()
      for (const item of spec.navigation.items) {
        expect(nav?.querySelector(`[data-uiforge-nav-item="${item.id}"]`)).toBeTruthy()
      }
    }

    if (spec.theme?.tokens) {
      const rootEl = root as HTMLElement
      for (const key of Object.keys(spec.theme.tokens)) {
        expect(rootEl.style.getPropertyValue(`--uiforge-${key}`)).toBe(spec.theme.tokens[key])
      }
    }

    if (spec.theme?.density) {
      const rootEl = root as HTMLElement
      expect(rootEl.getAttribute('data-uiforge-density')).toBe(spec.theme.density)
      const scale = spec.theme.densities?.[spec.theme.density]
      if (scale !== undefined) {
        expect(rootEl.style.getPropertyValue('--uiforge-density')).toBe(String(scale))
      }
    }
  })
})
