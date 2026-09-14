export const API_VERSION = 'ui.plexusone.dev/v1'
export const KIND_PAGE = 'Page'

// Well-known capability names (mirror of the Go uispec constants). The data
// runtime refuses connector fetches without CAPABILITY_DATA_READ when a
// grant set is in force; state-writing controls check CAPABILITY_STATE_WRITE.
export const CAPABILITY_DATA_READ = 'data.read'
export const CAPABILITY_STATE_WRITE = 'state.write'

export interface PageSpec {
  apiVersion: string
  kind: string
  metadata: PageMetadata
  profile?: string
  context?: Record<string, string>
  layout: LayoutSpec
  components: ComponentInstance[]
  interactions?: Interaction[]
  navigation?: NavigationSpec
  theme?: ThemeRef
}

export interface PageMetadata {
  id: string
  name: string
  title: string
  description?: string
  version?: string
  labels?: Record<string, string>
}

export type LayoutType = 'responsive-grid' | 'stack' | 'split-pane' | 'tabs' | 'application-shell'

export interface LayoutSpec {
  type: LayoutType
  config?: LayoutConfig
  regions?: LayoutRegion[]
}

export interface LayoutConfig {
  columns?: number
  rows?: number
  gap?: string
  direction?: 'horizontal' | 'vertical'
  breakpoints?: Record<string, BreakpointConfig>
  sizes?: string[]
  resizable?: boolean
}

export interface BreakpointConfig {
  columns: number
  gap?: string
}

export interface LayoutRegion {
  name: string
  layout?: LayoutSpec
}

export interface ComponentInstance {
  id: string
  type: string
  version?: string
  position?: Position
  properties?: Record<string, unknown>
  data?: Record<string, Binding>
  children?: ComponentInstance[]
  visibility?: VisibilityRule
  slot?: string
  style?: Record<string, string>
  rawConfig?: unknown
}

export interface Position {
  row?: number
  col?: number
  rowSpan?: number
  colSpan?: number
  order?: number
  region?: string
}

export interface Binding {
  source: string
  operation: string
  parameters?: Record<string, unknown>
  transform?: string
  default?: unknown
}

export interface VisibilityRule {
  condition?: string
  roles?: string[]
  capability?: string
}

export interface Interaction {
  when: InteractionTrigger
  then: InteractionAction[]
}

export interface InteractionTrigger {
  component: string
  event: string
}

export interface InteractionAction {
  target: string
  action: string
  params?: Record<string, unknown>
}

export interface NavigationSpec {
  type?: string
  items: NavItem[]
  breadcrumb?: NavItem[]
}

export interface NavItem {
  id: string
  label: string
  icon?: string
  target?: string
  children?: NavItem[]
  badge?: string
}

export interface ThemeRef {
  id: string
  variant?: string
  tokens?: Record<string, string>
  // Per-mode token overlays (e.g. light, dark) applied over tokens at render
  // time; variant names the default mode and renderers can switch at runtime.
  modes?: Record<string, Record<string, string>>
  // Selected density ID — must be a key in `densities` when set (e.g.
  // 'comfortable', 'compact', or a document-specific name). Renderers
  // surface it as data-uiforge-density.
  density?: string
  // Every declared density's spacing scale, keyed by ID — resolved from a
  // design system's foundations. Renderers look up densities[density] for
  // the --uiforge-density CSS custom property, falling back to 1 when
  // absent.
  densities?: Record<string, number>
}
