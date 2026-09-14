# Extension Host Design — Sandboxed Third-Party Components

**RMI:** RMI-UIFORGE-124
**Status:** Design (pre-implementation)
**Date:** 2026-09-14

This document captures the design for running components UIForge does not trust. Nothing here is implemented yet; the [component authoring guide](../guides/authoring-components.md) describes today's trusted-native model, and the capability machinery from RMI-UIFORGE-123 (declared ∩ profile-allowed ∩ granted) is the foundation this builds on.

## Threat model

- **Untrusted:** third-party component code — marketplace packages, vendor extensions — running inside a host application's pages.
- **Protected:** the host application's session, credentials, and internals ("platform chrome"); connector credentials and the data broker; page data beyond what the viewing user is authorized to see; other components' DOM and state; other tenants.
- **Out of scope / non-goals:** a malicious or compromised host application; perfect side-channel (Spectre-class) resistance on deployments that decline COOP/COEP; sandboxing the host itself.

## Why in-process ("just call the function") cannot be secured

A shared JavaScript realm is not a security boundary:

- Any handed object is a capability leak — from a rendered node, `ownerDocument` reaches the whole page (shadow DOM is encapsulation, not security); from nearly any value, `Function` reaches full evaluation; prototype pollution poisons host objects.
- Ambient authority (`fetch`, storage, cookies) is unrevokable in-realm. The runtime capability gates from RMI-123 are honest-component conventions, not containment — hostile code simply bypasses the helpers.
- Same-realm confinement systems (membranes, SES/Hardened JS, ShadowRealm) are real but are a *product to maintain*, not a library to adopt: SES `lockdown()` constrains the host's own code; DOM can't be safely granted into a realm; membranes have a long bypass history. See the Salesforce comparison below.

## The trust matrix: review vs. structure

The deciding variable is **whether the code's author and the data's owner are the same principal**. Security review (à la AppExchange) exists to bridge that gap; when there is no gap, structure replaces review.

| Code source | Author = data owner? | Review needed? | Isolation |
|---|---|---|---|
| Platform / host team | yes | no | none — trusted native (today's model) |
| **Tenant's own admins** | yes (self-harm only) | **no** — replaced by structure: admin-gated authoring + viewer-scoped data broker | light — protect platform chrome; trusted-native or a future managed tier |
| Marketplace / cross-tenant | **no** | yes, **or** full sandbox as substitute | full — worker or iframe tier |

**The tenant tier's structural substitutes for review:**

1. *Authoring is privilege-gated*: only principals with broad tenant data access (admins) may register components — closing intra-tenant privilege escalation (low-privilege author, high-privilege viewer).
2. *Execution never exceeds the viewer's authority*: extension code holds no credentials; all data flows through the broker executing under the **current viewer's** authorization (the capability grant sourced from the viewer session). Even malicious tenant code reads only what the person viewing the page could read.
3. Cross-tenant isolation is carried by server-side tenancy, not the JS sandbox.

## Isolation tiers

### Tier 1 — Declarative worker extensions (primary; build first)

Untrusted code runs in a **Web Worker with no DOM**; its only output is a **PageSpec fragment** over a versioned postMessage protocol. The trusted renderer renders the fragment with registered components.

Why this is the strongest *and* cheapest tier:

- Design-system conformance is enforced **by construction** — the platform renders; the extension only composes.
- The existing machinery does the heavy lifting: fragment validation is `ValidatePage` + property schemas + the token contract; rendering is the existing renderers.
- Capability enforcement *is* the message protocol: data requests are brokered through the host's connector registry with capability checks; the worker never holds credentials.
- Network egress is bounded by the page CSP (`connect-src`) and, in the full-isolation variant, by the extension origin.
- It is also the natural target for AI-generated extensions — "emit a spec" is already the platform's authoring model.

### Tier 2 — Iframe extensions (custom pixels)

For extensions that genuinely need their own rendering (proprietary chart libraries): a **cross-origin, sandboxed iframe**, integrated through a bridge component (`extension.frame`) that implements the normal component contract — instance/props/theme tokens in; events, size negotiation out; data only through the broker protocol. Loading/error states map onto the existing `data-uiforge-loading`/`data-uiforge-error` vocabulary.

### Tier 3 — Managed same-realm (deferred)

An LWS-style membrane tier for reviewed, semi-trusted code that must compose seamlessly. Explicitly deferred: it is a permanent security product (continuous distortion maintenance, bypass response) and is only defensible behind a marketplace review process. Revisit if/when a review pipeline exists.

## Origin requirements (the part shortcuts silently break)

- **The host needs no new domain for its own JS.** The requirement is a **second origin for extension content**: static hosting only (extension bundles + a small runner page), no cookies or sessions, immutable content-addressed URLs so manifest integrity hashes are meaningful.
- **A subdomain is not sufficient.** `ext.example.com` is the same *site* as `app.example.com`: domain-scoped cookies can leak, and browsers make process-isolation decisions per site — a same-site iframe can share the host's OS process (Spectre exposure). Use a **separate registrable domain** (the `*-usercontent.com` pattern used by Google, Figma, and Salesforce's content domains).
- **The blob-worker trap:** fetching third-party code and running it via `new Worker(blobURL)` makes the worker **same-origin with the host** — no DOM, but full access to the origin's IndexedDB/Cache and same-origin fetch. Acceptable only for the tenant/managed tiers or hosts that keep nothing sensitive in origin storage. Full isolation spawns the worker **from a hidden runner iframe on the extensions origin**, giving both tiers one shared piece of infrastructure and a throwaway storage/fetch context.
- Development mode: a second localhost port is a different *origin* (fine for dev) but not a different *site* — never the production posture.
- Host hardening obligations (documented requirements, not library code): real CSP, `permissions-policy` on frames, the bridge treated as security-critical reviewed code, no privileged objects through postMessage, COOP/COEP where Spectre matters.

## Manifest and registry changes

- `ComponentSpec.runtime` gains enforced semantics: `"native" | "worker" | "iframe"` (today the field is informational).
- Non-native runtimes require: entry URL (on the extensions origin), an integrity hash (content-addressed), and a declared network allowlist; `Register`/`LoadManifest` validate presence and shape.
- Profile gating extends naturally: e.g. the `embedded` profile may forbid `iframe` runtimes outright (`ProfileConstraints`).
- The capability model is unchanged — non-native runtimes simply make the grant *enforceable* instead of conventional.

## Bridge protocol (sketch — to be specified fully before implementation)

Versioned message envelope; per-instance channel. Inbound to extension: `init` (instance, resolved props, theme tokens, granted capabilities, mode/density), `data-result`, `update`. Outbound: `fragment` (worker tier — a PageSpec fragment), `event` (name + payload, checked against manifest events), `data-request` (input name → brokered through connectors with capability + viewer-authz checks), `resize` (iframe tier), `error`. Timeouts and crashes surface as `data-uiforge-error`.

## Salesforce comparison (context for these choices)

| Salesforce | This design |
|---|---|
| LWS per-namespace virtual environments (same-realm membranes) — their strategic direction for seamless composition | Tier 3, deferred: only viable as a maintained security product behind review |
| In-org customer LWC: **no security review**, deploy-permission gated, LWS protects platform chrome | The tenant tier: same principle, achieved with viewer-scoped broker + admin gating instead of membranes |
| Canvas apps / content domains (`*.forceusercontent.com`) on separate origins | Tier 2 iframes + the extensions-origin requirement |
| AppExchange security review for cross-tenant distribution | The review-or-full-sandbox requirement for marketplace code |
| (no DOM-less tier) | Tier 1 — the declarative worker tier is this design's structural advantage: the IR makes "extension emits a spec, platform renders" the seamless path |

## Sequencing

1. **This design doc** (done) → review, then fold a summary into the TRD when implementation starts.
2. **Slice 1:** worker-declarative tier — manifest `runtime:"worker"` validation, bridge protocol v1, worker host in both renderers, blob-worker mode (tenant tier) with the storage caveat documented.
3. **Slice 2:** runner-iframe full isolation (extensions-origin infrastructure) upgrading slice 1, plus `extension.frame` for custom-pixel extensions.
4. **Deferred:** managed same-realm tier, pending a marketplace review process.
