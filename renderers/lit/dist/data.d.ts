import type { Binding, ComponentInstance } from './types.js';
import type { PageState } from './state.js';
export interface DataResolution {
    status: 'loading' | 'ready' | 'error';
    value?: unknown;
    error?: string;
}
export interface BindingContext {
    state: PageState;
    context?: Record<string, string>;
}
export declare function resolveBinding(binding: Binding, ctx: BindingContext): unknown;
export declare function resolveData(instance: ComponentInstance, ctx: BindingContext): Record<string, unknown>;
//# sourceMappingURL=data.d.ts.map