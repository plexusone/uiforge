import React from 'react';
import type { PageSpec, ComponentInstance } from '@plexusone/uiforge-spec';
import { type DataResolution } from '@plexusone/uiforge-spec';
import { PageState } from '@plexusone/uiforge-spec';
import { InteractionEngine } from '@plexusone/uiforge-spec';
import { DataSourceRegistry } from '@plexusone/uiforge-spec';
import type { DataSourceConnector } from '@plexusone/uiforge-spec';
export interface UIForgeContextValue {
    state: PageState;
    engine: InteractionEngine;
    dataSources: DataSourceRegistry;
    onInteraction?: (componentId: string, event: string, data?: Record<string, unknown>) => void;
    dispatch: (componentId: string, eventName: string, eventData?: Record<string, unknown>) => void;
    data: (instance: ComponentInstance) => Record<string, DataResolution>;
    hasCapability: (name: string) => boolean;
}
export declare const UIForgeContext: React.Context<UIForgeContextValue | null>;
export declare function useUIForge(): UIForgeContextValue | null;
export interface PageRendererProps {
    page: PageSpec;
    className?: string;
    style?: React.CSSProperties;
    onError?: (componentId: string, error: Error) => void;
    initialState?: Record<string, unknown>;
    dataSources?: DataSourceConnector[];
    onInteraction?: (componentId: string, event: string, data?: Record<string, unknown>) => void;
    capabilities?: string[];
    mode?: string;
}
export declare function PageRenderer({ page, className, style, onError, initialState, dataSources: dataSourceConnectors, onInteraction, capabilities, mode, }: PageRendererProps): React.ReactElement;
//# sourceMappingURL=PageRenderer.d.ts.map