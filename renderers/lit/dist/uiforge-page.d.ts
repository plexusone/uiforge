import { LitElement, nothing, type TemplateResult } from 'lit';
import { DataSourceRegistry, type DataSourceConnector } from '@plexusone/uiforge-spec';
import { PageState } from '@plexusone/uiforge-spec';
import { InteractionEngine } from '@plexusone/uiforge-spec';
import type { PageSpec } from '@plexusone/uiforge-spec';
export declare class UIForgePage extends LitElement {
    static properties: {
        spec: {
            attribute: boolean;
        };
        initialState: {
            attribute: boolean;
        };
        dataSources: {
            attribute: boolean;
        };
        capabilities: {
            attribute: boolean;
        };
        mode: {};
        _activeTab: {
            state: boolean;
        };
    };
    spec: PageSpec | undefined;
    initialState: Record<string, unknown> | undefined;
    dataSources: DataSourceConnector[] | undefined;
    capabilities: string[] | undefined;
    mode: string | undefined;
    _activeTab: string;
    state: PageState;
    engine: InteractionEngine;
    dataRegistry: DataSourceRegistry;
    private dataCache;
    constructor();
    willUpdate(changed: Map<string, unknown>): void;
    hasCapability(name: string): boolean;
    invalidateComponentData(componentId: string): void;
    private resolveInstanceData;
    dispatch(componentId: string, eventName: string, eventData?: Record<string, unknown>): void;
    private pageContext;
    render(): TemplateResult | typeof nothing;
    private renderLayout;
    private renderGrid;
    private renderStack;
    private renderSplitPane;
    private renderTabs;
    private renderAppShell;
    private renderNavigation;
    private renderNavItems;
    private renderComponent;
}
declare global {
    interface HTMLElementTagNameMap {
        'uiforge-page': UIForgePage;
    }
}
//# sourceMappingURL=uiforge-page.d.ts.map