import { LitElement, html, nothing } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { getComponent } from './registry.js';
import { resolveBinding } from '@plexusone/uiforge-spec';
import { DataSourceRegistry } from '@plexusone/uiforge-spec';
import { evaluateExpression, containsExpression } from '@plexusone/uiforge-spec';
import { PageState } from '@plexusone/uiforge-spec';
import { InteractionEngine } from '@plexusone/uiforge-spec';
// <uiforge-page> renders a PageSpec as a web component. It mirrors the DOM
// vocabulary and layout semantics of the React renderer (data-uiforge-page,
// data-uiforge-layout, data-uiforge-cell, data-uiforge-region,
// data-uiforge-missing, data-uiforge-error, --uiforge-* theme tokens) so
// tooling and tests can target either renderer interchangeably.
export class UIForgePage extends LitElement {
    static { this.properties = {
        spec: { attribute: false },
        initialState: { attribute: false },
        dataSources: { attribute: false },
        _activeTab: { state: true },
    }; }
    constructor() {
        super();
        this.dataCache = new Map();
        this.spec = undefined;
        this.initialState = undefined;
        this.dataSources = undefined;
        this._activeTab = '';
        this.state = new PageState();
        this.engine = new InteractionEngine(this.state);
        this.dataRegistry = new DataSourceRegistry();
    }
    willUpdate(changed) {
        if (changed.has('spec') || changed.has('initialState') || changed.has('dataSources')) {
            this.state = new PageState();
            if (this.spec?.context) {
                this.state.load({ context: this.spec.context });
            }
            if (this.initialState) {
                this.state.load({ ...this.state.snapshot(), ...this.initialState });
            }
            this.engine = new InteractionEngine(this.state);
            // component.refresh invalidates the target's cached data so its
            // connector bindings re-fetch on the next render.
            this.engine.registerHandler('component.refresh', (action) => {
                this.invalidateComponentData(action.target);
            });
            this.dataRegistry = new DataSourceRegistry();
            for (const connector of this.dataSources ?? []) {
                this.dataRegistry.register(connector);
            }
            this.dataCache.clear();
            this._activeTab = this.spec?.layout.regions?.[0]?.name ?? '';
        }
    }
    // invalidateComponentData drops cached connector results for a component.
    invalidateComponentData(componentId) {
        for (const key of this.dataCache.keys()) {
            if (key.startsWith(componentId + ':')) {
                this.dataCache.delete(key);
            }
        }
    }
    // resolveInstanceData returns the current DataResolution for each binding
    // on a component instance. Synchronous sources (static, state) resolve
    // immediately; sources with a registered connector resolve asynchronously —
    // 'loading' now, settling to 'ready' or 'error' on a later render pass.
    // External sources without a connector fall back to the binding's default.
    resolveInstanceData(instance) {
        const result = {};
        for (const [name, binding] of Object.entries(instance.data ?? {})) {
            if (binding.source === 'static' || binding.source === 'state') {
                result[name] = { status: 'ready', value: resolveBinding(binding, { state: this.state }) };
                continue;
            }
            if (!this.dataRegistry.has(binding.source)) {
                result[name] = { status: 'ready', value: binding.default };
                continue;
            }
            const key = `${instance.id}:${name}`;
            const cached = this.dataCache.get(key);
            if (cached) {
                result[name] = cached;
                continue;
            }
            const loading = { status: 'loading' };
            this.dataCache.set(key, loading);
            result[name] = loading;
            const exprCtx = { context: this.spec?.context ?? {}, state: this.state.snapshot() };
            this.dataRegistry
                .resolveBindings({ [name]: binding }, exprCtx)
                .then((resolved) => {
                this.dataCache.set(key, { status: 'ready', value: resolved[name] });
                this.requestUpdate();
            })
                .catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                this.dataCache.set(key, { status: 'error', error: message });
                this.requestUpdate();
            });
        }
        return result;
    }
    // dispatch routes a component event through the page's interaction rules.
    dispatch(componentId, eventName, eventData) {
        if (!this.spec?.interactions)
            return;
        this.engine.dispatch(this.spec.interactions, componentId, eventName, eventData);
        this.requestUpdate();
    }
    pageContext() {
        return {
            state: this.state,
            engine: this.engine,
            dispatch: (componentId, eventName, eventData) => this.dispatch(componentId, eventName, eventData),
            data: (instance) => this.resolveInstanceData(instance),
        };
    }
    render() {
        const page = this.spec;
        if (!page) {
            return nothing;
        }
        return html `
      <div
        style=${styleMap(buildThemeStyle(page.theme))}
        data-uiforge-page=${page.metadata.id}
        data-uiforge-profile=${page.profile ?? nothing}
      >
        ${this.renderLayout(page.layout, page.components)}
      </div>
    `;
    }
    renderLayout(layout, components) {
        switch (layout.type) {
            case 'responsive-grid':
                return this.renderGrid(layout, components);
            case 'stack':
                return this.renderStack(layout, components);
            case 'split-pane':
                return this.renderSplitPane(layout);
            case 'tabs':
                return this.renderTabs(layout);
            case 'application-shell':
                return this.renderAppShell(layout, components);
            default:
                return html `<div data-uiforge-error=${`unknown layout: ${layout.type}`}>
          ${components.map((comp) => this.renderComponent(comp))}
        </div>`;
        }
    }
    renderGrid(layout, components) {
        const columns = layout.config?.columns ?? 12;
        const gap = layout.config?.gap ?? '8px';
        const style = {
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap,
        };
        return html `
      <div style=${styleMap(style)} data-uiforge-layout="responsive-grid">
        ${components.map((comp) => {
            const node = this.renderComponent(comp);
            if (node === null)
                return nothing;
            const pos = comp.position;
            const cellStyle = pos
                ? {
                    gridColumn: `${(pos.col ?? 0) + 1} / span ${pos.colSpan ?? 1}`,
                    gridRow: `${(pos.row ?? 0) + 1} / span ${pos.rowSpan ?? 1}`,
                }
                : {};
            return html `
            <div style=${styleMap(cellStyle)} data-uiforge-cell=${comp.id}>${node}</div>
          `;
        })}
      </div>
    `;
    }
    renderStack(layout, components) {
        const direction = layout.config?.direction ?? 'vertical';
        const gap = layout.config?.gap ?? '8px';
        const style = {
            display: 'flex',
            flexDirection: direction === 'horizontal' ? 'row' : 'column',
            gap,
        };
        return html `
      <div style=${styleMap(style)} data-uiforge-layout="stack">
        ${components.map((comp) => {
            const node = this.renderComponent(comp);
            if (node === null)
                return nothing;
            return html `<div data-uiforge-cell=${comp.id}>${node}</div>`;
        })}
      </div>
    `;
    }
    renderSplitPane(layout) {
        const direction = layout.config?.direction ?? 'horizontal';
        const sizes = layout.config?.sizes ?? [];
        const gap = layout.config?.gap ?? '0px';
        const regions = layout.regions ?? [];
        const style = {
            display: 'flex',
            flexDirection: direction === 'vertical' ? 'column' : 'row',
            gap,
            height: '100%',
        };
        return html `
      <div style=${styleMap(style)} data-uiforge-layout="split-pane">
        ${regions.map((region, i) => {
            const size = sizes[i];
            const paneStyle = size ? { flex: `0 0 ${size}` } : { flex: '1' };
            return html `
            <div style=${styleMap(paneStyle)} data-uiforge-region=${region.name}>
              ${region.layout ? this.renderLayout(region.layout, []) : nothing}
            </div>
          `;
        })}
      </div>
    `;
    }
    renderTabs(layout) {
        const regions = layout.regions ?? [];
        const active = this._activeTab;
        const tablistStyle = { display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0' };
        return html `
      <div data-uiforge-layout="tabs">
        <div role="tablist" style=${styleMap(tablistStyle)}>
          ${regions.map((region) => {
            const tabStyle = {
                padding: '8px 16px',
                border: 'none',
                background: region.name === active ? '#e2e8f0' : 'transparent',
                cursor: 'pointer',
                fontWeight: region.name === active ? '600' : '400',
            };
            return html `
              <button
                role="tab"
                aria-selected=${region.name === active}
                style=${styleMap(tabStyle)}
                @click=${() => {
                this._activeTab = region.name;
            }}
              >
                ${region.name}
              </button>
            `;
        })}
        </div>
        ${regions.map((region) => html `
            <div
              role="tabpanel"
              ?hidden=${region.name !== active}
              data-uiforge-region=${region.name}
            ></div>
          `)}
      </div>
    `;
    }
    renderAppShell(layout, components) {
        const regions = layout.regions ?? [];
        const regionNames = new Set(regions.map((r) => r.name));
        const style = {
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            gridTemplateColumns: 'auto 1fr auto',
            gridTemplateAreas: '"header header header" "sidebar main aside" "footer footer footer"',
            minHeight: '100vh',
        };
        return html `
      <div style=${styleMap(style)} data-uiforge-layout="application-shell">
        ${regionNames.has('header')
            ? html `<div
                style=${styleMap({ gridArea: 'header' })}
                data-uiforge-region="header"
              ></div>`
            : nothing}
        ${regionNames.has('sidebar')
            ? html `<div style=${styleMap({ gridArea: 'sidebar' })} data-uiforge-region="sidebar">
                ${this.renderNavigation()}
              </div>`
            : nothing}
        <div style=${styleMap({ gridArea: 'main' })} data-uiforge-region="main">
          ${components.map((comp) => this.renderComponent(comp))}
        </div>
        ${regionNames.has('aside')
            ? html `<div style=${styleMap({ gridArea: 'aside' })} data-uiforge-region="aside"></div>`
            : nothing}
        ${regionNames.has('footer')
            ? html `<div
                style=${styleMap({ gridArea: 'footer' })}
                data-uiforge-region="footer"
              ></div>`
            : nothing}
      </div>
    `;
    }
    renderNavigation() {
        const nav = this.spec?.navigation;
        if (!nav)
            return nothing;
        return html `<nav data-uiforge-nav=${nav.type}>${this.renderNavItems(nav.items)}</nav>`;
    }
    renderNavItems(items) {
        return html `
      <ul style="list-style: none; margin: 0; padding: 0 0 0 8px">
        ${items.map((item) => html `
            <li>
              <a
                data-uiforge-nav-item=${item.id}
                href=${item.target ?? '#'}
                @click=${(e) => {
            e.preventDefault();
            this.dispatch('navigation', 'select', { item: item.id, target: item.target });
        }}
              >
                ${item.label}
              </a>
              ${item.children?.length ? this.renderNavItems(item.children) : nothing}
            </li>
          `)}
      </ul>
    `;
    }
    renderComponent(instance) {
        if (instance.visibility?.condition) {
            const cond = instance.visibility.condition;
            if (cond === 'false') {
                return null;
            }
            if (containsExpression(cond)) {
                const exprCtx = { state: this.state.snapshot(), context: this.spec?.context ?? {} };
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
        const factory = getComponent(instance.type);
        if (!factory) {
            const missingStyle = {
                padding: '8px',
                border: '1px dashed #cbd5e1',
                borderRadius: '4px',
                color: '#94a3b8',
                fontSize: '0.8rem',
            };
            return html `<div style=${styleMap(missingStyle)} data-uiforge-missing=${instance.type}>
        Unknown component: ${instance.type}
      </div>`;
        }
        try {
            const children = (instance.children ?? [])
                .map((child) => this.renderComponent(child))
                .filter((c) => c !== null);
            return factory(instance, this.pageContext(), children);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const errorStyle = {
                padding: '8px',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                color: '#ef4444',
                fontSize: '0.8rem',
            };
            return html `<div style=${styleMap(errorStyle)} data-uiforge-error=${instance.id}>
        Error in ${instance.id}: ${message}
      </div>`;
        }
    }
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
customElements.define('uiforge-page', UIForgePage);
//# sourceMappingURL=uiforge-page.js.map