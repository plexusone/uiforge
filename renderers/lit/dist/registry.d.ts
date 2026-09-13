import type { TemplateResult } from 'lit';
import type { ComponentInstance } from '@plexusone/uiforge-spec';
import type { DataResolution } from '@plexusone/uiforge-spec';
import type { PageState } from '@plexusone/uiforge-spec';
import type { InteractionEngine } from '@plexusone/uiforge-spec';
export interface PageContext {
    state: PageState;
    engine: InteractionEngine;
    dispatch: (componentId: string, eventName: string, eventData?: Record<string, unknown>) => void;
    data: (instance: ComponentInstance) => Record<string, DataResolution>;
}
export type UIForgeComponentFactory = (instance: ComponentInstance, ctx?: PageContext, children?: TemplateResult[]) => TemplateResult;
export declare function registerComponent(type: string, factory: UIForgeComponentFactory): void;
export declare function getComponent(type: string): UIForgeComponentFactory | undefined;
export declare function hasComponent(type: string): boolean;
export declare function listComponents(): string[];
export declare function clearRegistry(): void;
//# sourceMappingURL=registry.d.ts.map