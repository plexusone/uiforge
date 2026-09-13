import React from 'react';
import type { LayoutSpec, ComponentInstance, NavigationSpec } from '@plexusone/uiforge-spec';
interface LayoutProps {
    layout: LayoutSpec;
    components: ComponentInstance[];
    renderComponent: (instance: ComponentInstance) => React.ReactNode;
    navigation?: NavigationSpec;
    onNavigate?: (item: {
        item: string;
        target?: string;
    }) => void;
}
export declare function Layout({ layout, components, renderComponent, navigation, onNavigate, }: LayoutProps): React.ReactElement;
export {};
//# sourceMappingURL=layouts.d.ts.map