import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { registerComponent } from '../registry.js';
import { useUIForge } from '../PageRenderer.js';
import { DataStatus, dataPending, propOf, resolveBoundData, writeBinding } from './data-helpers.js';
// Application component pack for the React renderer: input, select,
// checkbox, form, record-detail, record-list, action-bar, badge. Emits the
// same DOM vocabulary as the Lit pack (renderers/lit/src/components/
// application.ts).
const fieldStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
};
const labelStyle = {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--uiforge-text-muted, #64748b)',
};
const controlStyle = {
    padding: 'calc(6px * var(--uiforge-density, 1)) calc(10px * var(--uiforge-density, 1))',
    border: '1px solid var(--uiforge-border, #cbd5e1)',
    borderRadius: 'var(--uiforge-radius, 0.375rem)',
    background: 'var(--uiforge-surface, #ffffff)',
    color: 'var(--uiforge-text, #0f172a)',
    font: 'inherit',
};
export function ApplicationInput({ instance }) {
    const ctx = useUIForge();
    const value = resolveBoundData(instance, ctx, 'value')?.value;
    return (_jsxs("label", { "data-uiforge-component": instance.id, style: fieldStyle, children: [_jsx("span", { style: labelStyle, children: propOf(instance, 'label', '') }), _jsx("input", { style: controlStyle, type: propOf(instance, 'type', 'text'), placeholder: propOf(instance, 'placeholder', ''), value: value === undefined ? '' : String(value), disabled: propOf(instance, 'disabled', false), required: propOf(instance, 'required', false), onChange: (e) => {
                    const v = e.target.value;
                    writeBinding(instance, ctx, 'value', v, 'change', { value: v });
                } })] }));
}
export function ApplicationSelect({ instance }) {
    const ctx = useUIForge();
    const options = propOf(instance, 'options', []);
    const current = resolveBoundData(instance, ctx, 'value')?.value;
    return (_jsxs("label", { "data-uiforge-component": instance.id, style: fieldStyle, children: [_jsx("span", { style: labelStyle, children: propOf(instance, 'label', '') }), _jsx("select", { style: controlStyle, disabled: propOf(instance, 'disabled', false), value: current === undefined ? '' : String(current), onChange: (e) => {
                    const v = e.target.value;
                    writeBinding(instance, ctx, 'value', v, 'change', { value: v });
                }, children: options.map((opt) => (_jsx("option", { value: String(opt), children: String(opt) }, String(opt)))) })] }));
}
export function ApplicationCheckbox({ instance }) {
    const ctx = useUIForge();
    const checked = resolveBoundData(instance, ctx, 'value')?.value === true;
    return (_jsxs("label", { "data-uiforge-component": instance.id, style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
        }, children: [_jsx("input", { type: "checkbox", checked: checked, disabled: propOf(instance, 'disabled', false), onChange: (e) => {
                    const c = e.target.checked;
                    writeBinding(instance, ctx, 'value', c, 'change', { checked: c });
                } }), _jsx("span", { children: propOf(instance, 'label', '') })] }));
}
export function ApplicationForm({ instance, children }) {
    const ctx = useUIForge();
    const title = propOf(instance, 'title', '');
    return (_jsxs("form", { "data-uiforge-component": instance.id, style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(12px * var(--uiforge-density, 1))',
            padding: 'calc(16px * var(--uiforge-density, 1))',
            border: '1px solid var(--uiforge-border, #e2e8f0)',
            borderRadius: 'var(--uiforge-radius, 0.5rem)',
            background: 'var(--uiforge-surface, #ffffff)',
            fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
        }, onSubmit: (e) => {
            e.preventDefault();
            ctx?.dispatch(instance.id, 'submit', {});
        }, children: [title ? _jsx("h3", { style: { margin: 0, fontSize: '1rem' }, children: title }) : null, children, _jsx("button", { type: "submit", style: {
                    alignSelf: 'flex-start',
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: 'var(--uiforge-radius, 0.375rem)',
                    background: 'var(--uiforge-primary, #2563eb)',
                    color: '#ffffff',
                    cursor: 'pointer',
                }, children: propOf(instance, 'submitLabel', 'Submit') })] }));
}
export function ApplicationRecordDetail({ instance }) {
    const ctx = useUIForge();
    const res = resolveBoundData(instance, ctx, 'record');
    const record = res?.value;
    const rec = typeof record === 'object' && record !== null ? record : undefined;
    const declared = propOf(instance, 'fields', []);
    const fields = declared.length > 0
        ? declared
        : rec
            ? Object.keys(rec).map((k) => ({ label: k, field: k }))
            : [];
    const title = propOf(instance, 'title', '');
    return (_jsxs("div", { "data-uiforge-component": instance.id, style: { fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)' }, children: [title ? _jsx("h4", { style: { margin: '0 0 8px', fontSize: '0.9rem' }, children: title }) : null, dataPending(res) ? (_jsx(DataStatus, { res: res, name: "record" })) : rec === undefined ? (_jsx("div", { style: { color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }, children: "No record" })) : (_jsx("dl", { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 16px', margin: 0 }, children: fields.map((f) => (_jsxs(React.Fragment, { children: [_jsx("dt", { style: labelStyle, children: f.label }), _jsx("dd", { style: { margin: 0 }, "data-uiforge-field": f.field, children: String(rec[f.field] ?? '') })] }, f.field))) }))] }));
}
export function ApplicationRecordList({ instance }) {
    const ctx = useUIForge();
    const res = resolveBoundData(instance, ctx, 'records');
    const data = res?.value;
    const rows = Array.isArray(data) ? data : [];
    const declared = propOf(instance, 'columns', []);
    const columns = declared.length > 0 ? declared : rows.length > 0 ? Object.keys(rows[0]) : [];
    const selectable = propOf(instance, 'selectable', false);
    const title = propOf(instance, 'title', '');
    const cellStyle = {
        padding: '4px 8px',
        borderBottom: '1px solid var(--uiforge-border, #e2e8f0)',
        textAlign: 'left',
    };
    return (_jsxs("div", { "data-uiforge-component": instance.id, style: { fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)' }, children: [title ? _jsx("h4", { style: { margin: '0 0 8px', fontSize: '0.9rem' }, children: title }) : null, dataPending(res) ? (_jsx(DataStatus, { res: res, name: "records" })) : rows.length === 0 ? (_jsx("div", { style: { color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }, children: "No records" })) : (_jsxs("table", { style: { borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }, children: [_jsx("thead", { children: _jsx("tr", { children: columns.map((c) => (_jsx("th", { style: cellStyle, children: c }, c))) }) }), _jsx("tbody", { children: rows.map((row, i) => (_jsx("tr", { style: selectable ? { cursor: 'pointer' } : undefined, onClick: () => selectable && ctx?.dispatch(instance.id, 'select', { id: String(row.id ?? '') }), children: columns.map((c) => (_jsx("td", { style: cellStyle, children: String(row[c] ?? '') }, c))) }, i))) })] }))] }));
}
export function ApplicationActionBar({ instance }) {
    const ctx = useUIForge();
    const actions = propOf(instance, 'actions', []);
    const alignment = propOf(instance, 'alignment', 'start');
    return (_jsx("div", { "data-uiforge-component": instance.id, role: "toolbar", style: {
            display: 'flex',
            gap: '8px',
            justifyContent: alignment === 'end' ? 'flex-end' : alignment === 'center' ? 'center' : 'flex-start',
            fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
        }, children: actions.map((a) => {
            const danger = a.variant === 'danger';
            const primary = a.variant === 'primary';
            return (_jsx("button", { "data-uiforge-action": a.id, style: {
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
                }, onClick: () => ctx?.dispatch(instance.id, 'action', { action: a.id }), children: a.label }, a.id));
        }) }));
}
const badgeTones = {
    neutral: 'var(--uiforge-neutral, #64748b)',
    info: 'var(--uiforge-info, #0284c7)',
    success: 'var(--uiforge-success, #16a34a)',
    warning: 'var(--uiforge-warning, #d97706)',
    danger: 'var(--uiforge-danger, #dc2626)',
};
export function ApplicationBadge({ instance }) {
    const tone = propOf(instance, 'tone', 'neutral');
    return (_jsx("span", { "data-uiforge-component": instance.id, "data-uiforge-tone": tone, style: {
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#ffffff',
            background: badgeTones[tone] ?? badgeTones.neutral,
            fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
        }, children: propOf(instance, 'label', '') }));
}
// registerApplicationComponents registers the application.* component
// renderers.
export function registerApplicationComponents() {
    registerComponent('application.input', ApplicationInput);
    registerComponent('application.select', ApplicationSelect);
    registerComponent('application.checkbox', ApplicationCheckbox);
    registerComponent('application.form', ApplicationForm);
    registerComponent('application.record-detail', ApplicationRecordDetail);
    registerComponent('application.record-list', ApplicationRecordList);
    registerComponent('application.action-bar', ApplicationActionBar);
    registerComponent('application.badge', ApplicationBadge);
}
//# sourceMappingURL=application.js.map