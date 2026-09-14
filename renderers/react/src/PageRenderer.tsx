import React from 'react'
import type { PageSpec, ComponentInstance, ThemeRef } from '@plexusone/uiforge-spec'
import { getComponent } from './registry.js'
import { Layout } from './layouts.js'
import { CAPABILITY_DATA_READ, resolveBinding, type DataResolution } from '@plexusone/uiforge-spec'
import { evaluateExpression, containsExpression } from '@plexusone/uiforge-spec'
import { PageState } from '@plexusone/uiforge-spec'
import { InteractionEngine } from '@plexusone/uiforge-spec'
import { DataSourceRegistry } from '@plexusone/uiforge-spec'
import type { DataSourceConnector } from '@plexusone/uiforge-spec'

export interface UIForgeContextValue {
  state: PageState
  engine: InteractionEngine
  dataSources: DataSourceRegistry
  onInteraction?: (componentId: string, event: string, data?: Record<string, unknown>) => void
  // dispatch routes a component event through the page's interaction rules
  // and re-renders. data returns the current DataResolution for each of the
  // instance's bindings, kicking off async connector fetches as needed.
  dispatch: (componentId: string, eventName: string, eventData?: Record<string, unknown>) => void
  data: (instance: ComponentInstance) => Record<string, DataResolution>
  // hasCapability reports whether the page's capability grant allows the
  // named capability. When the host supplies no grant set, everything is
  // allowed (trusted-native default).
  hasCapability: (name: string) => boolean
}

export const UIForgeContext = React.createContext<UIForgeContextValue | null>(null)

export function useUIForge(): UIForgeContextValue | null {
  return React.useContext(UIForgeContext)
}

export interface PageRendererProps {
  page: PageSpec
  className?: string
  style?: React.CSSProperties
  onError?: (componentId: string, error: Error) => void
  initialState?: Record<string, unknown>
  dataSources?: DataSourceConnector[]
  onInteraction?: (componentId: string, event: string, data?: Record<string, unknown>) => void
  // capabilities is the host's capability grant for this page. Absent means
  // unrestricted; present means the data runtime requires data.read and
  // state-writing controls require state.write.
  capabilities?: string[]
  // mode overrides the theme's default mode (ThemeRef.variant) at runtime.
  mode?: string
}

export function PageRenderer({
  page,
  className,
  style,
  onError,
  initialState,
  dataSources: dataSourceConnectors,
  onInteraction,
  capabilities,
  mode,
}: PageRendererProps): React.ReactElement {
  const [, forceRender] = React.useReducer((x: number) => x + 1, 0)
  const dataCache = React.useRef(new Map<string, DataResolution>())
  const cacheKeyRef = React.useRef<unknown[]>([])

  const [base] = React.useState(() => {
    const pageState = new PageState()
    if (page.context) {
      pageState.load({ context: page.context })
    }
    if (initialState) {
      const merged = { ...pageState.snapshot(), ...initialState }
      pageState.load(merged)
    }
    const engine = new InteractionEngine(pageState)
    const dsRegistry = new DataSourceRegistry()
    if (dataSourceConnectors) {
      for (const c of dataSourceConnectors) {
        dsRegistry.register(c)
      }
    }
    return { state: pageState, engine, dataSources: dsRegistry }
  })

  // Reset the binding cache when the page or connectors change identity.
  if (
    cacheKeyRef.current[0] !== page ||
    cacheKeyRef.current[1] !== dataSourceConnectors ||
    cacheKeyRef.current[2] !== capabilities
  ) {
    cacheKeyRef.current = [page, dataSourceConnectors, capabilities]
    dataCache.current.clear()
  }

  function hasCapability(name: string): boolean {
    return capabilities === undefined || capabilities.includes(name)
  }

  // invalidate drops cached connector results for a component so its
  // bindings re-fetch on the next render (the component.refresh action).
  function invalidateComponentData(componentId: string): void {
    for (const key of dataCache.current.keys()) {
      if (key.startsWith(componentId + ':')) {
        dataCache.current.delete(key)
      }
    }
  }

  base.engine.registerHandler('component.refresh', (action) => {
    invalidateComponentData(action.target)
  })

  function dispatch(
    componentId: string,
    eventName: string,
    eventData?: Record<string, unknown>,
  ): void {
    base.engine.dispatch(page.interactions ?? [], componentId, eventName, eventData)
    onInteraction?.(componentId, eventName, eventData)
    forceRender()
  }

  // resolveInstanceData mirrors the Lit renderer's tiered binding runtime:
  // static/state resolve synchronously; registered connectors resolve
  // asynchronously (loading → ready/error, cached per component+binding);
  // connector-less external sources fall back to the binding default.
  function resolveInstanceData(instance: ComponentInstance): Record<string, DataResolution> {
    const result: Record<string, DataResolution> = {}
    for (const [name, binding] of Object.entries(instance.data ?? {})) {
      if (binding.source === 'static' || binding.source === 'state') {
        result[name] = { status: 'ready', value: resolveBinding(binding, { state: base.state }) }
        continue
      }
      if (!base.dataSources.has(binding.source)) {
        result[name] = { status: 'ready', value: binding.default }
        continue
      }
      if (!hasCapability(CAPABILITY_DATA_READ)) {
        result[name] = {
          status: 'error',
          error: `capability "${CAPABILITY_DATA_READ}" not granted`,
        }
        continue
      }

      const key = `${instance.id}:${name}`
      const cached = dataCache.current.get(key)
      if (cached) {
        result[name] = cached
        continue
      }

      const loading: DataResolution = { status: 'loading' }
      dataCache.current.set(key, loading)
      result[name] = loading

      const exprCtx = { context: page.context ?? {}, state: base.state.snapshot() }
      base.dataSources
        .resolveBindings({ [name]: binding }, exprCtx)
        .then((resolved) => {
          dataCache.current.set(key, { status: 'ready', value: resolved[name] })
          forceRender()
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : String(err)
          dataCache.current.set(key, { status: 'error', error: message })
          forceRender()
        })
    }
    return result
  }

  const ctx: UIForgeContextValue = {
    ...base,
    onInteraction,
    dispatch,
    data: resolveInstanceData,
    hasCapability,
  }

  const effectiveMode = mode ?? page.theme?.variant
  const themeStyle = buildThemeStyle(page.theme, effectiveMode)
  const mergedStyle = { ...themeStyle, ...style }

  function renderComponent(instance: ComponentInstance): React.ReactNode {
    if (instance.visibility?.condition) {
      const cond = instance.visibility.condition
      if (cond === 'false') {
        return null
      }
      if (containsExpression(cond)) {
        const exprCtx = { state: ctx.state.snapshot(), context: page.context ?? {} }
        try {
          const result = evaluateExpression(cond, exprCtx)
          if (!result) return null
        } catch {
          return null
        }
      }
    }

    const Component = getComponent(instance.type)
    if (!Component) {
      return (
        <div
          key={instance.id}
          data-uiforge-missing={instance.type}
          style={{
            padding: '8px',
            border: '1px dashed #cbd5e1',
            borderRadius: '4px',
            color: '#94a3b8',
            fontSize: '0.8rem',
          }}
        >
          Unknown component: {instance.type}
        </div>
      )
    }

    const children = instance.children?.map(renderComponent)

    return (
      <ErrorBoundary key={instance.id} componentId={instance.id} onError={onError}>
        <Component instance={instance}>{children}</Component>
      </ErrorBoundary>
    )
  }

  return (
    <UIForgeContext.Provider value={ctx}>
      <div
        className={className}
        style={mergedStyle}
        data-uiforge-page={page.metadata.id}
        data-uiforge-profile={page.profile}
        data-uiforge-mode={effectiveMode}
        data-uiforge-density={page.theme?.density}
      >
        <Layout
          layout={page.layout}
          components={page.components}
          renderComponent={renderComponent}
          navigation={page.navigation}
          onNavigate={(item) => ctx.dispatch('navigation', 'select', item)}
        />
      </div>
    </UIForgeContext.Provider>
  )
}

function buildThemeStyle(theme?: ThemeRef, mode?: string): React.CSSProperties {
  if (!theme) return {}
  const style: Record<string, string> = {}
  const effective = { ...(theme.tokens ?? {}), ...(mode ? (theme.modes?.[mode] ?? {}) : {}) }
  for (const [key, value] of Object.entries(effective)) {
    style[`--uiforge-${key}`] = value
  }
  if (theme.density && theme.densities?.[theme.density] !== undefined) {
    style['--uiforge-density'] = String(theme.densities[theme.density])
  }
  return style
}

interface ErrorBoundaryProps {
  componentId: string
  onError?: (componentId: string, error: Error) => void
  children: React.ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(this.props.componentId, error)
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          data-uiforge-error={this.props.componentId}
          style={{
            padding: '8px',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            color: '#ef4444',
            fontSize: '0.8rem',
          }}
        >
          Error in {this.props.componentId}: {this.state.error.message}
        </div>
      )
    }
    return this.props.children
  }
}
