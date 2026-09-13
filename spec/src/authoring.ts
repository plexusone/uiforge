// Fluent builders for constructing PageSpecs programmatically — the
// TypeScript counterpart of the Go authoring package (same method names,
// same semantics). Builders produce plain PageSpec values; validate against
// the Go registry (or the generated JSON Schemas) before shipping.
import {
  API_VERSION,
  KIND_PAGE,
  type Binding,
  type ComponentInstance,
  type Interaction,
  type InteractionAction,
  type LayoutSpec,
  type NavItem,
  type PageSpec,
} from './types.js'

export class AuthoringError extends Error {
  constructor(public readonly problems: string[]) {
    super(`authoring: ${problems.length} problem(s): ${problems.join('; ')}`)
    this.name = 'AuthoringError'
  }
}

export function newPage(id: string, title: string): PageBuilder {
  return new PageBuilder(id, title)
}

export class PageBuilder {
  private page: PageSpec
  private errs: string[] = []

  constructor(id: string, title: string) {
    this.page = {
      apiVersion: API_VERSION,
      kind: KIND_PAGE,
      metadata: { id, name: id, title },
      layout: { type: 'stack' },
      components: [],
    }
    this.pageLayoutSet = false
    if (!id) this.errs.push('page id is required')
  }

  private pageLayoutSet: boolean

  profile(profile: string): this {
    this.page.profile = profile
    return this
  }

  description(d: string): this {
    this.page.metadata.description = d
    return this
  }

  context(key: string, value: string): this {
    this.page.context = { ...(this.page.context ?? {}), [key]: value }
    return this
  }

  grid(columns: number, gap: string): this {
    this.page.layout = { type: 'responsive-grid', config: { columns, gap } }
    this.pageLayoutSet = true
    return this
  }

  stack(direction: 'vertical' | 'horizontal' = 'vertical'): this {
    this.page.layout = { type: 'stack', config: { direction } }
    this.pageLayoutSet = true
    return this
  }

  appShell(...regions: string[]): this {
    this.page.layout = {
      type: 'application-shell',
      regions: regions.map((name) => ({ name })),
    }
    this.pageLayoutSet = true
    return this
  }

  layout(layout: LayoutSpec): this {
    this.page.layout = layout
    this.pageLayoutSet = true
    return this
  }

  theme(id: string, tokens: Record<string, string>): this {
    this.page.theme = { id, tokens }
    return this
  }

  navigation(navType: string, ...items: NavItem[]): this {
    this.page.navigation = { type: navType, items }
    return this
  }

  add(...components: ComponentBuilder[]): this {
    for (const c of components) {
      this.page.components.push(c.instance)
      this.errs.push(...c.errs)
    }
    return this
  }

  onEvent(componentId: string, event: string, ...actions: InteractionAction[]): this {
    const interaction: Interaction = {
      when: { component: componentId, event },
      then: actions,
    }
    this.page.interactions = [...(this.page.interactions ?? []), interaction]
    return this
  }

  build(): PageSpec {
    const errs = [...this.errs]
    if (!this.pageLayoutSet) {
      errs.push('a layout is required (grid, stack, appShell, or layout)')
    }
    if (errs.length > 0) {
      throw new AuthoringError(errs)
    }
    return structuredClone(this.page)
  }
}

export function navItem(
  id: string,
  label: string,
  target?: string,
  ...children: NavItem[]
): NavItem {
  const item: NavItem = { id, label }
  if (target) item.target = target
  if (children.length > 0) item.children = children
  return item
}

export function component(id: string, componentType: string): ComponentBuilder {
  return new ComponentBuilder(id, componentType)
}

export class ComponentBuilder {
  readonly instance: ComponentInstance
  readonly errs: string[] = []

  constructor(id: string, componentType: string) {
    this.instance = { id, type: componentType }
    if (!id) this.errs.push('component id is required')
    if (!componentType) this.errs.push(`component "${id}": type is required`)
  }

  version(v: string): this {
    this.instance.version = v
    return this
  }

  at(row: number, col: number): this {
    this.instance.position = { ...(this.instance.position ?? {}), row, col }
    return this
  }

  span(colSpan: number, rowSpan: number): this {
    this.instance.position = { ...(this.instance.position ?? {}), colSpan, rowSpan }
    return this
  }

  prop(key: string, value: unknown): this {
    this.instance.properties = { ...(this.instance.properties ?? {}), [key]: value }
    return this
  }

  bind(
    input: string,
    source: string,
    operation: string,
    parameters?: Record<string, unknown>,
  ): this {
    const binding: Binding = { source, operation }
    if (parameters) binding.parameters = parameters
    return this.setBinding(input, binding)
  }

  bindState(input: string, path: string, defaultValue?: unknown): this {
    return this.setBinding(input, {
      source: 'state',
      operation: 'get',
      parameters: { path },
      default: defaultValue,
    })
  }

  bindStatic(input: string, value: unknown): this {
    return this.setBinding(input, {
      source: 'static',
      operation: 'value',
      parameters: { value },
    })
  }

  default(input: string, value: unknown): this {
    const binding = this.instance.data?.[input]
    if (!binding) {
      this.errs.push(
        `component "${this.instance.id}": default("${input}") before any binding for that input`,
      )
      return this
    }
    binding.default = value
    return this
  }

  private setBinding(input: string, binding: Binding): this {
    this.instance.data = { ...(this.instance.data ?? {}), [input]: binding }
    return this
  }

  visibleWhen(condition: string): this {
    this.instance.visibility = { condition }
    return this
  }

  child(...children: ComponentBuilder[]): this {
    for (const c of children) {
      this.instance.children = [...(this.instance.children ?? []), c.instance]
      this.errs.push(...c.errs)
    }
    return this
  }
}

// Interaction action constructors (mirror of the Go helpers).
export function setState(target: string, path: string, value: unknown): InteractionAction {
  return { target, action: 'state.set', params: { path, value } }
}

export function toggleState(target: string, path: string): InteractionAction {
  return { target, action: 'state.toggle', params: { path } }
}

export function refresh(target: string): InteractionAction {
  return { target, action: 'component.refresh' }
}
