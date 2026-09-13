import { type TemplateResult } from 'lit';
import { type PageContext } from '../registry.js';
import type { ComponentInstance } from '@plexusone/uiforge-spec';
export declare function renderInput(instance: ComponentInstance, ctx?: PageContext): TemplateResult;
export declare function renderSelect(instance: ComponentInstance, ctx?: PageContext): TemplateResult;
export declare function renderCheckbox(instance: ComponentInstance, ctx?: PageContext): TemplateResult;
export declare function renderForm(instance: ComponentInstance, ctx?: PageContext, children?: TemplateResult[]): TemplateResult;
export declare function renderRecordDetail(instance: ComponentInstance, ctx?: PageContext): TemplateResult;
export declare function renderRecordList(instance: ComponentInstance, ctx?: PageContext): TemplateResult;
export declare function renderActionBar(instance: ComponentInstance, ctx?: PageContext): TemplateResult;
export declare function renderBadge(instance: ComponentInstance): TemplateResult;
export declare function registerApplicationComponents(): void;
//# sourceMappingURL=application.d.ts.map