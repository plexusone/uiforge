import { describe, expect, it } from 'vitest'
import { AuthoringError, component, navItem, newPage, refresh, setState } from './authoring.js'
import { API_VERSION, KIND_PAGE } from './types.js'

// TS counterpart of authoring/authoring_test.go — keep behaviors aligned.

describe('authoring builders', () => {
  it('builds a dashboard page with bindings, theme, and interactions', () => {
    const page = newPage('sales', 'Sales Dashboard')
      .profile('dashboard')
      .context('customerId', 'cust-42')
      .grid(12, '16px')
      .theme('brand', { primary: '#0f766e', radius: '0.5rem' })
      .add(
        component('revenue', 'analytics.metric')
          .at(0, 0)
          .span(3, 1)
          .prop('title', 'Revenue')
          .bind('primary', 'sales-data', 'totalRevenue', {
            customerId: '${context.customerId}',
          })
          .default('primary', 0),
        component('note', 'core.text')
          .prop('content', 'Filtered')
          .visibleWhen('${state.filters.active}'),
      )
      .onEvent(
        'revenue',
        'click',
        setState('revenue', 'filters.month', '${event.label}'),
        refresh('revenue'),
      )
      .build()

    expect(page.apiVersion).toBe(API_VERSION)
    expect(page.kind).toBe(KIND_PAGE)
    expect(page.metadata.name).toBe('sales')
    expect(page.layout).toEqual({ type: 'responsive-grid', config: { columns: 12, gap: '16px' } })
    expect(page.components[0].position).toEqual({ row: 0, col: 0, colSpan: 3, rowSpan: 1 })
    expect(page.components[0].data?.primary).toEqual({
      source: 'sales-data',
      operation: 'totalRevenue',
      parameters: { customerId: '${context.customerId}' },
      default: 0,
    })
    expect(page.interactions?.[0].then).toHaveLength(2)
  })

  it('builds app shells with nested navigation and children', () => {
    const page = newPage('record', 'Record')
      .appShell('header', 'sidebar', 'main')
      .navigation(
        'sidebar',
        navItem('overview', 'Overview', '/overview'),
        navItem('records', 'Records', undefined, navItem('accounts', 'Accounts', '/accounts')),
      )
      .add(
        component('card', 'core.card')
          .prop('title', 'Acme')
          .child(component('detail', 'application.record-detail').bindStatic('record', { a: 1 })),
      )
      .build()

    expect(page.layout.regions?.map((r) => r.name)).toEqual(['header', 'sidebar', 'main'])
    expect(page.navigation?.items[1].children?.[0].id).toBe('accounts')
    expect(page.components[0].children).toHaveLength(1)
  })

  it('bindState and bindStatic produce the canonical binding shapes', () => {
    const page = newPage('p', 'P')
      .stack()
      .add(component('f', 'analytics.filter').bindState('value', 'filters.period', 'monthly'))
      .build()
    expect(page.components[0].data?.value).toEqual({
      source: 'state',
      operation: 'get',
      parameters: { path: 'filters.period' },
      default: 'monthly',
    })
  })

  it('reports every problem at build time', () => {
    const builder = newPage('', 'No ID').add(component('', '').default('missing', 1))
    let err: AuthoringError | undefined
    try {
      builder.build()
    } catch (e) {
      err = e as AuthoringError
    }
    expect(err).toBeInstanceOf(AuthoringError)
    expect(err!.problems.join('; ')).toContain('page id is required')
    expect(err!.problems.join('; ')).toContain('component id is required')
    expect(err!.problems.join('; ')).toContain('before any binding')
    expect(err!.problems.join('; ')).toContain('a layout is required')
  })

  it('build results are isolated from later mutations', () => {
    const b = newPage('p', 'P').stack()
    const first = b.build()
    b.add(component('late', 'core.text').prop('content', 'x'))
    expect(first.components).toHaveLength(0)
  })
})
