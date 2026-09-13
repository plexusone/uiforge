import { beforeEach, describe, expect, it } from 'vitest'
import { html } from 'lit'
import {
  clearRegistry,
  getComponent,
  hasComponent,
  listComponents,
  registerComponent,
} from './registry.js'

describe('registry', () => {
  beforeEach(() => {
    clearRegistry()
  })

  it('registers and resolves component factories', () => {
    const factory = () => html`<span>hi</span>`
    registerComponent('core.text', factory)

    expect(hasComponent('core.text')).toBe(true)
    expect(getComponent('core.text')).toBe(factory)
    expect(listComponents()).toEqual(['core.text'])
  })

  it('returns undefined for unregistered types', () => {
    expect(hasComponent('core.unknown')).toBe(false)
    expect(getComponent('core.unknown')).toBeUndefined()
  })

  it('clears all registrations', () => {
    registerComponent('core.text', () => html`<span></span>`)
    clearRegistry()
    expect(listComponents()).toEqual([])
  })
})
