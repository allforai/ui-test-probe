---
node: analyze-sdk-design
exit_artifacts:
  - .allforai/sdk-design/api-surface.json
  - .allforai/sdk-design/developer-personas.json
  - .allforai/sdk-design/developer-journey-map.json
  - .allforai/sdk-design/api-philosophy.json
  - .allforai/sdk-design/error-catalog.json
  - .allforai/sdk-design/documentation-assessment.json
---

# Task: Reverse-engineer the SDK product design from code

Analyze the ui-test-probe codebase to extract its implicit product design: API surface, developer personas, developer journey, API philosophy, error model, and documentation state. This is SDK-specific analysis — the product IS the API.

## Project Context

- **Type**: Cross-platform UI test observability framework (SDK/Library)
- **Architecture**: Shared spec (TypeScript types + JSON Schema) → 6 platform SDKs → 6 test integrations → CLI
- **Core concept**: 6 primitives (Element Registry, State Exposure, Event Stream, Source Binding, Layout Metrics, Action Dispatch) + 15 element attributes + 9 probe types + 6 linkage paths
- **Reference implementation**: sdk/web/ (TypeScript) — most complete, read this deeply
- **Target users**: Test engineers using Playwright/Flutter Test/XCTest/etc.

## Upstream Artifacts

Read these first (produced by discover-codebase):
- `.allforai/product-map/source-summary.json` — module inventory + implementation state
- `.allforai/product-map/file-catalog.json` — key files with exports + business intent

## Theory Anchors

### API Design Theory (from domains/sdk.md)
- **Principle of Least Astonishment**: Behavior should match developer expectations
- **Pit of Success** (Rico Mariani): Correct usage should be easier than incorrect
- **Huffman Coding for APIs**: Most common operations should be most concise
- **Progressive Disclosure**: Simple cases simple, complex cases possible
- **5-Minute Rule**: Developer should run Hello World in 5 minutes

### Developer Experience Theory
- **Cognitive Dimensions** (Green & Petre, 1996): 13 dimensions for API usability
- **Diátaxis Documentation Framework** (Procida, 2017): Tutorials / How-to / Reference / Explanation

### SDK Lifecycle Stages (from domains/sdk.md)
developer-persona → api-philosophy → api-surface → api-ergonomics → error-design → documentation

## Guidance

### 1. API Surface Reverse-Engineering

Read the complete UITestProbe interface in `spec/probe-types.ts` and the WebProbe implementation in `sdk/web/src/probe.ts`. For each method:
- Classify into which primitive it belongs
- Document: method signature, purpose, parameters, return type
- Note: is it implemented in the reference SDK? In other SDKs?

Group by the 6 primitives + auxiliary capabilities (hierarchy, platform context, snapshot/diff).

Also catalog:
- 9 ProbeType enum values and their data extensions
- 15 ProbeElement attributes and which are optional
- 6 LinkagePath types and their fields
- Type-specific data shapes (data-container vs media vs form)

### 2. Developer Personas

From the code + README + SPEC.md, infer who would use this SDK:
- **Primary**: Test engineers writing E2E tests (Playwright/Flutter Test/XCTest users)
- **Secondary**: Frontend developers adding probe annotations to UI code
- **Tertiary**: SDK contributors implementing new platform SDKs

For each persona: expertise level, goals, pain points this SDK addresses, interaction pattern.

### 3. Developer Journey Map

Map the developer journey for each persona:
- Discover → Evaluate → Integrate → Use → Extend → Contribute
- For each stage: what they do, what artifacts they interact with, what could go wrong

### 4. API Philosophy

Reverse-engineer the implicit design philosophy from code patterns:
- Annotation-based (data-probe-* attributes) vs imperative
- Convention over configuration (autoScan, interceptNetwork defaults to true)
- Progressive disclosure (query() for simple, actAndWait() for complex)
- Platform abstraction (shared types, per-platform implementations)
- Zero-config start (WebProbe constructor installs everything by default)

### 5. Error Model

Catalog from code:
- ProbeActionError types: NOT_FOUND, NOT_VISIBLE, DISABLED, BUSY, OPTION_NOT_FOUND
- Pre-check pattern in ActionDispatcher (validate before execute)
- Timeout patterns in waitForState/waitForPageReady
- How errors propagate through actAndWait

### 6. Documentation Assessment

Evaluate current documentation against Diátaxis framework:
- README.md — quality, completeness, Getting Started presence
- SPEC.md — requirements clarity
- DESIGN.md — technical design depth
- Inline documentation (JSDoc/comments) quality
- Examples coverage and runnability

## Exit Artifacts

### `.allforai/sdk-design/api-surface.json`
Complete API surface inventory.
```json
{
  "generated_at": "<ISO>",
  "primitives": [
    {
      "name": "Element Registry",
      "methods": [
        { "name": "query", "signature": "(id: string) => ProbeElement | null", "implemented_in": ["web"], "description": "..." }
      ]
    }
  ],
  "types": {
    "probe_types": [...],
    "element_attributes": [...],
    "linkage_paths": [...],
    "type_specific_data": [...]
  },
  "platform_coverage": {
    "web": { "state": "partial", "implemented_methods": 42, "total_methods": 42 },
    "flutter": { "state": "stub", "implemented_methods": 0, "total_methods": 42 }
  }
}
```

### `.allforai/sdk-design/developer-personas.json`
Developer personas with expertise levels and interaction patterns.

### `.allforai/sdk-design/developer-journey-map.json`
Per-persona journey: discover → evaluate → integrate → use → extend → contribute.

### `.allforai/sdk-design/api-philosophy.json`
Extracted design principles with evidence from code.

### `.allforai/sdk-design/error-catalog.json`
All error types, pre-check patterns, timeout behaviors, propagation chains.

### `.allforai/sdk-design/documentation-assessment.json`
Diátaxis evaluation with gaps identified.

## Downstream Contract

→ **generate-artifacts** reads:
  - `api-surface.json`: primitives[].methods (to build task-inventory equivalent for SDK), types (to build entity-model), platform_coverage (for product-map completeness)
  - `developer-personas.json`: persona definitions (to build role-profiles equivalent)
  - `developer-journey-map.json`: journey stages (to build business-flows equivalent)
  - `error-catalog.json`: error types (to enrich entity-model)
  - `documentation-assessment.json`: gaps (to inform use-case-tree scenarios)
