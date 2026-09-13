// @plexusone/uiforge-spec — the renderer-independent layer of UIForge:
// the UISpec TypeScript types (mirroring the Go source of truth in uispec/)
// and the framework-free runtime engines shared by every renderer.
export * from './types.js'
export { evaluateExpression, containsExpression, extractPaths } from './expression.js'
export { PageState } from './state.js'
export { InteractionEngine, type ActionHandler } from './interaction.js'
export { DataSourceRegistry, type DataSourceConnector } from './datasource.js'
export { resolveBinding, resolveData, type BindingContext, type DataResolution } from './data.js'
