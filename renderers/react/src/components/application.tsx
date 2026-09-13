import React from 'react'
import { registerComponent, type ComponentProps } from '../registry.js'
import { useUIForge } from '../PageRenderer.js'
import { DataStatus, dataPending, propOf, resolveBoundData, writeBinding } from './data-helpers.js'

// Application component pack for the React renderer: input, select,
// checkbox, form, record-detail, record-list, action-bar, badge. Emits the
// same DOM vocabulary as the Lit pack (renderers/lit/src/components/
// application.ts).

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--uiforge-text-muted, #64748b)',
}

const controlStyle: React.CSSProperties = {
  padding: 'calc(6px * var(--uiforge-density, 1)) calc(10px * var(--uiforge-density, 1))',
  border: '1px solid var(--uiforge-border, #cbd5e1)',
  borderRadius: 'var(--uiforge-radius, 0.375rem)',
  background: 'var(--uiforge-surface, #ffffff)',
  color: 'var(--uiforge-text, #0f172a)',
  font: 'inherit',
}

export function ApplicationInput({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const value = resolveBoundData(instance, ctx, 'value')?.value
  return (
    <label data-uiforge-component={instance.id} style={fieldStyle}>
      <span style={labelStyle}>{propOf(instance, 'label', '')}</span>
      <input
        style={controlStyle}
        type={propOf(instance, 'type', 'text')}
        placeholder={propOf(instance, 'placeholder', '')}
        value={value === undefined ? '' : String(value)}
        disabled={propOf(instance, 'disabled', false)}
        required={propOf(instance, 'required', false)}
        onChange={(e) => {
          const v = e.target.value
          writeBinding(instance, ctx, 'value', v, 'change', { value: v })
        }}
      />
    </label>
  )
}

export function ApplicationSelect({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const options = propOf<unknown[]>(instance, 'options', [])
  const current = resolveBoundData(instance, ctx, 'value')?.value
  return (
    <label data-uiforge-component={instance.id} style={fieldStyle}>
      <span style={labelStyle}>{propOf(instance, 'label', '')}</span>
      <select
        style={controlStyle}
        disabled={propOf(instance, 'disabled', false)}
        value={current === undefined ? '' : String(current)}
        onChange={(e) => {
          const v = e.target.value
          writeBinding(instance, ctx, 'value', v, 'change', { value: v })
        }}
      >
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    </label>
  )
}

export function ApplicationCheckbox({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const checked = resolveBoundData(instance, ctx, 'value')?.value === true
  return (
    <label
      data-uiforge-component={instance.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={propOf(instance, 'disabled', false)}
        onChange={(e) => {
          const c = e.target.checked
          writeBinding(instance, ctx, 'value', c, 'change', { checked: c })
        }}
      />
      <span>{propOf(instance, 'label', '')}</span>
    </label>
  )
}

export function ApplicationForm({ instance, children }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const title = propOf(instance, 'title', '')
  return (
    <form
      data-uiforge-component={instance.id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'calc(12px * var(--uiforge-density, 1))',
        padding: 'calc(16px * var(--uiforge-density, 1))',
        border: '1px solid var(--uiforge-border, #e2e8f0)',
        borderRadius: 'var(--uiforge-radius, 0.5rem)',
        background: 'var(--uiforge-surface, #ffffff)',
        fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
      }}
      onSubmit={(e) => {
        e.preventDefault()
        ctx?.dispatch(instance.id, 'submit', {})
      }}
    >
      {title ? <h3 style={{ margin: 0, fontSize: '1rem' }}>{title}</h3> : null}
      {children}
      <button
        type="submit"
        style={{
          alignSelf: 'flex-start',
          padding: '8px 16px',
          border: 'none',
          borderRadius: 'var(--uiforge-radius, 0.375rem)',
          background: 'var(--uiforge-primary, #2563eb)',
          color: '#ffffff',
          cursor: 'pointer',
        }}
      >
        {propOf(instance, 'submitLabel', 'Submit')}
      </button>
    </form>
  )
}

interface FieldDef {
  label: string
  field: string
}

export function ApplicationRecordDetail({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'record')
  const record = res?.value
  const rec =
    typeof record === 'object' && record !== null ? (record as Record<string, unknown>) : undefined
  const declared = propOf<FieldDef[]>(instance, 'fields', [])
  const fields: FieldDef[] =
    declared.length > 0
      ? declared
      : rec
        ? Object.keys(rec).map((k) => ({ label: k, field: k }))
        : []
  const title = propOf(instance, 'title', '')
  return (
    <div
      data-uiforge-component={instance.id}
      style={{ fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)' }}
    >
      {title ? <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{title}</h4> : null}
      {dataPending(res) ? (
        <DataStatus res={res} name="record" />
      ) : rec === undefined ? (
        <div style={{ color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }}>
          No record
        </div>
      ) : (
        <dl
          style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', margin: 0 }}
        >
          {fields.map((f) => (
            <React.Fragment key={f.field}>
              <dt style={labelStyle}>{f.label}</dt>
              <dd style={{ margin: 0 }} data-uiforge-field={f.field}>
                {String(rec[f.field] ?? '')}
              </dd>
            </React.Fragment>
          ))}
        </dl>
      )}
    </div>
  )
}

export function ApplicationRecordList({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'records')
  const data = res?.value
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  const declared = propOf<string[]>(instance, 'columns', [])
  const columns = declared.length > 0 ? declared : rows.length > 0 ? Object.keys(rows[0]) : []
  const selectable = propOf(instance, 'selectable', false)
  const title = propOf(instance, 'title', '')
  const cellStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderBottom: '1px solid var(--uiforge-border, #e2e8f0)',
    textAlign: 'left',
  }
  return (
    <div
      data-uiforge-component={instance.id}
      style={{ fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)' }}
    >
      {title ? <h4 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>{title}</h4> : null}
      {dataPending(res) ? (
        <DataStatus res={res} name="records" />
      ) : rows.length === 0 ? (
        <div style={{ color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }}>
          No records
        </div>
      ) : (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} style={cellStyle}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={selectable ? { cursor: 'pointer' } : undefined}
                onClick={() =>
                  selectable && ctx?.dispatch(instance.id, 'select', { id: String(row.id ?? '') })
                }
              >
                {columns.map((c) => (
                  <td key={c} style={cellStyle}>
                    {String(row[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

interface ActionDef {
  id: string
  label: string
  variant?: string
}

export function ApplicationActionBar({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const actions = propOf<ActionDef[]>(instance, 'actions', [])
  const alignment = propOf<string>(instance, 'alignment', 'start')
  return (
    <div
      data-uiforge-component={instance.id}
      role="toolbar"
      style={{
        display: 'flex',
        gap: '8px',
        justifyContent:
          alignment === 'end' ? 'flex-end' : alignment === 'center' ? 'center' : 'flex-start',
        fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
      }}
    >
      {actions.map((a) => {
        const danger = a.variant === 'danger'
        const primary = a.variant === 'primary'
        return (
          <button
            key={a.id}
            data-uiforge-action={a.id}
            style={{
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
            }}
            onClick={() => ctx?.dispatch(instance.id, 'action', { action: a.id })}
          >
            {a.label}
          </button>
        )
      })}
    </div>
  )
}

const badgeTones: Record<string, string> = {
  neutral: 'var(--uiforge-neutral, #64748b)',
  info: 'var(--uiforge-info, #0284c7)',
  success: 'var(--uiforge-success, #16a34a)',
  warning: 'var(--uiforge-warning, #d97706)',
  danger: 'var(--uiforge-danger, #dc2626)',
}

export function ApplicationBadge({ instance }: ComponentProps): React.ReactElement {
  const tone = propOf(instance, 'tone', 'neutral')
  return (
    <span
      data-uiforge-component={instance.id}
      data-uiforge-tone={tone}
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#ffffff',
        background: badgeTones[tone] ?? badgeTones.neutral,
        fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
      }}
    >
      {propOf(instance, 'label', '')}
    </span>
  )
}

// registerApplicationComponents registers the application.* component
// renderers.
export function registerApplicationComponents(): void {
  registerComponent('application.input', ApplicationInput)
  registerComponent('application.select', ApplicationSelect)
  registerComponent('application.checkbox', ApplicationCheckbox)
  registerComponent('application.form', ApplicationForm)
  registerComponent('application.record-detail', ApplicationRecordDetail)
  registerComponent('application.record-list', ApplicationRecordList)
  registerComponent('application.action-bar', ApplicationActionBar)
  registerComponent('application.badge', ApplicationBadge)
}
