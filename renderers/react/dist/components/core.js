import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { registerComponent } from '../registry.js';
import { useUIForge } from '../PageRenderer.js';
import { propOf } from './data-helpers.js';
// Core component pack for the React renderer: text, image, button, card.
// Emits the same DOM vocabulary as the Lit pack (renderers/lit/src/
// components/core.ts) so the cross-renderer contract holds.
export function CoreText({ instance }) {
    const content = propOf(instance, 'content', '');
    const variant = propOf(instance, 'variant', 'body');
    switch (variant) {
        case 'heading':
            return _jsx("h2", { "data-uiforge-component": instance.id, children: content });
        case 'caption':
            return _jsx("small", { "data-uiforge-component": instance.id, children: content });
        default:
            return _jsx("p", { "data-uiforge-component": instance.id, children: content });
    }
}
export function CoreImage({ instance }) {
    return (_jsx("img", { "data-uiforge-component": instance.id, src: propOf(instance, 'src', ''), alt: propOf(instance, 'alt', '') }));
}
const buttonVariants = {
    primary: { background: 'var(--uiforge-primary, #2563eb)', color: '#ffffff', border: 'none' },
    secondary: {
        background: 'transparent',
        color: 'var(--uiforge-text, #0f172a)',
        border: '1px solid var(--uiforge-border, #cbd5e1)',
    },
    ghost: { background: 'transparent', color: 'var(--uiforge-text, #0f172a)', border: 'none' },
    danger: { background: 'var(--uiforge-danger, #dc2626)', color: '#ffffff', border: 'none' },
};
export function CoreButton({ instance }) {
    const ctx = useUIForge();
    const variant = String(instance.properties?.variant ?? 'primary');
    const disabled = instance.properties?.disabled === true;
    const style = {
        ...(buttonVariants[variant] ?? buttonVariants.primary),
        padding: '8px 16px',
        borderRadius: 'var(--uiforge-radius, 0.375rem)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
    };
    return (_jsx("button", { "data-uiforge-component": instance.id, style: style, disabled: disabled, onClick: () => ctx?.dispatch(instance.id, 'click', {}), children: String(instance.properties?.label ?? '') }));
}
export function CoreCard({ instance, children }) {
    const title = instance.properties?.title;
    const subtitle = instance.properties?.subtitle;
    const style = {
        border: '1px solid var(--uiforge-border, #e2e8f0)',
        borderRadius: 'var(--uiforge-radius, 0.5rem)',
        background: 'var(--uiforge-surface, #ffffff)',
        padding: String(instance.properties?.padding ?? '16px'),
        fontFamily: 'var(--uiforge-font-family, system-ui, sans-serif)',
    };
    return (_jsxs("div", { "data-uiforge-component": instance.id, style: style, children: [title ? _jsx("h3", { style: { margin: '0 0 4px', fontSize: '1rem' }, children: String(title) }) : null, subtitle ? (_jsx("p", { style: {
                    margin: '0 0 12px',
                    color: 'var(--uiforge-text-muted, #64748b)',
                    fontSize: '0.85rem',
                }, children: String(subtitle) })) : null, children] }));
}
// registerCoreComponents registers the built-in core.* component renderers.
export function registerCoreComponents() {
    registerComponent('core.text', CoreText);
    registerComponent('core.image', CoreImage);
    registerComponent('core.button', CoreButton);
    registerComponent('core.card', CoreCard);
}
//# sourceMappingURL=core.js.map