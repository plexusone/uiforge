// @plexusone/uiforge-spec — the renderer-independent layer of UIForge:
// the UISpec TypeScript types (mirroring the Go source of truth in uispec/)
// and the framework-free runtime engines shared by every renderer.
export * from './types.js';
export { evaluateExpression, containsExpression, extractPaths } from './expression.js';
export { PageState } from './state.js';
export { InteractionEngine } from './interaction.js';
export { DataSourceRegistry } from './datasource.js';
export { resolveBinding, resolveData } from './data.js';
//# sourceMappingURL=index.js.map