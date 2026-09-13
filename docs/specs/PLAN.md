# PLAN — UIForge Execution Plan

**Initiative:** INIT-UIFORGE-003
**Status:** Draft
**Date:** 2026-09-10
**Home repo:** github.com/plexusone/uiforge

## Phases

| Phase | Theme | RMIs | Exit Criteria |
|---|---|---|---|
| 1 | Extraction & Foundation | RMI-UIFORGE-101…105 | `go build ./...`, `gofmt`, `go vet`, `go test ./...`, `golangci-lint run` all clean; schemas regenerate deterministically and pass `schemakit lint --property-case camelCase`; both renderer packages install, build, test, and lint green; golden fixtures validate via the registry |
| 2 | Lit Renderer Maturity | RMI-UIFORGE-106…110 | Lit renderer reaches layout parity (split-pane, tabs, application-shell) and engine parity (expression/state/interaction) with React for `core.*` components; shared spec-types package consumed by both renderers; conformance suite drives both renderers from the same fixtures |
| 3 | Platform Hardening | RMI-UIFORGE-111…115 | Profile constraints enforced at validation; external component manifests loadable/versioned; npm publish pipeline + Node CI; PageSpec authoring utilities; runtime adapter generalized |
| 4 | Design System & Application Components | RMI-UIFORGE-116…120 | DSS documents drive theming through the theme package; renderers consume the DSS semantic vocabulary; application.* pack renders forms/records/actions in both renderers; children/slots and navigation reach parity |
| 5 | Data & Extensions | RMI-UIFORGE-121…125 | Lit data runtime resolves external sources with loading/error states; third-party authoring documented; capability enforcement at runtime |

## Working Agreements

- Library-first: importable packages; no CLI/server in this repo for v0.x.
- Go types in `uispec/` are the source of truth; never hand-edit generated schemas.
- Renderer DOM vocabulary (`data-uiforge-*`) is a compatibility contract across renderers — changes require updating both renderers and their tests together.
- Conventional commits; RMI trailers once IDs are registered in the tracking system.

## Risks

| Risk | Mitigation |
|---|---|
| Renderer drift (React vs Lit) | Shared DOM vocabulary asserted in both test suites; Phase 2 conformance suite runs both renderers against the same golden fixtures |
| IR churn before v1 | apiVersion gate; additive-only changes within `ui.plexusone.dev/v1`; PageSpec diffing (`pkg/diff`) supports migration tooling |
| Duplicated TS spec types diverge | Short-term: minimal subset in the Lit package only; resolved by RMI-UIFORGE-109 shared spec package |
| CI toolchain skew | go.mod pinned at 1.26.6 to match shared CI's `GOTOOLCHAIN=local` cache |
