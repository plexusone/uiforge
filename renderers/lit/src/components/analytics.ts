import { html, type TemplateResult } from 'lit'
import { styleMap } from 'lit/directives/style-map.js'
import { registerComponent, type PageContext } from '../registry.js'
import { resolveData } from '@plexusone/uiforge-spec'
import { renderDataStatus, resolveBoundData } from './data-helpers.js'
import type { ComponentInstance } from '@plexusone/uiforge-spec'

// Analytics component pack for the Lit renderer: metric, filter, table,
// line-chart, bar-chart, gauge. Visuals are intentionally dependency-free
// (inline SVG); hosts wanting a charting library can register their own
// implementations over the same component types.

function prop<T>(instance: ComponentInstance, key: string, fallback: T): T {
  const value = instance.properties?.[key]
  return value === undefined ? fallback : (value as T)
}

function primaryData(instance: ComponentInstance, ctx?: PageContext): unknown {
  return resolveBoundData(instance, ctx, 'primary')?.value
}

// primaryStatus renders the loading/error state for the primary binding, or
// null when it is ready and normal rendering should proceed.
function primaryStatus(instance: ComponentInstance, ctx?: PageContext) {
  return renderDataStatus(resolveBoundData(instance, ctx, 'primary'), 'primary')
}

const cardStyle = {
  border: '1px solid var(--uiforge-border, #e2e8f0)',
  borderRadius: '8px',
  padding: '12px',
  fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  background: 'var(--uiforge-surface, #ffffff)',
}

const titleStyle = {
  fontSize: '0.8rem',
  fontWeight: '600',
  color: 'var(--uiforge-text-muted, #64748b)',
  marginBottom: '4px',
}

function emptyState(): TemplateResult {
  return html`<div style="color: var(--uiforge-text-muted, #94a3b8); font-size: 0.8rem">
    No data
  </div>`
}

function formatValue(value: unknown, format: string, prefix: string, suffix: string): string {
  if (typeof value !== 'number') return `${prefix}${String(value)}${suffix}`
  let formatted: string
  switch (format) {
    case 'currency':
      formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 })
      break
    case 'percent':
      formatted = `${(value * 100).toFixed(1)}%`
      break
    default:
      formatted = value.toLocaleString()
  }
  return `${prefix}${formatted}${suffix}`
}

export function renderMetric(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const status = primaryStatus(instance, ctx)
  const data = primaryData(instance, ctx)
  const raw =
    typeof data === 'object' && data !== null && 'value' in data
      ? (data as Record<string, unknown>).value
      : data
  const valueStyle = { fontSize: '1.6rem', fontWeight: '700' }
  return html`
    <div style=${styleMap(cardStyle)} data-uiforge-component=${instance.id}>
      <div style=${styleMap(titleStyle)}>${prop(instance, 'title', '')}</div>
      ${
        status ??
        (raw === undefined
          ? emptyState()
          : html`<div style=${styleMap(valueStyle)}>
              ${formatValue(raw, prop(instance, 'format', 'number'), prop(instance, 'prefix', ''), prop(instance, 'suffix', ''))}
            </div>`)
      }
    </div>
  `
}

export function renderFilter(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const options = prop<unknown[]>(instance, 'options', [])
  const valueBinding = instance.data?.['value']
  const current = ctx ? resolveData(instance, { state: ctx.state })['value'] : undefined

  const onChange = (e: Event) => {
    const value = (e.target as HTMLSelectElement).value
    if (ctx && valueBinding?.source === 'state') {
      const path = valueBinding.parameters?.path
      if (typeof path === 'string') ctx.state.set(path, value)
    }
    ctx?.dispatch(instance.id, 'change', { value })
  }

  return html`
    <label style=${styleMap(cardStyle)} data-uiforge-component=${instance.id}>
      <span style=${styleMap(titleStyle)}>${prop(instance, 'label', '')}</span>
      <select @change=${onChange}>
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

export function renderTable(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const status = primaryStatus(instance, ctx)
  const data = primaryData(instance, ctx)
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  const declared = prop<string[]>(instance, 'columns', [])
  const columns = declared.length > 0 ? declared : rows.length > 0 ? Object.keys(rows[0]) : []
  const cellStyle = 'padding: 4px 8px; border-bottom: 1px solid #e2e8f0; text-align: left'
  return html`
    <div style=${styleMap(cardStyle)} data-uiforge-component=${instance.id}>
      <div style=${styleMap(titleStyle)}>${prop(instance, 'title', '')}</div>
      ${
        status ??
        (rows.length === 0
          ? emptyState()
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
                      <tr>
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

interface Point {
  label: string
  value: number
}

function extractSeries(data: unknown, xField: string, yField: string): Point[] {
  if (!Array.isArray(data)) return []
  const points: Point[] = []
  for (const row of data) {
    if (typeof row !== 'object' || row === null) continue
    const r = row as Record<string, unknown>
    const keys = Object.keys(r)
    const lx = xField && xField in r ? xField : keys.find((k) => typeof r[k] === 'string')
    const ly = yField && yField in r ? yField : keys.find((k) => typeof r[k] === 'number')
    if (ly === undefined) continue
    const value = Number(r[ly])
    if (Number.isNaN(value)) continue
    points.push({ label: lx !== undefined ? String(r[lx]) : '', value })
  }
  return points
}

const CHART_W = 300
const CHART_H = 120

export function renderLineChart(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const status = primaryStatus(instance, ctx)
  const points = extractSeries(
    primaryData(instance, ctx),
    prop(instance, 'xAxis', ''),
    prop(instance, 'yAxis', ''),
  )
  return html`
    <div style=${styleMap(cardStyle)} data-uiforge-component=${instance.id}>
      <div style=${styleMap(titleStyle)}>${prop(instance, 'title', '')}</div>
      ${status ?? (points.length === 0 ? emptyState() : lineSvg(points))}
    </div>
  `
}

function lineSvg(points: Point[]): TemplateResult {
  const max = Math.max(...points.map((p) => p.value), 1)
  const step = points.length > 1 ? CHART_W / (points.length - 1) : 0
  const coords = points
    .map((p, i) => `${(i * step).toFixed(1)},${(CHART_H - (p.value / max) * CHART_H).toFixed(1)}`)
    .join(' ')
  return html`
    <svg
      viewBox="0 0 ${CHART_W} ${CHART_H}"
      style="width: 100%; height: auto"
      role="img"
      aria-label="line chart"
    >
      <polyline
        points=${coords}
        fill="none"
        stroke="var(--uiforge-accent, var(--uiforge-primary, #2563eb))"
        stroke-width="2"
      />
    </svg>
  `
}

export function renderBarChart(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const status = primaryStatus(instance, ctx)
  const points = extractSeries(
    primaryData(instance, ctx),
    prop(instance, 'xAxis', ''),
    prop(instance, 'yAxis', ''),
  )
  const onClick = (p: Point) => () =>
    ctx?.dispatch(instance.id, 'click', { label: p.label, value: p.value })
  const max = points.length > 0 ? Math.max(...points.map((p) => p.value), 1) : 1
  const barW = points.length > 0 ? CHART_W / points.length : 0
  return html`
    <div style=${styleMap(cardStyle)} data-uiforge-component=${instance.id}>
      <div style=${styleMap(titleStyle)}>${prop(instance, 'title', '')}</div>
      ${
        status ??
        (points.length === 0
          ? emptyState()
          : html`
              <svg
                viewBox="0 0 ${CHART_W} ${CHART_H}"
                style="width: 100%; height: auto"
                role="img"
                aria-label="bar chart"
              >
                ${points.map((p, i) => {
                  const h = (p.value / max) * CHART_H
                  return html`<rect
                    x=${(i * barW + 2).toFixed(1)}
                    y=${(CHART_H - h).toFixed(1)}
                    width=${Math.max(barW - 4, 1).toFixed(1)}
                    height=${h.toFixed(1)}
                    fill="var(--uiforge-accent, var(--uiforge-primary, #2563eb))"
                    style="cursor: pointer"
                    @click=${onClick(p)}
                  >
                    <title>${p.label}: ${p.value}</title>
                  </rect>`
                })}
              </svg>
            `)
      }
    </div>
  `
}

export function renderGauge(instance: ComponentInstance, ctx?: PageContext): TemplateResult {
  const status = primaryStatus(instance, ctx)
  const data = primaryData(instance, ctx)
  const value = typeof data === 'number' ? data : undefined
  const min = prop(instance, 'min', 0)
  const max = prop(instance, 'max', 100)
  const unit = prop(instance, 'unit', '')
  const ratio = value === undefined ? 0 : Math.min(Math.max((value - min) / (max - min || 1), 0), 1)
  return html`
    <div style=${styleMap(cardStyle)} data-uiforge-component=${instance.id}>
      <div style=${styleMap(titleStyle)}>${prop(instance, 'title', '')}</div>
      ${
        status ??
        (value === undefined
          ? emptyState()
          : html`
              <div style="font-size: 1.4rem; font-weight: 700">${value}${unit}</div>
              <div
                style="height: 6px; border-radius: 3px; background: #e2e8f0; overflow: hidden"
                role="meter"
                aria-valuenow=${value}
                aria-valuemin=${min}
                aria-valuemax=${max}
              >
                <div
                  style=${styleMap({
                    height: '100%',
                    width: `${(ratio * 100).toFixed(1)}%`,
                    background: 'var(--uiforge-accent, var(--uiforge-primary, #2563eb))',
                  })}
                ></div>
              </div>
            `)
      }
    </div>
  `
}

// registerAnalyticsComponents registers the analytics.* component renderers.
export function registerAnalyticsComponents(): void {
  registerComponent('analytics.metric', renderMetric)
  registerComponent('analytics.filter', renderFilter)
  registerComponent('analytics.table', renderTable)
  registerComponent('analytics.line-chart', renderLineChart)
  registerComponent('analytics.bar-chart', renderBarChart)
  registerComponent('analytics.gauge', renderGauge)
}
