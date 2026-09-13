import React from 'react'
import { registerComponent, type ComponentProps } from '../registry.js'
import { useUIForge } from '../PageRenderer.js'
import { DataStatus, dataPending, propOf, resolveBoundData, writeBinding } from './data-helpers.js'

// Analytics component pack for the React renderer: metric, filter, table,
// line-chart, bar-chart, gauge. Emits the same DOM vocabulary as the Lit
// pack (renderers/lit/src/components/analytics.ts); visuals are
// dependency-free (inline SVG).

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--uiforge-border, #e2e8f0)',
  borderRadius: '8px',
  padding: 'calc(12px * var(--uiforge-density, 1))',
  fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
  background: 'var(--uiforge-surface, #ffffff)',
}

const titleStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'var(--uiforge-text-muted, #64748b)',
  marginBottom: '4px',
}

function EmptyState(): React.ReactElement {
  return (
    <div style={{ color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }}>No data</div>
  )
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

export function AnalyticsMetric({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'primary')
  const data = res?.value
  const raw =
    typeof data === 'object' && data !== null && 'value' in data
      ? (data as Record<string, unknown>).value
      : data
  return (
    <div style={cardStyle} data-uiforge-component={instance.id}>
      <div style={titleStyle}>{propOf(instance, 'title', '')}</div>
      {dataPending(res) ? (
        <DataStatus res={res} name="primary" />
      ) : raw === undefined ? (
        <EmptyState />
      ) : (
        <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>
          {formatValue(
            raw,
            propOf(instance, 'format', 'number'),
            propOf(instance, 'prefix', ''),
            propOf(instance, 'suffix', ''),
          )}
        </div>
      )}
    </div>
  )
}

export function AnalyticsFilter({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const options = propOf<unknown[]>(instance, 'options', [])
  const current = resolveBoundData(instance, ctx, 'value')?.value
  return (
    <label style={cardStyle} data-uiforge-component={instance.id}>
      <span style={titleStyle}>{propOf(instance, 'label', '')}</span>
      <select
        value={current === undefined ? '' : String(current)}
        onChange={(e) => {
          const value = e.target.value
          writeBinding(instance, ctx, 'value', value, 'change', { value })
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

export function AnalyticsTable({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'primary')
  const data = res?.value
  const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : []
  const declared = propOf<string[]>(instance, 'columns', [])
  const columns = declared.length > 0 ? declared : rows.length > 0 ? Object.keys(rows[0]) : []
  const cellStyle: React.CSSProperties = {
    padding: '4px 8px',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
  }
  return (
    <div style={cardStyle} data-uiforge-component={instance.id}>
      <div style={titleStyle}>{propOf(instance, 'title', '')}</div>
      {dataPending(res) ? (
        <DataStatus res={res} name="primary" />
      ) : rows.length === 0 ? (
        <EmptyState />
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
              <tr key={i}>
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

export function AnalyticsLineChart({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'primary')
  const points = extractSeries(
    res?.value,
    propOf(instance, 'xAxis', ''),
    propOf(instance, 'yAxis', ''),
  )
  const max = Math.max(...points.map((p) => p.value), 1)
  const step = points.length > 1 ? CHART_W / (points.length - 1) : 0
  const coords = points
    .map((p, i) => `${(i * step).toFixed(1)},${(CHART_H - (p.value / max) * CHART_H).toFixed(1)}`)
    .join(' ')
  return (
    <div style={cardStyle} data-uiforge-component={instance.id}>
      <div style={titleStyle}>{propOf(instance, 'title', '')}</div>
      {dataPending(res) ? (
        <DataStatus res={res} name="primary" />
      ) : points.length === 0 ? (
        <EmptyState />
      ) : (
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label="line chart"
        >
          <polyline
            points={coords}
            fill="none"
            stroke="var(--uiforge-accent, var(--uiforge-primary, #2563eb))"
            strokeWidth="2"
          />
        </svg>
      )}
    </div>
  )
}

export function AnalyticsBarChart({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'primary')
  const points = extractSeries(
    res?.value,
    propOf(instance, 'xAxis', ''),
    propOf(instance, 'yAxis', ''),
  )
  const max = points.length > 0 ? Math.max(...points.map((p) => p.value), 1) : 1
  const barW = points.length > 0 ? CHART_W / points.length : 0
  return (
    <div style={cardStyle} data-uiforge-component={instance.id}>
      <div style={titleStyle}>{propOf(instance, 'title', '')}</div>
      {dataPending(res) ? (
        <DataStatus res={res} name="primary" />
      ) : points.length === 0 ? (
        <EmptyState />
      ) : (
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label="bar chart"
        >
          {points.map((p, i) => {
            const h = (p.value / max) * CHART_H
            return (
              <rect
                key={p.label + i}
                x={(i * barW + 2).toFixed(1)}
                y={(CHART_H - h).toFixed(1)}
                width={Math.max(barW - 4, 1).toFixed(1)}
                height={h.toFixed(1)}
                fill="var(--uiforge-accent, var(--uiforge-primary, #2563eb))"
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  ctx?.dispatch(instance.id, 'click', { label: p.label, value: p.value })
                }
              >
                <title>
                  {p.label}: {p.value}
                </title>
              </rect>
            )
          })}
        </svg>
      )}
    </div>
  )
}

export function AnalyticsGauge({ instance }: ComponentProps): React.ReactElement {
  const ctx = useUIForge()
  const res = resolveBoundData(instance, ctx, 'primary')
  const data = res?.value
  const value = typeof data === 'number' ? data : undefined
  const min = propOf(instance, 'min', 0)
  const max = propOf(instance, 'max', 100)
  const unit = propOf(instance, 'unit', '')
  const ratio = value === undefined ? 0 : Math.min(Math.max((value - min) / (max - min || 1), 0), 1)
  return (
    <div style={cardStyle} data-uiforge-component={instance.id}>
      <div style={titleStyle}>{propOf(instance, 'title', '')}</div>
      {dataPending(res) ? (
        <DataStatus res={res} name="primary" />
      ) : value === undefined ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            {value}
            {unit}
          </div>
          <div
            style={{
              height: '6px',
              borderRadius: '3px',
              background: '#e2e8f0',
              overflow: 'hidden',
            }}
            role="meter"
            aria-valuenow={value}
            aria-valuemin={min}
            aria-valuemax={max}
          >
            <div
              style={{
                height: '100%',
                width: `${(ratio * 100).toFixed(1)}%`,
                background: 'var(--uiforge-accent, var(--uiforge-primary, #2563eb))',
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

// registerAnalyticsComponents registers the analytics.* component renderers.
export function registerAnalyticsComponents(): void {
  registerComponent('analytics.metric', AnalyticsMetric)
  registerComponent('analytics.filter', AnalyticsFilter)
  registerComponent('analytics.table', AnalyticsTable)
  registerComponent('analytics.line-chart', AnalyticsLineChart)
  registerComponent('analytics.bar-chart', AnalyticsBarChart)
  registerComponent('analytics.gauge', AnalyticsGauge)
}
