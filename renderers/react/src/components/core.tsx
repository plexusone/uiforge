import React from 'react'
import { registerComponent, type ComponentProps } from '../registry.js'
import { useUIForge } from '../PageRenderer.js'
import { propOf } from './data-helpers.js'

// Core component pack for the React renderer: text, image, button, card.
// Emits the same DOM vocabulary as the Lit pack (renderers/lit/src/
// components/core.ts) so the cross-renderer contract holds.

export function CoreText({ instance }: ComponentProps): React.ReactElement {
  const content = propOf(instance, 'content', '')
  const variant = propOf<string>(instance, 'variant', 'body')
  switch (variant) {
    case 'heading':
      return <h2 data-uiforge-component={instance.id}>{content}</h2>
    case 'caption':
      return <small data-uiforge-component={instance.id}>{content}</small>
    default:
      return <p data-uiforge-component={instance.id}>{content}</p>
  }
}

export function CoreImage({ instance }: ComponentProps): React.ReactElement {
  return (
    <img
      data-uiforge-component={instance.id}
      src={propOf(instance, 'src', '')}
      alt={propOf(instance, 'alt', '')}
    />
  )
}

const buttonVariants: Record<string, React.CSSProperties> = {
  primary: { background: 'var(--uiforge-primary, #2563eb)', color: '#ffffff', border: 'none' },
  secondary: {
    background: 'transparent',
    color: 'var(--uiforge-text, #0f172a)',
    border: '1px solid var(--uiforge-border, #cbd5e1)',
  },
  ghost: { background: 'transparent', color: 'var(--uiforge-text, #0f172a)', border: 'none' },
  danger: { background: 'var(--uiforge-danger, #dc2626)', color: '#ffffff', border: 'none' },
}

export function CoreButton({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const variant = String(instance.properties?.variant ?? 'primary')
  const disabled = instance.properties?.disabled === true
  const style: React.CSSProperties = {
    ...(buttonVariants[variant] ?? buttonVariants.primary),
    padding: '8px 16px',
    borderRadius: 'var(--uiforge-radius, 0.375rem)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  }
  return (
    <button
      data-uiforge-component={instance.id}
      style={style}
      disabled={disabled}
      onClick={() => ctx?.dispatch(instance.id, 'click', {})}
    >
      {String(instance.properties?.label ?? '')}
    </button>
  )
}

export function CoreCard({ instance, children }: ComponentProps): React.ReactElement {
  const title = instance.properties?.title
  const subtitle = instance.properties?.subtitle
  const style: React.CSSProperties = {
    border: '1px solid var(--uiforge-border, #e2e8f0)',
    borderRadius: 'var(--uiforge-radius, 0.5rem)',
    background: 'var(--uiforge-surface, #ffffff)',
    padding: String(instance.properties?.padding ?? '16px'),
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  }
  return (
    <div data-uiforge-component={instance.id} style={style}>
      {title ? <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{String(title)}</h3> : null}
      {subtitle ? (
        <p
          style={{
            margin: '0 0 12px',
            color: 'var(--uiforge-text-muted, #64748b)',
            fontSize: '0.85rem',
          }}
        >
          {String(subtitle)}
        </p>
      ) : null}
      {children}
    </div>
  )
}

// registerCoreComponents registers the built-in core.* component renderers.
export function registerCoreComponents(): void {
  registerComponent('core.text', CoreText)
  registerComponent('core.image', CoreImage)
  registerComponent('core.button', CoreButton)
  registerComponent('core.card', CoreCard)
}
