import { html } from 'lit';
// resolveBoundData returns the page's current DataResolution for one of the
// instance's named bindings, or undefined when rendered without a page
// context.
export function resolveBoundData(instance, ctx, name) {
    if (!ctx?.data)
        return undefined;
    return ctx.data(instance)[name];
}
// renderDataStatus renders the shared loading/error DOM vocabulary for a
// binding that has not settled: data-uiforge-loading while a connector fetch
// is in flight, data-uiforge-data-error when it failed. Returns null when
// the binding is ready (or absent) so callers fall through to their normal
// rendering.
export function renderDataStatus(res, name) {
    if (res?.status === 'loading') {
        return html `<div
      data-uiforge-loading=${name}
      style="color: var(--uiforge-text-muted, #94a3b8); font-size: 0.8rem"
    >
      Loading…
    </div>`;
    }
    if (res?.status === 'error') {
        return html `<div
      data-uiforge-data-error=${name}
      style="color: var(--uiforge-danger, #dc2626); font-size: 0.8rem"
    >
      Failed to load: ${res.error ?? 'unknown error'}
    </div>`;
    }
    return null;
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