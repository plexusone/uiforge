import { type ComponentInstance, type InteractionAction, type LayoutSpec, type NavItem, type PageSpec } from './types.js';
export declare class AuthoringError extends Error {
    readonly problems: string[];
    constructor(problems: string[]);
}
export declare function newPage(id: string, title: string): PageBuilder;
export declare class PageBuilder {
    private page;
    private errs;
    constructor(id: string, title: string);
    private pageLayoutSet;
    profile(profile: string): this;
    description(d: string): this;
    context(key: string, value: string): this;
    grid(columns: number, gap: string): this;
    stack(direction?: 'vertical' | 'horizontal'): this;
    appShell(...regions: string[]): this;
    layout(layout: LayoutSpec): this;
    theme(id: string, tokens: Record<string, string>): this;
    navigation(navType: string, ...items: NavItem[]): this;
    add(...components: ComponentBuilder[]): this;
    onEvent(componentId: string, event: string, ...actions: InteractionAction[]): this;
    build(): PageSpec;
}
export declare function navItem(id: string, label: string, target?: string, ...children: NavItem[]): NavItem;
export declare function component(id: string, componentType: string): ComponentBuilder;
export declare class ComponentBuilder {
    readonly instance: ComponentInstance;
    readonly errs: string[];
    constructor(id: string, componentType: string);
    version(v: string): this;
    at(row: number, col: number): this;
    span(colSpan: number, rowSpan: number): this;
    prop(key: string, value: unknown): this;
    bind(input: string, source: string, operation: string, parameters?: Record<string, unknown>): this;
    bindState(input: string, path: string, defaultValue?: unknown): this;
    bindStatic(input: string, value: unknown): this;
    default(input: string, value: unknown): this;
    private setBinding;
    visibleWhen(condition: string): this;
    child(...children: ComponentBuilder[]): this;
}
export declare function setState(target: string, path: string, value: unknown): InteractionAction;
export declare function toggleState(target: string, path: string): InteractionAction;
export declare function refresh(target: string): InteractionAction;
//# sourceMappingURL=authoring.d.ts.map