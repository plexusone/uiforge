import { html, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { registerComponent, type PageContext } from '../registry.js'
import { renderDataStatus, resolveBoundData, writeBinding } from './data-helpers.js'
import type { ComponentInstance } from '@plexusone/uiforge-spec'

// Application component pack for the Lit renderer: input, select, checkbox,
// form, record-detail, record-list, action-bar, badge — the form/record/
// action primitives of the application and portal profiles. Styled entirely
// through UIForge's semantic tokens; dependency-free.

function prop<T>(instance: ComponentInstance, key: string, fallback: T): T {
  const value = instance.properties?.[key]
  return value === undefined ? fallback : (value as T)
}

function boundValue(
  instance: ComponentInstance,
  ctx: PageContext | undefined,
  name: string,
): unknown {
  return resolveBoundData(instance, ctx, name)?.value
}

const fieldStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
}

const labelStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: 'var(--uiforge-text-muted, #64748b)',
}

const controlStyle = {
  padding: 'calc(6px * var(--uiforge-density, 1)) calc(10px * var(--uiforge-density, 1))',
  border: '1px solid var(--uiforge-border, #cbd5e1)',
  borderRadius: 'var(--uiforge-radius, 0.375rem)',
  background: 'var(--uiforge-surface, #ffffff)',
  color: 'var(--uiforge-text, #0f172a)',
  font: 'inherit',
}

export function renderInput(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const value = boundValue(instance, ctx, 'value')
  const disabled = prop(instance, 'disabled', false)
  return html`
    <label data-uiforge-component=${instance.id} style=${styleMap(fieldStyle)}>
      <span style=${styleMap(labelStyle)}>${prop(instance, 'label', '')}</span>
      <input
        style=${styleMap(controlStyle)}
        type=${prop(instance, 'type', 'text')}
        placeholder=${prop(instance, 'placeholder', '')}
        .value=${value === undefined ? '' : String(value)}
        ?disabled=${disabled}
        ?required=${prop(instance, 'required', false)}
        @change=${(e: Event) => {
          const v = (e.target as HTMLInputElement).value
          writeBinding(instance, ctx, 'value', v, 'change', { value: v })
        }}
      />
    </label>
  `
}

export function renderSelect(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const options = prop<unknown[]>(instance, 'options', [])
  const current = boundValue(instance, ctx, 'value')
  return html`
    <label data-uiforge-component=${instance.id} style=${styleMap(fieldStyle)}>
      <span style=${styleMap(labelStyle)}>${prop(instance, 'label', '')}</span>
      <select
        style=${styleMap(controlStyle)}
        ?disabled=${prop(instance, 'disabled', false)}
        @change=${(e: Event) => {
          const v = (e.target as HTMLSelectElement).value
          writeBinding(instance, ctx, 'value', v, 'change', { value: v })
        }}
      >
        ${options.map(
          (opt) =>
            html`<option value=${String(opt)} ?selected=${String(opt) === String(current)}>
              ${String(opt)}
            </option>`,
        )}
      </select>
    </label>
  `
}

export function renderCheckbox(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const checked = boundValue(instance, ctx, 'value') === true
  return html`
    <label
      data-uiforge-component=${instance.id}
      style="display: flex; align-items: center; gap: 8px; font-family: var(--uiforge-font-family, system-ui, sans-serif)"
    >
      <input
        type="checkbox"
        .checked=${checked}
        ?disabled=${prop(instance, 'disabled', false)}
        @change=${(e: Event) => {
          const c = (e.target as HTMLInputElement).checked
          writeBinding(instance, ctx, 'value', c, 'change', { checked: c })
        }}
      />
      <span>${prop(instance, 'label', '')}</span>
    </label>
  `
}

export function renderForm(
  instance: ComponentInstance,
  ctx?: PageContext,
  children?: TemplateResult[],
): TemplateResult {
  const style = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'calc(12px * var(--uiforge-density, 1))',
    padding: 'calc(16px * var(--uiforge-density, 1))',
    border: '1px solid var(--uiforge-border, #e2e8f0)',
    borderRadius: 'var(--uiforge-radius, 0.5rem)',
    background: 'var(--uiforge-surface, #ffffff)',
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  }
  const title = prop(instance, 'title', '')
  return html`
    <form
      data-uiforge-component=${instance.id}
      style=${styleMap(style)}
      @submit=${(e: Event) => {
        e.preventDefault()
        ctx?.dispatch(instance.id, 'submit', {})
      }}
    >
      ${title ? html`<h3 style="margin: 0; font-size: 1rem">${title}</h3>` : ''} ${children ?? []}
      <button
        type="submit"
        style="align-self: flex-start; padding: 8px 16px; border: none; border-radius: var(--uiforge-radius, 0.375rem); background: var(--uiforge-primary, #2563eb); color: #ffffff; cursor: pointer"
      >
        ${prop(instance, 'submitLabel', 'Submit')}
      </button>
    </form>
  `
}

interface FieldDef {
  label: string
  field: string
}

export function renderRecordDetail(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const status = renderDataStatus(resolveBoundData(instance, ctx, 'record'), 'record')
  const record = boundValue(instance, ctx, 'record')
  const rec =
    typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : undefined
  const declared = prop<FieldDef[]>(instance, 'fields', [])
  const fields: FieldDef[] =
    declared.length > 0
      ? declared
      : rec
        ? Object.keys(rec).map((k) => ({ label: k, field: k }))
        : []
  const title = prop(instance, 'title', '')
  return html`
    <div
      data-uiforge-component=${instance.id}
      style="font-family: var(--uiforge-font-family, system-ui, sans-serif)"
    >
      ${title ? html`<h4 style="margin: 0 0 8px; font-size: 0.9rem">${title}</h4>` : ''}
      ${
        status ??
        (rec === undefined
          ? html`<div style="color: var(--uiforge-text-muted, #94a3b8); font-size: 0.8rem">
              No record
            </div>`
          : html`
              <dl style="display: grid; grid-template-columns: auto 1fr; gap: 4px 16px; margin: 0">
                ${fields.map(
                  (f) => html`
                    <dt style=${styleMap(labelStyle)}>${f.label}</dt>
                    <dd style="margin: 0" data-uiforge-field=${f.field}>
                      ${String(rec[f.field] ?? '')}
                    </dd>
                  `,
                )}
              </dl>
            `)
      }
    </div>
  `
}

export function renderRecordList(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const status = renderDataStatus(resolveBoundData(instance, ctx, 'records'), 'records')
  const data = boundValue(instance, ctx, 'records')
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  const declared = prop<string[]>(instance, 'columns', [])
  const columns = declared.length > 0 ? declared : rows.length > 0 ? Object.keys(rows[0]) : []
  const selectable = prop(instance, 'selectable', false)
  const title = prop(instance, 'title', '')
  const cellStyle =
    'padding: 4px 8px; border-bottom: 1px solid var(--uiforge-border, #e2e8f0); text-align: left'
  return html`
    <div
      data-uiforge-component=${instance.id}
      style="font-family: var(--uiforge-font-family, system-ui, sans-serif)"
    >
      ${title ? html`<h4 style="margin: 0 0 8px; font-size: 0.9rem">${title}</h4>` : ''}
      ${
        status ??
        (rows.length === 0
          ? html`<div style="color: var(--uiforge-text-muted, #94a3b8); font-size: 0.8rem">
              No records
            </div>`
          : html`
              <table style="border-collapse: collapse; width: 100%; font-size: 0.85rem">
                <thead>
                  <tr>
                    ${columns.map((c) => html`<th style=${cellStyle}>${c}</th>`)}
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(
                    (row) => html`
                      <tr
                        style=${selectable ? 'cursor: pointer' : ''}
                        @click=${() =>
                          selectable &&
                          ctx?.dispatch(instance.id, 'select', { id: String(row.id ?? '') })}
                      >
                        ${columns.map((c) => html`<td style=${cellStyle}>${String(row[c] ?? '')}</td>`)}
                      </tr>
                    `,
                  )}
                </tbody>
              </table>
            `)
      }
    </div>
  `
}

interface ActionDef {
  id: string
  label: string
  variant?: string
}

export function renderActionBar(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const actions = prop<ActionDef[]>(instance, 'actions', [])
  const alignment = prop<string>(instance, 'alignment', 'start')
  const style = {
    display: 'flex',
    gap: '8px',
    justifyContent:
      alignment === 'end' ? 'flex-end' : alignment === 'center' ? 'center' : 'flex-start',
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  }
  return html`
    <div data-uiforge-component=${instance.id} role="toolbar" style=${styleMap(style)}>
      ${actions.map((a) => {
        const danger = a.variant === 'danger'
        const primary = a.variant === 'primary'
        const btnStyle = {
          padding: '8px 16px',
          borderRadius: 'var(--uiforge-radius, 0.375rem)',
          cursor: 'pointer',
          border: primary || danger ? 'none' : '1px solid var(--uiforge-border, #cbd5e1)',
          background: primary
            ? 'var(--uiforge-primary, #2563eb)'
            : danger
              ? 'var(--uiforge-danger, #dc2626)'
              : 'transparent',
          color: primary || danger ? '#ffffff' : 'var(--uiforge-text, #0f172a)',
        }
        return html`
          <button
            data-uiforge-action=${a.id}
            style=${styleMap(btnStyle)}
            @click=${() => ctx?.dispatch(instance.id, 'action', { action: a.id })}
          >
            ${a.label}
          </button>
        `
      })}
    </div>
  `
}

const badgeTones: Record<string, string> = {
  neutral: 'var(--uiforge-neutral, #64748b)',
  info: 'var(--uiforge-info, #0284c7)',
  success: 'var(--uiforge-success, #16a34a)',
  warning: 'var(--uiforge-warning, #d97706)',
  danger: 'var(--uiforge-danger, #dc2626)',
}

export function renderBadge(instance: ComponentInstance): TemplateResult {
  const tone = prop(instance, 'tone', 'neutral')
  const style = {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#ffffff',
    background: badgeTones[tone] ?? badgeTones.neutral,
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  }
  return html`
    <span data-uiforge-component=${instance.id} data-uiforge-tone=${tone} style=${styleMap(style)}>
      ${prop(instance, 'label', '')}
    </span>
  `
}

// registerApplicationComponents registers the application.* component
// renderers.
export function registerApplicationComponents(): void {
  registerComponent('application.input', renderInput)
  registerComponent('application.select', renderSelect)
  registerComponent('application.checkbox', renderCheckbox)
  registerComponent('application.form', renderForm)
  registerComponent('application.record-detail', renderRecordDetail)
  registerComponent('application.record-list', renderRecordList)
  registerComponent('application.action-bar', renderActionBar)
  registerComponent('application.badge', renderBadge)
}
