---
node: generate-artifacts
exit_artifacts:
  - .allforai/product-map/product-map.json
  - .allforai/product-map/entity-model.json
  - .allforai/product-map/use-case-tree.json
---

# Task: Generate structured product artifacts from discovery + SDK analysis

Synthesize the outputs of discover-codebase and analyze-sdk-design into final structured artifacts adapted for the SDK/Library archetype. These are the canonical .allforai/ artifacts that downstream tools consume.

## Project Context

- **Type**: Cross-platform UI test observability framework (SDK/Library)
- **Archetype**: Library/SDK — "No roles. API surface replaces tasks. Usage patterns replace use-cases."
- **Core concept**: 6 primitives, 15 attributes, 9 probe types, 6 linkage paths, cross-platform (7 platforms)

## Upstream Artifacts

Read ALL of these before generating:

**From discover-codebase:**
- `.allforai/product-map/source-summary.json` — module inventory, architecture, implementation state
- `.allforai/product-map/file-catalog.json` — key files with exports and business intent
- `.allforai/product-map/infrastructure-profile.json` — toolchain requirements

**From analyze-sdk-design:**
- `.allforai/sdk-design/api-surface.json` — complete API surface (primitives, methods, types, coverage)
- `.allforai/sdk-design/developer-personas.json` — who uses this SDK
- `.allforai/sdk-design/developer-journey-map.json` — developer lifecycle stages
- `.allforai/sdk-design/api-philosophy.json` — design principles
- `.allforai/sdk-design/error-catalog.json` — error model
- `.allforai/sdk-design/documentation-assessment.json` — doc quality assessment

## Theory Anchors

### SDK Artifact Adaptation (from domains/sdk.md §Specialization Guidance)

| Standard Artifact | SDK Equivalent |
|-------------------|---------------|
| role-profiles | developer-personas (already produced upstream) |
| task-inventory | API operations inventory (methods grouped by primitive) |
| business-flows | Developer integration flows (journey stages) |
| experience-map | N/A for SDK (no screens) |
| use-case-tree | SDK usage scenarios (Given/When/Then for API operations) |

### Cross-Phase Protocols
- **4D self-check**: Every artifact object must pass conclusion / evidence / constraint / decision
- **Closure thinking**: Every API method has happy path + error path + timeout path
- **Mapping closure**: Every type in entity-model must map to at least one API method

### Defensive Patterns
- **Pattern B (Zero-Result Detection)**: If any artifact section has 0 entries, explain why
- **Pattern F (Reference Integrity)**: All IDs cross-referenced between artifacts must resolve

## Guidance

### product-map.json

Unified view of the SDK as a product:
- **Developer personas** (from upstream) as the "roles"
- **API primitives** as the top-level categories (replacing "task groups")
- **Methods** as individual operations (replacing "tasks")
- **Developer journey stages** as "flows"
- **Platform coverage** as implementation status matrix

This is the master document linking everything together.

### entity-model.json

Data model of the SDK's type system:
- **Entities**: ProbeElement, ProbeType, LinkageTarget, LinkagePath, PlatformContext, DeviceProfile, ProbeSnapshot, etc.
- **Fields**: All 15 element attributes with their types, optionality, relationships
- **Relationships**: ProbeElement → LinkageTarget (1:many), ProbeElement → ProbeElement (parent/children), etc.
- **Constraints**: Which fields are required vs optional, type-specific data shapes (data-container vs media)
- **Enums**: ProbeType (9 values), LinkageEffect (7 values), Platform (8 values), etc.

### use-case-tree.json

SDK usage scenarios in Given/When/Then format, organized as a 4-layer tree:
1. **Category** (by primitive): Element Registry, State Exposure, Event Stream, Source Binding, Layout Metrics, Action Dispatch
2. **Feature** (by method group): query, waitForState, actAndWait, etc.
3. **Scenario**: Happy path, error cases, timeout, cross-platform
4. **Step**: Given/When/Then with concrete examples

Minimum 15 use cases covering:
- Happy paths for each primitive (6)
- Error handling: element not found, not visible, disabled, busy (4)
- Timeout scenarios: waitForState, waitForPageReady (2)
- Cross-platform: runAcrossDevices matrix testing (1)
- Composite: actAndWait with linkage verification (1)
- Snapshot/diff workflow (1)

## Exit Artifacts

### `.allforai/product-map/product-map.json`
```json
{
  "generated_at": "<ISO>",
  "product_type": "sdk",
  "product_name": "ui-test-probe",
  "mission": "Transform black-box screenshot testing into white-box state queries",
  "personas": ["<ref to developer-personas.json>"],
  "api_groups": [
    {
      "id": "G1",
      "name": "Element Registry",
      "primitive": 1,
      "operations": [
        { "id": "OP001", "method": "query", "description": "...", "platform_coverage": {...} }
      ]
    }
  ],
  "developer_flows": ["<ref to developer-journey-map.json>"],
  "platform_matrix": {
    "web": { "state": "partial", "phase": 1 },
    "flutter": { "state": "stub", "phase": 2 }
  },
  "implementation_roadmap": ["Phase 1: Web + Playwright", "Phase 2: Flutter", "..."]
}
```

### `.allforai/product-map/entity-model.json`
```json
{
  "generated_at": "<ISO>",
  "entities": [
    {
      "name": "ProbeElement",
      "description": "Core element model with 15 attributes",
      "fields": [
        { "name": "id", "type": "string", "required": true, "description": "Semantic identifier" }
      ],
      "relationships": [
        { "target": "ProbeElement", "type": "parent-child", "cardinality": "1:many" }
      ]
    }
  ],
  "enums": [...],
  "type_specific_shapes": [
    { "probe_type": "data-container", "extra_fields": ["sort", "filter", "selectedRows"] }
  ]
}
```

### `.allforai/product-map/use-case-tree.json`
```json
{
  "generated_at": "<ISO>",
  "categories": [
    {
      "id": "CAT1",
      "name": "Element Registry",
      "features": [
        {
          "id": "F1",
          "name": "Query element by ID",
          "scenarios": [
            {
              "id": "UC001",
              "name": "Query existing element",
              "type": "happy",
              "given": "A page with data-probe-id='order-list' annotated element",
              "when": "probe.query('order-list') is called",
              "then": "Returns ProbeElement with id='order-list', type='data-container', state, layout"
            }
          ]
        }
      ]
    }
  ]
}
```

## Downstream Contract

No downstream consumers — these are the final analysis artifacts.
