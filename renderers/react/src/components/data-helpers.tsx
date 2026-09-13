import React from 'react'
import type { DataResolution } from '@plexusone/uiforge-spec'
import type { UIForgeContextValue } from '../PageRenderer.js'
import type { ComponentInstance } from '@plexusone/uiforge-spec'

// resolveBoundData returns the page's current DataResolution for one of the
// instance's named bindings, or undefined when rendered without a page
// context.
export function resolveBoundData(
  instance: ComponentInstance,
  ctx: UIForgeContextValue | null,
  name: string,
): DataResolution | undefined {
  if (!ctx?.data) return undefined
  return ctx.data(instance)[name]
}

// DataStatus renders the shared loading/error DOM vocabulary for a binding
// that has not settled: data-uiforge-loading while a connector fetch is in
// flight, data-uiforge-data-error when it failed. Renders nothing when the
// binding is ready (or absent) — callers fall through to normal rendering.
export function DataStatus({
  res,
  name,
}: {
  res: DataResolution | undefined
  name: string
}): React.ReactElement | null {
  if (res?.status === 'loading') {
    return (
      <div
        data-uiforge-loading={name}
        style={{ color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }}
      >
        Loading…
      </div>
    )
  }
  if (res?.status === 'error') {
    return (
      <div
        data-uiforge-data-error={name}
        style={{ color: 'var(--uiforge-danger, #dc2626)', fontSize: '0.8rem' }}
      >
        Failed to load: {res.error ?? 'unknown error'}
      </div>
    )
  }
  return null
}

export function dataPending(res: DataResolution | undefined): boolean {
  return res?.status === 'loading' || res?.status === 'error'
}

export function propOf<T>(instance: ComponentInstance, key: string, fallback: T): T {
  const value = instance.properties?.[key]
  return value === undefined ? fallback : (value as T)
}

// writeBinding writes a control's new value back to page state when its
// binding points there, then dispatches the change through the page's
// interaction rules.
export function writeBinding(
  instance: ComponentInstance,
  ctx: UIForgeContextValue | null,
  name: string,
  value: unknown,
  eventName: string,
  eventData: Record<string, unknown>,
): void {
  const binding = instance.data?.[name]
  if (ctx && binding?.source === 'state') {
    const path = binding.parameters?.path
    if (typeof path === 'string') ctx.state.set(path, value)
  }
  ctx?.dispatch(instance.id, eventName, eventData)
}
