import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { registerComponent } from '../registry.js';
import { useUIForge } from '../PageRenderer.js';
import { DataStatus, dataPending, propOf, resolveBoundData, writeBinding } from './data-helpers.js';
// Analytics component pack for the React renderer: metric, filter, table,
// line-chart, bar-chart, gauge. Emits the same DOM vocabulary as the Lit
// pack (renderers/lit/src/components/analytics.ts); visuals are
// dependency-free (inline SVG).
const cardStyle = {
    border: '1px solid var(--uiforge-border, #e2e8f0)',
    borderRadius: '8px',
    padding: '12px',
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
    background: 'var(--uiforge-surface, #ffffff)',
};
const titleStyle = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--uiforge-text-muted, #64748b)',
    marginBottom: '4px',
};
function EmptyState() {
    return (_jsx("div", { style: { color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }, children: "No data" }));
}
function formatValue(value, format, prefix, suffix) {
    if (typeof value !== 'number')
        return `${prefix}${String(value)}${suffix}`;
    let formatted;
    switch (format) {
        case 'currency':
            formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
            break;
        case 'percent':
            formatted = `${(value * 100).toFixed(1)}%`;
            break;
        default:
            formatted = value.toLocaleString();
    }
    return `${prefix}${formatted}${suffix}`;
}
export function AnalyticsMetric({ instance }) {
    const ctx = useUIForge();
    const res = resolveBoundData(instance, ctx, 'primary');
    const data = res?.value;
    const raw = typeof data === 'object' && data !== null && 'value' in data
        ? data.value
        : data;
    return (_jsxs("div", { style: cardStyle, "data-uiforge-component": instance.id, children: [_jsx("div", { style: titleStyle, children: propOf(instance, 'title', '') }), dataPending(res) ? (_jsx(DataStatus, { res: res, name: "primary" })) : raw === undefined ? (_jsx(EmptyState, {})) : (_jsx("div", { style: { fontSize: '1.6rem', fontWeight: 700 }, children: formatValue(raw, propOf(instance, 'format', 'number'), propOf(instance, 'prefix', ''), propOf(instance, 'suffix', '')) }))] }));
}
export function AnalyticsFilter({ instance }) {
    const ctx = useUIForge();
    const options = propOf(instance, 'options', []);
    const current = resolveBoundData(instance, ctx, 'value')?.value;
    return (_jsxs("label", { style: cardStyle, "data-uiforge-component": instance.id, children: [_jsx("span", { style: titleStyle, children: propOf(instance, 'label', '') }), _jsx("select", { value: current === undefined ? '' : String(current), onChange: (e) => {
                    const value = e.target.value;
                    writeBinding(instance, ctx, 'value', value, 'change', { value });
                }, children: options.map((opt) => (_jsx("option", { value: String(opt), children: String(opt) }, String(opt)))) })] }));
}
export function AnalyticsTable({ instance }) {
    const ctx = useUIForge();
    const res = resolveBoundData(instance, ctx, 'primary');
    const data = res?.value;
    const rows = Array.isArray(data) ? data : [];
    const declared = propOf(instance, 'columns', []);
    const columns = declared.length > 0 ? declared : rows.length > 0 ? Object.keys(rows[0]) : [];
    const cellStyle = {
        padding: '4px 8px',
        borderBottom: '1px solid #e2e8f0',
        textAlign: 'left',
    };
    return (_jsxs("div", { style: cardStyle, "data-uiforge-component": instance.id, children: [_jsx("div", { style: titleStyle, children: propOf(instance, 'title', '') }), dataPending(res) ? (_jsx(DataStatus, { res: res, name: "primary" })) : rows.length === 0 ? (_jsx(EmptyState, {})) : (_jsxs("table", { style: { borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }, children: [_jsx("thead", { children: _jsx("tr", { children: columns.map((c) => (_jsx("th", { style: cellStyle, children: c }, c))) }) }), _jsx("tbody", { children: rows.map((row, i) => (_jsx("tr", { children: columns.map((c) => (_jsx("td", { style: cellStyle, children: String(row[c] ?? '') }, c))) }, i))) })] }))] }));
}
function extractSeries(data, xField, yField) {
    if (!Array.isArray(data))
        return [];
    const points = [];
    for (const row of data) {
        if (typeof row !== 'object' || row === null)
            continue;
        const r = row;
        const keys = Object.keys(r);
        const lx = xField && xField in r ? xField : keys.find((k) => typeof r[k] === 'string');
        const ly = yField && yField in r ? yField : keys.find((k) => typeof r[k] === 'number');
        if (ly === undefined)
            continue;
        const value = Number(r[ly]);
        if (Number.isNaN(value))
            continue;
        points.push({ label: lx !== undefined ? String(r[lx]) : '', value });
    }
    return points;
}
const CHART_W = 300;
const CHART_H = 120;
export function AnalyticsLineChart({ instance }) {
    const ctx = useUIForge();
    const res = resolveBoundData(instance, ctx, 'primary');
    const points = extractSeries(res?.value, propOf(instance, 'xAxis', ''), propOf(instance, 'yAxis', ''));
    const max = Math.max(...points.map((p) => p.value), 1);
    const step = points.length > 1 ? CHART_W / (points.length - 1) : 0;
    const coords = points
        .map((p, i) => `${(i * step).toFixed(1)},${(CHART_H - (p.value / max) * CHART_H).toFixed(1)}`)
        .join(' ');
    return (_jsxs("div", { style: cardStyle, "data-uiforge-component": instance.id, children: [_jsx("div", { style: titleStyle, children: propOf(instance, 'title', '') }), dataPending(res) ? (_jsx(DataStatus, { res: res, name: "primary" })) : points.length === 0 ? (_jsx(EmptyState, {})) : (_jsx("svg", { viewBox: `0 0 ${CHART_W} ${CHART_H}`, style: { width: '100%', height: 'auto' }, role: "img", "aria-label": "line chart", children: _jsx("polyline", { points: coords, fill: "none", stroke: "var(--uiforge-accent, var(--uiforge-primary, #2563eb))", strokeWidth: "2" }) }))] }));
}
export function AnalyticsBarChart({ instance }) {
    const ctx = useUIForge();
    const res = resolveBoundData(instance, ctx, 'primary');
    const points = extractSeries(res?.value, propOf(instance, 'xAxis', ''), propOf(instance, 'yAxis', ''));
    const max = points.length > 0 ? Math.max(...points.map((p) => p.value), 1) : 1;
    const barW = points.length > 0 ? CHART_W / points.length : 0;
    return (_jsxs("div", { style: cardStyle, "data-uiforge-component": instance.id, children: [_jsx("div", { style: titleStyle, children: propOf(instance, 'title', '') }), dataPending(res) ? (_jsx(DataStatus, { res: res, name: "primary" })) : points.length === 0 ? (_jsx(EmptyState, {})) : (_jsx("svg", { viewBox: `0 0 ${CHART_W} ${CHART_H}`, style: { width: '100%', height: 'auto' }, role: "img", "aria-label": "bar chart", children: points.map((p, i) => {
                    const h = (p.value / max) * CHART_H;
                    return (_jsx("rect", { x: (i * barW + 2).toFixed(1), y: (CHART_H - h).toFixed(1), width: Math.max(barW - 4, 1).toFixed(1), height: h.toFixed(1), fill: "var(--uiforge-accent, var(--uiforge-primary, #2563eb))", style: { cursor: 'pointer' }, onClick: () => ctx?.dispatch(instance.id, 'click', { label: p.label, value: p.value }), children: _jsxs("title", { children: [p.label, ": ", p.value] }) }, p.label + i));
                }) }))] }));
}
export function AnalyticsGauge({ instance }) {
    const ctx = useUIForge();
    const res = resolveBoundData(instance, ctx, 'primary');
    const data = res?.value;
    const value = typeof data === 'number' ? data : undefined;
    const min = propOf(instance, 'min', 0);
    const max = propOf(instance, 'max', 100);
    const unit = propOf(instance, 'unit', '');
    const ratio = value === undefined ? 0 : Math.min(Math.max((value - min) / (max - min || 1), 0), 1);
    return (_jsxs("div", { style: cardStyle, "data-uiforge-component": instance.id, children: [_jsx("div", { style: titleStyle, children: propOf(instance, 'title', '') }), dataPending(res) ? (_jsx(DataStatus, { res: res, name: "primary" })) : value === undefined ? (_jsx(EmptyState, {})) : (_jsxs(_Fragment, { children: [_jsxs("div", { style: { fontSize: '1.4rem', fontWeight: 700 }, children: [value, unit] }), _jsx("div", { style: {
                            height: '6px',
                            borderRadius: '3px',
                            background: '#e2e8f0',
                            overflow: 'hidden',
                        }, role: "meter", "aria-valuenow": value, "aria-valuemin": min, "aria-valuemax": max, children: _jsx("div", { style: {
                                height: '100%',
                                width: `${(ratio * 100).toFixed(1)}%`,
                                background: 'var(--uiforge-accent, var(--uiforge-primary, #2563eb))',
                            } }) })] }))] }));
}
// registerAnalyticsComponents registers the analytics.* component renderers.
export function registerAnalyticsComponents() {
    registerComponent('analytics.metric', AnalyticsMetric);
    registerComponent('analytics.filter', AnalyticsFilter);
    registerComponent('analytics.table', AnalyticsTable);
    registerComponent('analytics.line-chart', AnalyticsLineChart);
    registerComponent('analytics.bar-chart', AnalyticsBarChart);
    registerComponent('analytics.gauge', AnalyticsGauge);
}
//# sourceMappingURL=analytics.js.map