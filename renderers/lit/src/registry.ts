import type { TemplateResult } from 'lit'
import type { ComponentInstance } from '@plexusone/uiforge-spec'
import type { DataResolution } from '@plexusone/uiforge-spec'
import type { PageState } from '@plexusone/uiforge-spec'
import type { InteractionEngine } from '@plexusone/uiforge-spec'

// PageContext gives component factories access to the page runtime — the
// state store, the interaction engine, a dispatch function that routes a
// component event through the page's interaction rules, and a data resolver
// that returns the current DataResolution for each of the instance's
// bindings (kicking off async connector fetches as needed). It is the Lit
// counterpart of the React renderer's UIForgeContextValue.
export interface PageContext {
  state: PageState
  engine: InteractionEngine
  dispatch: (componentId: string, eventName: string, eventData?: Record<string, unknown>) => void
  data: (instance: ComponentInstance) => Record<string, DataResolution>
  // hasCapability reports whether the page's capability grant allows the
  // named capability. When the host supplies no grant set, everything is
  // allowed (trusted-native default).
  hasCapability: (name: string) => boolean
}

// A component factory renders one ComponentInstance into a lit template.
// Container components receive their already-rendered children and decide
// where to place them (the React renderer passes them as the children prop).
// Mirrors the React renderer's registry shape (registerComponent/getComponent/
// hasComponent/listComponents/clearRegistry) so the two renderers stay
// interchangeable at the registry level.
export type UIForgeComponentFactory = (
  instance: ComponentInstance,
  ctx?: PageContext,
  children?: TemplateResult[],
) => TemplateResult

const components = new Map<string, UIForgeComponentFactory>()

export function registerComponent(type: string, factory: UIForgeComponentFactory): void {
  components.set(type, factory)
}

export function getComponent(type: string): UIForgeComponentFactory | undefined {
  return components.get(type)
}

export function hasComponent(type: string): boolean {
  return components.has(type)
}

export function listComponents(): string[] {
  return Array.from(components.keys())
}

export function clearRegistry(): void {
  components.clear()
}
