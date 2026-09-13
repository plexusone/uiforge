# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What UIForge Is

A specification-driven UI composition platform. **UISpec JSON is the primary artifact** — Go types in `uispec/` are the source of truth, JSON Schemas are generated from them, and renderers (React, Lit) consume the same IR. Library-first: importable packages only; no CLI or server in this repo.

## Naming History (important)

The `dashforge` repository was temporarily named `uiforge` for its v0.4–v0.5 releases, then renamed back. This repository is the **standalone UIForge platform**, extracted from dashforge's framework core. Consequences:

- Initiatives INIT-UIFORGE-001/-002 and RMIs RMI-UIFORGE-001…053 refer to work **in the dashforge repo** during its uiforge era. They are permanent and must never be reused or rewritten. This repo's IDs start at INIT-UIFORGE-003 / RMI-UIFORGE-101.
- `github.com/plexusone/uiforge` previously redirected to dashforge; creating/pushing this repo reclaims the name.
- dashforge retains its own copies of these packages until it migrates to depend on this module (tracked in dashforge's roadmap). Do not "sync" code between the repos ad hoc.

## Architecture

```text
PageSpec ──► schema validation ──► registry validation ──► pkg engines ──► renderers/{react,lit}
```

- `uispec/` — PageSpec, ComponentInstance, LayoutSpec, Binding, Interaction, NavigationSpec, ThemeRef
- `registry/` — ComponentSpec manifests, profiles, `NewWithBuiltins()`, `ValidatePage`
- `pkg/{expression,state,interaction,diff}/` — runtime engines (stdlib-only)
- `schema/` — generated schemas + `go:embed`; generator at `schema/generate/main.go` (`//go:build ignore`; root `tools.go` pins its dependency)
- `theme/` — design-system-spec (DSS) adapter: maps DSS documents onto UIForge's semantic token contract
- `renderers/react/` — `@plexusone/uiforge-renderer`; `renderers/lit/` — `@plexusone/uiforge-renderer-lit`
- `testdata/pagespecs/` — golden fixtures validated by `registry/golden_test.go`

## Conventions & Gotchas

- **Schemas are generated, never hand-edited.** `go run schema/generate/main.go` from the repo root must leave a clean git diff. Lint with `schemakit lint --property-case camelCase`.
- **The component reference (`docs/components/`) is generated from the registry manifests** by `go run docs/generate/main.go` — regenerate after any manifest change; never hand-edit. `docs/changelog.md` and `CHANGELOG.md` are both generated from `CHANGELOG.json` via `schangelog generate`. The MkDocs site builds with `mkdocs build` (output `site/` is gitignored).
- **`data-uiforge-*` DOM vocabulary is a cross-renderer contract.** Both renderers and their tests assert on it — change it in lockstep or not at all. This includes the data-state markers `data-uiforge-loading` and `data-uiforge-data-error` emitted while connector bindings resolve.
- **Theme tokens are `--uiforge-<key>` CSS custom properties where keys follow DSS's semantic vocabulary** (primary, surface, text-muted, border, accent, …) plus `font-family` and `radius`. The internal prefix is fixed — never make it configurable; white-labeling happens by binding values (see `theme.Options.SourcePrefix`) and scoping themes per page root, not by renaming the contract.
- **go.mod stays at `go 1.26.6`.** Shared CI (`plexusone/.github` reusable workflows) runs `GOTOOLCHAIN=local` with a cached 1.26.x toolchain; a newer directive breaks CI even if it builds locally.
- **`renderers/*/dist/` is committed** so packages are consumable via git before npm publishing. Rebuild dist before committing renderer source changes.
- **`spec/` (`@plexusone/uiforge-spec`) is the single source for the UISpec TS types and the framework-free engines** (expression, state, interaction, datasource, data). Both renderers depend on it via `file:../../spec` — build `spec/` before building a renderer. The `file:` links become version dependencies at npm publish time (RMI-UIFORGE-113); until then, consuming a renderer package via git requires the whole repo. Both renderers ship parallel core/analytics/application component packs that must emit identical DOM.
- The fixture-driven conformance tests (`conformance.test.ts` / `conformance.test.tsx`) assert both renderers produce the same DOM for the golden fixtures — keep their assertions aligned.
- **Relative TS imports must carry explicit `.js` extensions** (`from './registry.js'`, directory imports as `./components/assistant/index.js`). tsc emits specifiers verbatim, and the Lit dist is consumed by native browser ESM (see `examples/demo/`), which rejects extensionless imports. Bundlers tolerate either form, so both packages use `.js` consistently.
- `createAgentOSRuntime` in the React renderer keeps its historical name until RMI-UIFORGE-115.

## Commands

```bash
go build ./... && go vet ./... && go test ./...
gofmt -l .                       # must be empty
golangci-lint run ./...
go run schema/generate/main.go   # deterministic regeneration

cd renderers/react && npm install && npm run build && npm test && npm run lint && npm run format
cd renderers/lit   && npm install && npm run build && npm test && npm run lint && npm run format
```
