import React from 'react';
import type { DataResolution } from '@plexusone/uiforge-spec';
import type { UIForgeContextValue } from '../PageRenderer.js';
import type { ComponentInstance } from '@plexusone/uiforge-spec';
export declare function resolveBoundData(instance: ComponentInstance, ctx: UIForgeContextValue | null, name: string): DataResolution | undefined;
export declare function DataStatus({ res, name, }: {
    res: DataResolution | undefined;
    name: string;
}): React.ReactElement | null;
export declare function dataPending(res: DataResolution | undefined): boolean;
export declare function propOf<T>(instance: ComponentInstance, key: string, fallback: T): T;
export declare function writeBinding(instance: ComponentInstance, ctx: UIForgeContextValue | null, name: string, value: unknown, eventName: string, eventData: Record<string, unknown>): void;
//# sourceMappingURL=data-helpers.d.ts.map