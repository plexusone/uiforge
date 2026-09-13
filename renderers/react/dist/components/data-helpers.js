import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// resolveBoundData returns the page's current DataResolution for one of the
// instance's named bindings, or undefined when rendered without a page
// context.
export function resolveBoundData(instance, ctx, name) {
    if (!ctx?.data)
        return undefined;
    return ctx.data(instance)[name];
}
// DataStatus renders the shared loading/error DOM vocabulary for a binding
// that has not settled: data-uiforge-loading while a connector fetch is in
// flight, data-uiforge-data-error when it failed. Renders nothing when the
// binding is ready (or absent) — callers fall through to normal rendering.
export function DataStatus({ res, name, }) {
    if (res?.status === 'loading') {
        return (_jsx("div", { "data-uiforge-loading": name, style: { color: 'var(--uiforge-text-muted, #94a3b8)', fontSize: '0.8rem' }, children: "Loading\u2026" }));
    }
    if (res?.status === 'error') {
        return (_jsxs("div", { "data-uiforge-data-error": name, style: { color: 'var(--uiforge-danger, #dc2626)', fontSize: '0.8rem' }, children: ["Failed to load: ", res.error ?? 'unknown error'] }));
    }
    return null;
}
export function dataPending(res) {
    return res?.status === 'loading' || res?.status === 'error';
}
export function propOf(instance, key, fallback) {
    const value = instance.properties?.[key];
    return value === undefined ? fallback : value;
}
// writeBinding writes a control's new value back to page state when its
// binding points there, then dispatches the change through the page's
// interaction rules.
export function writeBinding(instance, ctx, name, value, eventName, eventData) {
    const binding = instance.data?.[name];
    if (ctx && binding?.source === 'state') {
        const path = binding.parameters?.path;
        if (typeof path === 'string')
            ctx.state.set(path, value);
    }
    ctx?.dispatch(instance.id, eventName, eventData);
}
//# sourceMappingURL=data-helpers.js.map