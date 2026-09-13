import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import { getComponent } from './registry.js';
import { Layout } from './layouts.js';
import { resolveBinding } from '@plexusone/uiforge-spec';
import { evaluateExpression, containsExpression } from '@plexusone/uiforge-spec';
import { PageState } from '@plexusone/uiforge-spec';
import { InteractionEngine } from '@plexusone/uiforge-spec';
import { DataSourceRegistry } from '@plexusone/uiforge-spec';
export const UIForgeContext = React.createContext(null);
export function useUIForge() {
    return React.useContext(UIForgeContext);
}
export function PageRenderer({ page, className, style, onError, initialState, dataSources: dataSourceConnectors, onInteraction, }) {
    const [, forceRender] = React.useReducer((x) => x + 1, 0);
    const dataCache = React.useRef(new Map());
    const cacheKeyRef = React.useRef([]);
    const [base] = React.useState(() => {
        const pageState = new PageState();
        if (page.context) {
            pageState.load({ context: page.context });
        }
        if (initialState) {
            const merged = { ...pageState.snapshot(), ...initialState };
            pageState.load(merged);
        }
        const engine = new InteractionEngine(pageState);
        const dsRegistry = new DataSourceRegistry();
        if (dataSourceConnectors) {
            for (const c of dataSourceConnectors) {
                dsRegistry.register(c);
            }
        }
        return { state: pageState, engine, dataSources: dsRegistry };
    });
    // Reset the binding cache when the page or connectors change identity.
    if (cacheKeyRef.current[0] !== page || cacheKeyRef.current[1] !== dataSourceConnectors) {
        cacheKeyRef.current = [page, dataSourceConnectors];
        dataCache.current.clear();
    }
    // invalidate drops cached connector results for a component so its
    // bindings re-fetch on the next render (the component.refresh action).
    function invalidateComponentData(componentId) {
        for (const key of dataCache.current.keys()) {
            if (key.startsWith(componentId + ':')) {
                dataCache.current.delete(key);
            }
        }
    }
    base.engine.registerHandler('component.refresh', (action) => {
        invalidateComponentData(action.target);
    });
    function dispatch(componentId, eventName, eventData) {
        base.engine.dispatch(page.interactions ?? [], componentId, eventName, eventData);
        onInteraction?.(componentId, eventName, eventData);
        forceRender();
    }
    // resolveInstanceData mirrors the Lit renderer's tiered binding runtime:
    // static/state resolve synchronously; registered connectors resolve
    // asynchronously (loading → ready/error, cached per component+binding);
    // connector-less external sources fall back to the binding default.
    function resolveInstanceData(instance) {
        const result = {};
        for (const [name, binding] of Object.entries(instance.data ?? {})) {
            if (binding.source === 'static' || binding.source === 'state') {
                result[name] = { status: 'ready', value: resolveBinding(binding, { state: base.state }) };
                continue;
            }
            if (!base.dataSources.has(binding.source)) {
                result[name] = { status: 'ready', value: binding.default };
                continue;
            }
            const key = `${instance.id}:${name}`;
            const cached = dataCache.current.get(key);
            if (cached) {
                result[name] = cached;
                continue;
            }
            const loading = { status: 'loading' };
            dataCache.current.set(key, loading);
            result[name] = loading;
            const exprCtx = { context: page.context ?? {}, state: base.state.snapshot() };
            base.dataSources
                .resolveBindings({ [name]: binding }, exprCtx)
                .then((resolved) => {
                dataCache.current.set(key, { status: 'ready', value: resolved[name] });
                forceRender();
            })
                .catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                dataCache.current.set(key, { status: 'error', error: message });
                forceRender();
            });
        }
        return result;
    }
    const ctx = {
        ...base,
        onInteraction,
        dispatch,
        data: resolveInstanceData,
    };
    const themeStyle = buildThemeStyle(page.theme);
    const mergedStyle = { ...themeStyle, ...style };
    function renderComponent(instance) {
        if (instance.visibility?.condition) {
            const cond = instance.visibility.condition;
            if (cond === 'false') {
                return null;
            }
            if (containsExpression(cond)) {
                const exprCtx = { state: ctx.state.snapshot(), context: page.context ?? {} };
                try {
                    const result = evaluateExpression(cond, exprCtx);
                    if (!result)
                        return null;
                }
                catch {
                    return null;
                }
            }
        }
        const Component = getComponent(instance.type);
        if (!Component) {
            return (_jsxs("div", { "data-uiforge-missing": instance.type, style: {
                    padding: '8px',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '4px',
                    color: '#94a3b8',
                    fontSize: '0.8rem',
                }, children: ["Unknown component: ", instance.type] }, instance.id));
        }
        const children = instance.children?.map(renderComponent);
        return (_jsx(ErrorBoundary, { componentId: instance.id, onError: onError, children: _jsx(Component, { instance: instance, children: children }) }, instance.id));
    }
    return (_jsx(UIForgeContext.Provider, { value: ctx, children: _jsx("div", { className: className, style: mergedStyle, "data-uiforge-page": page.metadata.id, "data-uiforge-profile": page.profile, children: _jsx(Layout, { layout: page.layout, components: page.components, renderComponent: renderComponent, navigation: page.navigation, onNavigate: (item) => ctx.dispatch('navigation', 'select', item) }) }) }));
}
function buildThemeStyle(theme) {
    if (!theme?.tokens)
        return {};
    const style = {};
    for (const [key, value] of Object.entries(theme.tokens)) {
        style[`--uiforge-${key}`] = value;
    }
    return style;
}
class ErrorBoundary extends React.Component {
    constructor() {
        super(...arguments);
        this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error) {
        this.props.onError?.(this.props.componentId, error);
    }
    render() {
        if (this.state.error) {
            return (_jsxs("div", { "data-uiforge-error": this.props.componentId, style: {
                    padding: '8px',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    color: '#ef4444',
                    fontSize: '0.8rem',
                }, children: ["Error in ", this.props.componentId, ": ", this.state.error.message] }));
        }
        return this.props.children;
    }
}
//# sourceMappingURL=PageRenderer.js.map