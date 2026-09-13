import { html, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { registerComponent, type PageContext } from '../registry.js'
import type { ComponentInstance } from '@plexusone/uiforge-spec'

function stringProp(instance: ComponentInstance, key: string): string {
  const value = instance.properties?.[key]
  return typeof value === 'string' ? value : ''
}

export function renderCoreText(instance: ComponentInstance): TemplateResult {
  const content = stringProp(instance, 'content')
  const variant = stringProp(instance, 'variant') || 'body'
  switch (variant) {
    case 'heading':
      return html`<h2 data-uiforge-component=${instance.id}>${content}</h2>`
    case 'caption':
      return html`<small data-uiforge-component=${instance.id}>${content}</small>`
    default:
      return html`<p data-uiforge-component=${instance.id}>${content}</p>`
  }
}

export function renderCoreImage(instance: ComponentInstance): TemplateResult {
  const src = stringProp(instance, 'src')
  const alt = stringProp(instance, 'alt')
  return html`<img data-uiforge-component=${instance.id} src=${src} alt=${alt} />`
}

const buttonVariants: Record<string, Record<string, string>> = {
  primary: { background: 'var(--uiforge-primary, #2563eb)', color: '#ffffff', border: 'none' },
  secondary: {
    background: 'transparent',
    color: 'var(--uiforge-text, #0f172a)',
    border: '1px solid var(--uiforge-border, #cbd5e1)',
  },
  ghost: { background: 'transparent', color: 'var(--uiforge-text, #0f172a)', border: 'none' },
  danger: { background: 'var(--uiforge-danger, #dc2626)', color: '#ffffff', border: 'none' },
}

export function renderCoreButton(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const variant = String(instance.properties?.variant ?? 'primary')
  const disabled = instance.properties?.disabled === true
  const style = {
    ...(buttonVariants[variant] ?? buttonVariants.primary),
    padding: '8px 16px',
    borderRadius: 'var(--uiforge-radius, 0.375rem)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  }
  return html`
    <button
      data-uiforge-component=${instance.id}
      style=${styleMap(style)}
      ?disabled=${disabled}
      @click=${() => ctx?.dispatch(instance.id, 'click', {})}
    >
      ${String(instance.properties?.label ?? '')}
    </button>
  `
}

export function renderCoreCard(
  instance: ComponentInstance,
  _ctx?: PageContext,
  children?: TemplateResult[],
): TemplateResult {
  const title = instance.properties?.title
  const subtitle = instance.properties?.subtitle
  const style = {
    border: '1px solid var(--uiforge-border, #e2e8f0)',
    borderRadius: 'var(--uiforge-radius, 0.5rem)',
    background: 'var(--uiforge-surface, #ffffff)',
    padding: String(instance.properties?.padding ?? '16px'),
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  }
  return html`
    <div data-uiforge-component=${instance.id} style=${styleMap(style)}>
      ${title ? html`<h3 style="margin: 0 0 4px; font-size: 1rem">${String(title)}</h3>` : ''}
      ${
        subtitle
          ? html`<p
              style="margin: 0 0 12px; color: var(--uiforge-text-muted, #64748b); font-size: 0.85rem"
            >
              ${String(subtitle)}
            </p>`
          : ''
      }
      ${children ?? []}
    </div>
  `
}

// registerCoreComponents registers the built-in core.* component renderers.
export function registerCoreComponents(): void {
  registerComponent('core.text', renderCoreText)
  registerComponent('core.image', renderCoreImage)
  registerComponent('core.button', renderCoreButton)
  registerComponent('core.card', renderCoreCard)
}
