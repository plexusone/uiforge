import { type TemplateResult } from 'lit';
import type { PageContext } from '../registry.js';
import type { DataResolution } from '@plexusone/uiforge-spec';
import type { ComponentInstance } from '@plexusone/uiforge-spec';
export declare function resolveBoundData(instance: ComponentInstance, ctx: PageContext | undefined, name: string): DataResolution | undefined;
export declare function renderDataStatus(res: DataResolution | undefined, name: string): TemplateResult | null;
//# sourceMappingURL=data-helpers.d.ts.map