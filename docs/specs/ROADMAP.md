# ROADMAP — UIForge RMI Breakdown

**Initiative:** INIT-UIFORGE-003
**Date:** 2026-09-10

RMI IDs use the repo slug where the work lands.

> **Numbering note:** RMI-UIFORGE-001 through RMI-UIFORGE-053 (and initiatives INIT-UIFORGE-001/-002) were consumed during the dashforge repository's uiforge-named era and remain permanently attributed to work in that repo. This repository's numbering starts at **101**.

---

## Phase 1: Extraction & Foundation

| ID | Title | Repo | Type | Required |
|---|---|---|---|---|
| RMI-UIFORGE-101 | Repo scaffolding: go.mod, CI wrappers, gitignore, specs | uiforge | chore | yes |
| RMI-UIFORGE-102 | Port UISpec types, component registry, and runtime engines (expression/state/interaction/diff) | uiforge | capability | yes |
| RMI-UIFORGE-103 | Schema generation pipeline with embedded page/component schemas and schemakit gate | uiforge | capability | yes |
| RMI-UIFORGE-104 | Port React renderer as @plexusone/uiforge-renderer with UIForge branding | uiforge | capability | yes |
| RMI-UIFORGE-105 | Golden PageSpec fixtures and full test suite | uiforge | test | yes |

### Dependencies

- RMI-UIFORGE-102 → RMI-UIFORGE-101
- RMI-UIFORGE-103 → RMI-UIFORGE-102
- RMI-UIFORGE-104 → RMI-UIFORGE-102
- RMI-UIFORGE-105 → RMI-UIFORGE-102, RMI-UIFORGE-103, RMI-UIFORGE-104

## Phase 2: Lit Renderer Maturity

| ID | Title | Repo | Type | Required |
|---|---|---|---|---|
| RMI-UIFORGE-106 | Lit renderer scaffold: uiforge-page element, registry, core.text/core.image | uiforge | capability | yes |
| RMI-UIFORGE-107 | Lit layout parity: split-pane, tabs, application-shell, regions | uiforge | capability | yes |
| RMI-UIFORGE-108 | Lit engine wiring: expression, state, and interaction runtimes | uiforge | capability | yes |
| RMI-UIFORGE-109 | Extract shared @plexusone/uiforge-spec TS types package consumed by both renderers | uiforge | refactor | yes |
| RMI-UIFORGE-110 | Renderer conformance suite driven by golden fixtures across both renderers | uiforge | test | yes |

### Dependencies

- RMI-UIFORGE-107 → RMI-UIFORGE-106
- RMI-UIFORGE-108 → RMI-UIFORGE-106
- RMI-UIFORGE-109 → RMI-UIFORGE-106
- RMI-UIFORGE-110 → RMI-UIFORGE-107, RMI-UIFORGE-108, RMI-UIFORGE-109

## Phase 3: Platform Hardening

| ID | Title | Repo | Type | Required |
|---|---|---|---|---|
| RMI-UIFORGE-111 | Profile constraint enforcement in registry validation | uiforge | capability | yes |
| RMI-UIFORGE-112 | Registry extensibility: external manifest loading and version resolution | uiforge | capability | yes |
| RMI-UIFORGE-113 | npm publish pipeline and Node CI workflow | uiforge | ci | yes |
| RMI-UIFORGE-114 | PageSpec authoring utilities (builders, migration helpers) | uiforge | capability | no |
| RMI-UIFORGE-115 | Generalize assistant runtime adapter to a neutral external-store API | uiforge | refactor | no |

### Dependencies

- RMI-UIFORGE-112 → RMI-UIFORGE-111
- RMI-UIFORGE-113 → RMI-UIFORGE-110
- RMI-UIFORGE-115 → RMI-UIFORGE-109

## Phase 4: Design System & Application Components

| ID | Title | Repo | Type | Required |
|---|---|---|---|---|
| RMI-UIFORGE-116 | DSS theme adapter: theme package mapping design-system-spec documents to semantic tokens | uiforge | capability | yes |
| RMI-UIFORGE-117 | Align renderer CSS custom properties to the DSS semantic vocabulary | uiforge | refactor | yes |
| RMI-UIFORGE-118 | application.* component pack: button, input, select, form, card, modal, record views, action bar | uiforge | capability | yes |
| RMI-UIFORGE-119 | Renderer parity for component children/slots and NavigationSpec | uiforge | capability | yes |
| RMI-UIFORGE-120 | Registry validation of themes and component manifests against DSS documents | uiforge | capability | no |

### Dependencies

- RMI-UIFORGE-117 → RMI-UIFORGE-116
- RMI-UIFORGE-118 → RMI-UIFORGE-117
- RMI-UIFORGE-120 → RMI-UIFORGE-116

## Phase 5: Data & Extensions

| ID | Title | Repo | Type | Required |
|---|---|---|---|---|
| RMI-UIFORGE-121 | Lit data-source connector runtime with async loading and error states | uiforge | capability | yes |
| RMI-UIFORGE-122 | Third-party component authoring guide | uiforge | docs | yes |
| RMI-UIFORGE-123 | Runtime capability enforcement for registered components | uiforge | capability | no |
| RMI-UIFORGE-124 | Sandboxed extension host for untrusted components ([design](extension-host.md)) | uiforge | capability | no |
| RMI-UIFORGE-125 | Density and discrete mode-switching model (with upstream DSS proposal) | uiforge | capability | no |
| RMI-UIFORGE-126 | Migrate to the systemspec-designsystem module path (DSS v0.6.0) | uiforge | migration | no |
| RMI-UIFORGE-127 | Migrate theme adapter to DSS v0.7.0 first-class modes | uiforge | refactor | no |
| RMI-UIFORGE-128 | Migrate ThemeRef density to DSS's open density catalog | uiforge | refactor | no |

### Dependencies

- RMI-UIFORGE-123 → RMI-UIFORGE-122
- RMI-UIFORGE-124 → RMI-UIFORGE-123
- RMI-UIFORGE-127 → RMI-UIFORGE-125
- RMI-UIFORGE-128 → RMI-UIFORGE-127

---

Adoption of UIForge as a dependency by downstream applications (including dashforge) is tracked in each consuming repo's own roadmap.
