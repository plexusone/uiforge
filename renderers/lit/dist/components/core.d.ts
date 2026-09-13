import { type TemplateResult } from 'lit';
import { type PageContext } from '../registry.js';
import type { ComponentInstance } from '@plexusone/uiforge-spec';
export declare function renderCoreText(instance: ComponentInstance): TemplateResult;
export declare function renderCoreImage(instance: ComponentInstance): TemplateResult;
export declare function renderCoreButton(instance: ComponentInstance, ctx?: PageContext): TemplateResult;
export declare function renderCoreCard(instance: ComponentInstance, _ctx?: PageContext, children?: TemplateResult[]): TemplateResult;
export declare function registerCoreComponents(): void;
//# sourceMappingURL=core.d.ts.map