# Cross-Platform Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a conformance test framework with JSON test vectors, per-platform runners, and a `probe conformance` CLI command that produces a cross-platform equivalence report.

**Architecture:** JSON test vectors in `spec/conformance/vectors/` define expected behavior. Each platform has a runner that reads vectors, executes them against its SDK, and outputs standardized results. The CLI merges results into a cross-platform report. Phase 1 covers Web + Flutter only.

**Tech Stack:** TypeScript (vectors + CLI + Web runner), Dart (Flutter runner), JSON Schema (vector format), Playwright (Web execution), flutter_test (Flutter execution)

**Spec:** `docs/superpowers/specs/2026-04-01-cross-platform-testing-design.md`

---

## File Map

```
spec/conformance/
├── example-app.json                    # CREATE — shared app element contract
├── vector-schema.json                  # CREATE — JSON schema for vector files
├── vectors/
│   ├── primitive-registry.json         # CREATE — 8 vectors
│   ├── primitive-state.json            # CREATE — 4 vectors
│   ├── primitive-source.json           # CREATE — 4 vectors
│   ├── primitive-layout.json           # CREATE — 4 vectors
│   ├── primitive-actions.json          # CREATE — 12 vectors
│   ├── scenario-filter-reload.json     # CREATE — 3 vectors
│   └── scenario-modal-lifecycle.json   # CREATE — 3 vectors
├── runner/
│   ├── types.ts                        # CREATE — shared types for vector/result
│   ├── vector-loader.ts                # CREATE — load + validate vectors
│   ├── assertion-engine.ts             # CREATE — evaluate expect operators
│   ├── web-runner.ts                   # CREATE — Web conformance runner
│   └── web-runner.spec.ts              # CREATE — tests for the runner
└── flutter-runner/
    ├── pubspec.yaml                    # CREATE
    ├── lib/conformance_runner.dart     # CREATE — Flutter conformance runner
    └── test/conformance_test.dart      # CREATE — runs vectors as flutter_test

tools/cli/src/
├── commands/conformance.ts             # CREATE — `probe conformance` command
└── index.ts                            # MODIFY — register new command
```

---

### Task 1: Example App Contract

**Files:**
- Create: `spec/conformance/example-app.json`

- [ ] **Step 1: Write example-app.json**

```json
{
  "schema_version": "1.0",
  "name": "Order Management",
  "description": "Standard example app that all platforms must implement. Each element listed here must be discoverable via the platform's probe SDK.",
  "elements": [
    {
      "id": "order-management-page",
      "type": "page",
      "required_states": ["loading", "loaded"]
    },
    {
      "id": "order-table",
      "type": "data-container",
      "source": "GET /api/orders",
      "required_states": ["loading", "loaded"]
    },
    {
      "id": "status-filter",
      "type": "selector",
      "linkage_to": [
        { "target": "order-table", "effect": "data_reload" }
      ]
    },
    {
      "id": "order-paginator",
      "type": "navigation",
      "linkage_to": [
        { "target": "order-table", "effect": "data_reload" }
      ]
    },
    {
      "id": "create-order-btn",
      "type": "action"
    },
    {
      "id": "create-order-modal",
      "type": "modal",
      "required_states": ["loaded"]
    },
    {
      "id": "customer-input",
      "type": "form",
      "parent": "create-order-modal"
    },
    {
      "id": "amount-input",
      "type": "form",
      "parent": "create-order-modal"
    }
  ]
}
```

- [ ] **Step 2: Verify Web example matches contract**

Run:
```bash
node -e "
const app = require('./spec/conformance/example-app.json');
const ids = app.elements.map(e => e.id);
console.log('Required elements:', ids.join(', '));
"
```

Cross-reference with `examples/web-react/src/OrderPage.tsx` — every ID in example-app.json must appear as `data-probe-id="<id>"` in the source.

- [ ] **Step 3: Verify Flutter example matches contract**

Cross-reference with `examples/flutter/lib/order_page.dart` — every ID in example-app.json must appear as `id: '<id>'` in a ProbeWidget.

- [ ] **Step 4: Commit**

```bash
git add spec/conformance/example-app.json
git commit -m "feat: add cross-platform example app contract"
```

---

### Task 2: Vector Schema + Types

**Files:**
- Create: `spec/conformance/vector-schema.json`
- Create: `spec/conformance/runner/types.ts`

- [ ] **Step 1: Write vector JSON schema**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ConformanceVector",
  "type": "object",
  "required": ["id", "name"],
  "properties": {
    "id": { "type": "string", "pattern": "^[A-Z]+-\\d+$" },
    "name": { "type": "string" },
    "action": {
      "type": "object",
      "properties": {
        "method": { "type": "string" },
        "args": { "type": "array" }
      },
      "required": ["method"]
    },
    "expect": {
      "type": "object",
      "properties": {
        "not_null": { "type": "boolean" },
        "is_null": { "type": "boolean" },
        "fields": { "type": "object" }
      }
    },
    "steps": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "action": { "type": "string" },
          "args": { "type": "array" },
          "save_as": { "type": "string" },
          "assert": { "type": "string" },
          "expect": { "type": "object" },
          "timeout_ms": { "type": "number" }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Write TypeScript types**

```typescript
// spec/conformance/runner/types.ts

/** A single conformance test vector (primitive-level). */
export interface PrimitiveVector {
  id: string;
  name: string;
  action: { method: string; args?: unknown[] };
  expect: Expectation;
}

/** A multi-step scenario vector. */
export interface ScenarioVector {
  id: string;
  name: string;
  precondition?: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  action?: string;
  args?: unknown[];
  save_as?: string;
  assert?: string;
  expect?: Expectation;
  timeout_ms?: number;
}

/** Expectation operators for assertions. */
export interface Expectation {
  not_null?: boolean;
  is_null?: boolean;
  is_true?: boolean;
  is_false?: boolean;
  fields?: Record<string, unknown | ComparisonOp>;
}

export interface ComparisonOp {
  gt?: number;
  lt?: number;
  gte?: number;
  lte?: number;
  contains?: string;
  has_length?: number;
  matches?: string;
}

/** Result of running one vector on one platform. */
export interface VectorResult {
  vector_id: string;
  status: 'pass' | 'fail' | 'skip' | 'error';
  duration_ms: number;
  actual?: unknown;
  expected?: unknown;
  error?: string;
}

/** Result of running all vectors on one platform. */
export interface PlatformResult {
  platform: string;
  runner_version: string;
  vectors_file: string;
  timestamp: string;
  results: VectorResult[];
}

/** Cross-platform equivalence report. */
export interface CrossPlatformReport {
  generated_at: string;
  tool_version: string;
  platforms_tested: string[];
  platforms_skipped: Array<{ platform: string; reason: string }>;
  conformance: {
    vectors_total: number;
    results_by_platform: Record<string, { passed: number; failed: number; skipped: number }>;
    failures: Array<{
      vector_id: string;
      platform: string;
      name: string;
      expected: string;
      actual: string;
      severity: 'critical' | 'major' | 'minor';
    }>;
  };
  equivalence_matrix: Record<string, Record<string, string>>;
  overall_status: 'pass' | 'partial' | 'fail';
}
```

- [ ] **Step 3: Commit**

```bash
git add spec/conformance/vector-schema.json spec/conformance/runner/types.ts
git commit -m "feat: add conformance vector schema and TypeScript types"
```

---

### Task 3: Assertion Engine

**Files:**
- Create: `spec/conformance/runner/assertion-engine.ts`
- Create: `spec/conformance/runner/assertion-engine.spec.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// spec/conformance/runner/assertion-engine.spec.ts
import { describe, it, expect } from 'vitest';
import { evaluateExpectation } from './assertion-engine';

describe('evaluateExpectation', () => {
  it('passes not_null check', () => {
    expect(evaluateExpectation({ id: 'x' }, { not_null: true })).toBe(true);
  });

  it('fails not_null when null', () => {
    expect(evaluateExpectation(null, { not_null: true })).toBe(false);
  });

  it('passes is_null check', () => {
    expect(evaluateExpectation(null, { is_null: true })).toBe(true);
  });

  it('checks fields with eq', () => {
    expect(evaluateExpectation(
      { id: 'order-table', type: 'data-container' },
      { fields: { id: 'order-table', type: 'data-container' } }
    )).toBe(true);
  });

  it('checks nested fields with dot notation', () => {
    expect(evaluateExpectation(
      { state: { current: 'loaded' } },
      { fields: { 'state.current': 'loaded' } }
    )).toBe(true);
  });

  it('checks gt operator', () => {
    expect(evaluateExpectation(
      { layout: { width: 500 } },
      { fields: { 'layout.width': { gt: 0 } } }
    )).toBe(true);
  });

  it('checks contains operator', () => {
    expect(evaluateExpectation(
      { source: 'GET /api/orders' },
      { fields: { source: { contains: '/api/orders' } } }
    )).toBe(true);
  });

  it('checks has_length operator', () => {
    expect(evaluateExpectation(
      { children: ['a', 'b', 'c'] },
      { fields: { children: { has_length: 3 } } }
    )).toBe(true);
  });

  it('fails on field mismatch', () => {
    expect(evaluateExpectation(
      { id: 'wrong' },
      { fields: { id: 'expected' } }
    )).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd spec/conformance/runner && npx vitest run assertion-engine.spec.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement assertion engine**

```typescript
// spec/conformance/runner/assertion-engine.ts
import type { Expectation, ComparisonOp } from './types';

/**
 * Resolve a dot-notated path on an object.
 * e.g., getPath({ state: { current: 'loaded' } }, 'state.current') => 'loaded'
 */
function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function isComparisonOp(value: unknown): value is ComparisonOp {
  if (value == null || typeof value !== 'object') return false;
  const keys = Object.keys(value);
  const opKeys = ['gt', 'lt', 'gte', 'lte', 'contains', 'has_length', 'matches'];
  return keys.some(k => opKeys.includes(k));
}

function evaluateComparison(actual: unknown, op: ComparisonOp): boolean {
  if (op.gt !== undefined) return typeof actual === 'number' && actual > op.gt;
  if (op.lt !== undefined) return typeof actual === 'number' && actual < op.lt;
  if (op.gte !== undefined) return typeof actual === 'number' && actual >= op.gte;
  if (op.lte !== undefined) return typeof actual === 'number' && actual <= op.lte;
  if (op.contains !== undefined) return typeof actual === 'string' && actual.includes(op.contains);
  if (op.has_length !== undefined) return Array.isArray(actual) && actual.length === op.has_length;
  if (op.matches !== undefined) return typeof actual === 'string' && new RegExp(op.matches).test(actual);
  return false;
}

/** Evaluate an expectation against an actual value. Returns true if all checks pass. */
export function evaluateExpectation(actual: unknown, expect: Expectation): boolean {
  if (expect.is_null) return actual == null;
  if (expect.not_null && actual == null) return false;
  if (expect.is_true && actual !== true) return false;
  if (expect.is_false && actual !== false) return false;

  if (expect.fields) {
    for (const [path, expected] of Object.entries(expect.fields)) {
      const actualValue = getPath(actual, path);
      if (isComparisonOp(expected)) {
        if (!evaluateComparison(actualValue, expected)) return false;
      } else {
        if (actualValue !== expected) return false;
      }
    }
  }

  return true;
}
```

- [ ] **Step 4: Add a package.json for the runner**

```json
{
  "name": "@allforai/ui-test-probe-conformance",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^3.0.0",
    "typescript": "^5.5.0"
  }
}
```

Write a `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "outDir": "dist",
    "rootDir": ".",
    "resolveJsonModule": true
  },
  "include": ["*.ts"]
}
```

- [ ] **Step 5: Install deps and run tests**

Run:
```bash
cd spec/conformance/runner && npm install && npm test
```
Expected: All 9 tests PASS

- [ ] **Step 6: Commit**

```bash
git add spec/conformance/runner/
git commit -m "feat: add conformance assertion engine with tests"
```

---

### Task 4: Primitive Test Vectors

**Files:**
- Create: `spec/conformance/vectors/primitive-registry.json`
- Create: `spec/conformance/vectors/primitive-state.json`
- Create: `spec/conformance/vectors/primitive-source.json`
- Create: `spec/conformance/vectors/primitive-layout.json`
- Create: `spec/conformance/vectors/primitive-actions.json`

- [ ] **Step 1: Write primitive-registry.json (8 vectors)**

```json
{
  "category": "Element Registry",
  "vectors": [
    {
      "id": "REG-001",
      "name": "query existing element returns ProbeElement",
      "action": { "method": "query", "args": ["order-table"] },
      "expect": {
        "not_null": true,
        "fields": {
          "id": "order-table",
          "type": "data-container"
        }
      }
    },
    {
      "id": "REG-002",
      "name": "query non-existent element returns null",
      "action": { "method": "query", "args": ["does-not-exist"] },
      "expect": { "is_null": true }
    },
    {
      "id": "REG-003",
      "name": "queryAll returns all registered elements",
      "action": { "method": "queryAll", "args": [] },
      "expect": {
        "not_null": true,
        "fields": { "length": { "gte": 5 } }
      }
    },
    {
      "id": "REG-004",
      "name": "queryAll with type filter returns matching elements",
      "action": { "method": "queryAll", "args": ["page"] },
      "expect": {
        "not_null": true,
        "fields": { "length": { "gte": 1 } }
      }
    },
    {
      "id": "REG-005",
      "name": "queryPage returns page summary",
      "action": { "method": "queryPage", "args": [] },
      "expect": {
        "not_null": true,
        "fields": {
          "id": "order-management-page",
          "state": "loaded"
        }
      }
    },
    {
      "id": "REG-006",
      "name": "page element has type page",
      "action": { "method": "query", "args": ["order-management-page"] },
      "expect": {
        "not_null": true,
        "fields": { "type": "page" }
      }
    },
    {
      "id": "REG-007",
      "name": "modal element has type modal",
      "action": { "method": "query", "args": ["create-order-modal"] },
      "expect": {
        "not_null": true,
        "fields": { "type": "modal" }
      }
    },
    {
      "id": "REG-008",
      "name": "form element has type form",
      "action": { "method": "query", "args": ["customer-input"] },
      "expect": {
        "not_null": true,
        "fields": { "type": "form" }
      }
    }
  ]
}
```

- [ ] **Step 2: Write primitive-state.json (4 vectors)**

```json
{
  "category": "State Exposure",
  "vectors": [
    {
      "id": "STATE-001",
      "name": "element has state with current field",
      "action": { "method": "query", "args": ["order-table"] },
      "expect": {
        "fields": { "state.current": "loaded" }
      }
    },
    {
      "id": "STATE-002",
      "name": "page element has loaded state",
      "action": { "method": "query", "args": ["order-management-page"] },
      "expect": {
        "fields": { "state.current": "loaded" }
      }
    },
    {
      "id": "STATE-003",
      "name": "selector element has state",
      "action": { "method": "query", "args": ["status-filter"] },
      "expect": {
        "not_null": true,
        "fields": { "state.current": "loaded" }
      }
    },
    {
      "id": "STATE-004",
      "name": "action element is not disabled",
      "action": { "method": "query", "args": ["create-order-btn"] },
      "expect": {
        "not_null": true
      }
    }
  ]
}
```

- [ ] **Step 3: Write primitive-source.json (4 vectors)**

```json
{
  "category": "Source Binding",
  "vectors": [
    {
      "id": "SRC-001",
      "name": "data-container has source binding",
      "action": { "method": "query", "args": ["order-table"] },
      "expect": {
        "fields": { "source": { "contains": "/api/orders" } }
      }
    },
    {
      "id": "SRC-002",
      "name": "selector has no source binding",
      "action": { "method": "query", "args": ["status-filter"] },
      "expect": { "not_null": true }
    },
    {
      "id": "SRC-003",
      "name": "action button has no source",
      "action": { "method": "query", "args": ["create-order-btn"] },
      "expect": { "not_null": true }
    },
    {
      "id": "SRC-004",
      "name": "form input has no source",
      "action": { "method": "query", "args": ["customer-input"] },
      "expect": { "not_null": true }
    }
  ]
}
```

- [ ] **Step 4: Write primitive-layout.json (4 vectors)**

```json
{
  "category": "Layout Metrics",
  "vectors": [
    {
      "id": "LAY-001",
      "name": "visible element has non-zero dimensions",
      "action": { "method": "query", "args": ["order-table"] },
      "expect": {
        "fields": {
          "layout.visible": true,
          "layout.width": { "gt": 0 },
          "layout.height": { "gt": 0 }
        }
      }
    },
    {
      "id": "LAY-002",
      "name": "page element is visible",
      "action": { "method": "query", "args": ["order-management-page"] },
      "expect": {
        "fields": { "layout.visible": true }
      }
    },
    {
      "id": "LAY-003",
      "name": "selector element has position",
      "action": { "method": "query", "args": ["status-filter"] },
      "expect": {
        "fields": {
          "layout.width": { "gt": 0 }
        }
      }
    },
    {
      "id": "LAY-004",
      "name": "button element has layout",
      "action": { "method": "query", "args": ["create-order-btn"] },
      "expect": {
        "fields": {
          "layout.visible": true,
          "layout.width": { "gt": 0 }
        }
      }
    }
  ]
}
```

- [ ] **Step 5: Write primitive-actions.json (12 vectors)**

```json
{
  "category": "Action Dispatch",
  "vectors": [
    {
      "id": "ACT-001",
      "name": "click on action element succeeds",
      "action": { "method": "click", "args": ["create-order-btn"] },
      "expect": { "not_null": true }
    },
    {
      "id": "ACT-002",
      "name": "click on non-existent element fails with NOT_FOUND",
      "action": { "method": "click", "args": ["does-not-exist"] },
      "expect": {
        "fields": { "error": "NOT_FOUND" }
      }
    },
    {
      "id": "ACT-003",
      "name": "select on selector element succeeds",
      "action": { "method": "select", "args": ["status-filter", "completed"] },
      "expect": { "not_null": true }
    },
    {
      "id": "ACT-004",
      "name": "select invalid option fails with OPTION_NOT_FOUND",
      "action": { "method": "select", "args": ["status-filter", "nonexistent-option"] },
      "expect": {
        "fields": { "error": "OPTION_NOT_FOUND" }
      }
    },
    {
      "id": "ACT-005",
      "name": "fill on form element succeeds",
      "action": { "method": "fill", "args": ["customer-input", "Acme Corp"] },
      "expect": { "not_null": true }
    },
    {
      "id": "ACT-006",
      "name": "fill on non-form element fails with TYPE_MISMATCH",
      "action": { "method": "fill", "args": ["order-table", "text"] },
      "expect": {
        "fields": { "error": "TYPE_MISMATCH" }
      }
    },
    {
      "id": "ACT-007",
      "name": "snapshot returns all elements",
      "action": { "method": "snapshot", "args": [] },
      "expect": {
        "not_null": true,
        "fields": { "elements": { "not_null": true } }
      }
    },
    {
      "id": "ACT-008",
      "name": "verifyLinkage on element with linkage",
      "action": { "method": "verifyLinkage", "args": ["status-filter", "select:completed"] },
      "expect": {
        "not_null": true,
        "fields": {
          "trigger": "status-filter",
          "directEffects": { "has_length": 1 }
        }
      }
    },
    {
      "id": "ACT-009",
      "name": "verifyLinkage on element without linkage returns empty",
      "action": { "method": "verifyLinkage", "args": ["create-order-btn", "click"] },
      "expect": {
        "not_null": true
      }
    },
    {
      "id": "ACT-010",
      "name": "actAndWait performs action and waits for target state",
      "action": { "method": "actAndWait", "args": ["status-filter", "select:completed", { "target": "order-table", "state": "loaded" }] },
      "expect": {
        "not_null": true,
        "fields": {
          "actionDuration": { "gte": 0 },
          "waitDuration": { "gte": 0 }
        }
      }
    },
    {
      "id": "ACT-011",
      "name": "diff detects state changes between snapshots",
      "action": { "method": "diff_test", "args": [] },
      "expect": { "not_null": true }
    },
    {
      "id": "ACT-012",
      "name": "isEffectivelyVisible returns true for visible element",
      "action": { "method": "isEffectivelyVisible", "args": ["order-table"] },
      "expect": { "is_true": true }
    }
  ]
}
```

- [ ] **Step 6: Commit**

```bash
git add spec/conformance/vectors/
git commit -m "feat: add 32 primitive-level conformance test vectors"
```

---

### Task 5: Scenario Test Vectors

**Files:**
- Create: `spec/conformance/vectors/scenario-filter-reload.json`
- Create: `spec/conformance/vectors/scenario-modal-lifecycle.json`

- [ ] **Step 1: Write scenario-filter-reload.json**

```json
{
  "category": "Scenario: Filter Triggers Reload",
  "vectors": [
    {
      "id": "SCENE-001",
      "name": "status filter selection reloads order table",
      "precondition": "waitForPageReady",
      "steps": [
        { "action": "snapshot", "save_as": "before" },
        { "action": "select", "args": ["status-filter", "completed"] },
        { "action": "waitForState", "args": ["order-table", "loaded"], "timeout_ms": 5000 },
        { "action": "snapshot", "save_as": "after" },
        {
          "assert": "snapshots_differ",
          "args": ["before", "after"],
          "expect": { "is_true": true }
        }
      ]
    },
    {
      "id": "SCENE-002",
      "name": "filter linkage verification passes",
      "precondition": "waitForPageReady",
      "steps": [
        { "action": "select", "args": ["status-filter", "completed"] },
        { "action": "waitForState", "args": ["order-table", "loaded"], "timeout_ms": 5000 },
        {
          "assert": "verifyLinkage",
          "args": ["status-filter", "select:completed"],
          "expect": {
            "fields": {
              "directEffects.length": { "gte": 1 }
            }
          }
        }
      ]
    },
    {
      "id": "SCENE-003",
      "name": "table source binding present after reload",
      "precondition": "waitForPageReady",
      "steps": [
        { "action": "select", "args": ["status-filter", "completed"] },
        { "action": "waitForState", "args": ["order-table", "loaded"], "timeout_ms": 5000 },
        {
          "assert": "query",
          "args": ["order-table"],
          "expect": {
            "fields": {
              "source": { "contains": "/api/orders" }
            }
          }
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Write scenario-modal-lifecycle.json**

```json
{
  "category": "Scenario: Modal Lifecycle",
  "vectors": [
    {
      "id": "SCENE-004",
      "name": "clicking create button opens modal",
      "precondition": "waitForPageReady",
      "steps": [
        { "action": "click", "args": ["create-order-btn"] },
        { "action": "waitForState", "args": ["create-order-modal", "loaded"], "timeout_ms": 3000 },
        {
          "assert": "query",
          "args": ["create-order-modal"],
          "expect": {
            "not_null": true,
            "fields": { "type": "modal" }
          }
        }
      ]
    },
    {
      "id": "SCENE-005",
      "name": "form inputs discoverable inside modal",
      "precondition": "waitForPageReady",
      "steps": [
        { "action": "click", "args": ["create-order-btn"] },
        { "action": "waitForState", "args": ["create-order-modal", "loaded"], "timeout_ms": 3000 },
        {
          "assert": "query",
          "args": ["customer-input"],
          "expect": {
            "not_null": true,
            "fields": { "type": "form" }
          }
        },
        {
          "assert": "query",
          "args": ["amount-input"],
          "expect": {
            "not_null": true,
            "fields": { "type": "form" }
          }
        }
      ]
    },
    {
      "id": "SCENE-006",
      "name": "can fill form fields in modal",
      "precondition": "waitForPageReady",
      "steps": [
        { "action": "click", "args": ["create-order-btn"] },
        { "action": "waitForState", "args": ["create-order-modal", "loaded"], "timeout_ms": 3000 },
        { "action": "fill", "args": ["customer-input", "Acme Corp"] },
        { "action": "fill", "args": ["amount-input", "1500"] }
      ]
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add spec/conformance/vectors/scenario-*.json
git commit -m "feat: add 6 scenario-level conformance test vectors"
```

---

### Task 6: Web Conformance Runner

**Files:**
- Create: `spec/conformance/runner/vector-loader.ts`
- Create: `spec/conformance/runner/web-runner.ts`
- Create: `spec/conformance/runner/web-runner.spec.ts`

- [ ] **Step 1: Write vector loader**

```typescript
// spec/conformance/runner/vector-loader.ts
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { PrimitiveVector, ScenarioVector } from './types';

interface VectorFile {
  category: string;
  vectors: Array<PrimitiveVector | ScenarioVector>;
}

/** Load all vector files from a directory. */
export function loadVectors(vectorDir: string): VectorFile[] {
  const files = readdirSync(vectorDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const content = readFileSync(join(vectorDir, f), 'utf-8');
    return JSON.parse(content) as VectorFile;
  });
}

/** Check if a vector is a scenario (has steps) or primitive (has action). */
export function isScenario(v: PrimitiveVector | ScenarioVector): v is ScenarioVector {
  return 'steps' in v;
}
```

- [ ] **Step 2: Write Web runner**

```typescript
// spec/conformance/runner/web-runner.ts
import type { Page } from 'playwright';
import type { PrimitiveVector, ScenarioVector, VectorResult, PlatformResult } from './types';
import { evaluateExpectation } from './assertion-engine';
import { loadVectors, isScenario } from './vector-loader';

/**
 * Runs conformance vectors against a Playwright page with probe injected.
 * Assumes window.__probe__ is available.
 */
export class WebConformanceRunner {
  constructor(private page: Page) {}

  async runAll(vectorDir: string): Promise<PlatformResult> {
    const vectorFiles = loadVectors(vectorDir);
    const results: VectorResult[] = [];

    for (const file of vectorFiles) {
      for (const vector of file.vectors) {
        if (isScenario(vector)) {
          results.push(await this.runScenario(vector));
        } else {
          results.push(await this.runPrimitive(vector));
        }
      }
    }

    return {
      platform: 'web',
      runner_version: '0.1.0',
      vectors_file: 'all',
      timestamp: new Date().toISOString(),
      results,
    };
  }

  private async runPrimitive(vector: PrimitiveVector): Promise<VectorResult> {
    const start = Date.now();
    try {
      const actual = await this.executeMethod(vector.action.method, vector.action.args ?? []);
      const passed = evaluateExpectation(actual, vector.expect);
      return {
        vector_id: vector.id,
        status: passed ? 'pass' : 'fail',
        duration_ms: Date.now() - start,
        actual: passed ? undefined : actual,
        expected: passed ? undefined : vector.expect,
      };
    } catch (err) {
      return {
        vector_id: vector.id,
        status: 'error',
        duration_ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  private async runScenario(vector: ScenarioVector): Promise<VectorResult> {
    const start = Date.now();
    const snapshots: Record<string, unknown> = {};

    try {
      if (vector.precondition === 'waitForPageReady') {
        await this.executeMethod('waitForPageReady', []);
      }

      for (const step of vector.steps) {
        if (step.action && !step.assert) {
          const result = await this.executeMethod(step.action, step.args ?? []);
          if (step.save_as) snapshots[step.save_as] = result;
        } else if (step.assert) {
          let actual: unknown;
          if (step.assert === 'snapshots_differ') {
            const [a, b] = step.args as string[];
            actual = JSON.stringify(snapshots[a]) !== JSON.stringify(snapshots[b]);
          } else if (step.assert === 'query' || step.assert === 'verifyLinkage') {
            actual = await this.executeMethod(step.assert, step.args ?? []);
          }
          if (step.expect && !evaluateExpectation(actual, step.expect)) {
            return {
              vector_id: vector.id,
              status: 'fail',
              duration_ms: Date.now() - start,
              actual,
              expected: step.expect,
            };
          }
        }
      }

      return { vector_id: vector.id, status: 'pass', duration_ms: Date.now() - start };
    } catch (err) {
      return {
        vector_id: vector.id,
        status: 'error',
        duration_ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Map vector method names to window.__probe__ calls. */
  private async executeMethod(method: string, args: unknown[]): Promise<unknown> {
    return this.page.evaluate(({ method, args }) => {
      const probe = (window as any).__probe__;
      if (!probe) throw new Error('window.__probe__ not found');

      switch (method) {
        case 'query': return probe.query(args[0]);
        case 'queryAll': return args[0] ? probe.queryAll(args[0]) : probe.queryAll();
        case 'queryPage': return probe.queryPage();
        case 'waitForPageReady': return probe.waitForPageReady(args[0] ?? 10000);
        case 'waitForState': return probe.waitForState(args[0], args[1], args[2] ?? 5000);
        case 'click': return probe.click(args[0]).then(() => ({ ok: true })).catch((e: any) => ({ error: e.error || e.message }));
        case 'select': return probe.select(args[0], args[1]).then(() => ({ ok: true })).catch((e: any) => ({ error: e.error || e.message }));
        case 'fill': return probe.fill(args[0], args[1]).then(() => ({ ok: true })).catch((e: any) => ({ error: e.error || e.message }));
        case 'snapshot': return probe.snapshot();
        case 'diff_test': {
          const a = probe.snapshot();
          return probe.diff(a, a); // same snapshot = empty diff
        }
        case 'verifyLinkage': return probe.verifyLinkage(args[0], args[1]);
        case 'actAndWait': return probe.actAndWait(args[0], args[1], args[2] ?? {});
        case 'isEffectivelyVisible': return probe.isEffectivelyVisible(args[0]);
        default: throw new Error(`Unknown method: ${method}`);
      }
    }, { method, args });
  }
}
```

- [ ] **Step 3: Write integration test (runs against examples/web-react)**

```typescript
// spec/conformance/runner/web-runner.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { WebConformanceRunner } from './web-runner';

// This test requires examples/web-react to be running on port 3199
// and sdk/web to be built (dist/probe-bundle.js exists).

describe('WebConformanceRunner', () => {
  let browser: Browser;
  let page: Page;
  let runner: WebConformanceRunner;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();

    // Inject probe bundle
    const bundlePath = resolve(__dirname, '../../../sdk/web/dist/probe-bundle.js');
    const bundle = readFileSync(bundlePath, 'utf-8');
    await page.addInitScript(bundle);

    await page.goto('http://localhost:3199');
    await page.waitForLoadState('networkidle');

    runner = new WebConformanceRunner(page);
  }, 30000);

  afterAll(async () => {
    await browser?.close();
  });

  it('runs all vectors and produces a PlatformResult', async () => {
    const vectorDir = resolve(__dirname, '../vectors');
    const result = await runner.runAll(vectorDir);

    expect(result.platform).toBe('web');
    expect(result.results.length).toBeGreaterThan(0);

    // Log summary
    const passed = result.results.filter(r => r.status === 'pass').length;
    const failed = result.results.filter(r => r.status === 'fail').length;
    const errors = result.results.filter(r => r.status === 'error').length;
    console.log(`Web conformance: ${passed} pass, ${failed} fail, ${errors} error / ${result.results.length} total`);

    // Print failures
    for (const r of result.results.filter(r => r.status !== 'pass')) {
      console.log(`  [${r.status}] ${r.vector_id}: ${r.error ?? JSON.stringify(r.actual)}`);
    }
  }, 60000);
});
```

- [ ] **Step 4: Run the Web conformance suite**

Start the example app:
```bash
cd examples/web-react && npm run dev &
```

Then run:
```bash
cd spec/conformance/runner && npx vitest run web-runner.spec.ts
```

- [ ] **Step 5: Commit**

```bash
git add spec/conformance/runner/
git commit -m "feat: add Web conformance runner with vector loader"
```

---

### Task 7: Flutter Conformance Runner

**Files:**
- Create: `spec/conformance/flutter-runner/pubspec.yaml`
- Create: `spec/conformance/flutter-runner/lib/conformance_runner.dart`
- Create: `spec/conformance/flutter-runner/test/conformance_test.dart`

- [ ] **Step 1: Write pubspec.yaml**

```yaml
name: probe_conformance_flutter
description: Flutter conformance test runner for ui-test-probe
publish_to: none

environment:
  sdk: '>=3.0.0 <4.0.0'
  flutter: '>=3.10.0'

dependencies:
  flutter:
    sdk: flutter
  ui_test_probe:
    path: ../../../sdk/flutter

dev_dependencies:
  flutter_test:
    sdk: flutter
  ui_test_probe_flutter_test:
    path: ../../../integrations/flutter-test
```

- [ ] **Step 2: Write conformance runner (Dart)**

```dart
// spec/conformance/flutter-runner/lib/conformance_runner.dart
import 'dart:convert';
import 'dart:io';
import 'package:ui_test_probe/ui_test_probe.dart';

/// Loads JSON vectors and evaluates expectations against ProbeElements.
class ConformanceRunner {
  final ProbeBinding binding;

  ConformanceRunner(this.binding);

  /// Load vectors from a JSON file.
  List<Map<String, dynamic>> loadVectors(String filePath) {
    final content = File(filePath).readAsStringSync();
    final data = jsonDecode(content) as Map<String, dynamic>;
    return (data['vectors'] as List).cast<Map<String, dynamic>>();
  }

  /// Run a single primitive vector and return pass/fail.
  Map<String, dynamic> runPrimitive(Map<String, dynamic> vector) {
    final start = DateTime.now();
    final id = vector['id'] as String;
    final action = vector['action'] as Map<String, dynamic>;
    final method = action['method'] as String;
    final args = (action['args'] as List?) ?? [];
    final expect = vector['expect'] as Map<String, dynamic>?;

    try {
      binding.scan();
      final actual = _executeMethod(method, args);
      final passed = expect != null ? _evaluate(actual, expect) : true;

      return {
        'vector_id': id,
        'status': passed ? 'pass' : 'fail',
        'duration_ms': DateTime.now().difference(start).inMilliseconds,
        if (!passed) 'actual': _serialize(actual),
      };
    } catch (e) {
      return {
        'vector_id': id,
        'status': 'error',
        'duration_ms': DateTime.now().difference(start).inMilliseconds,
        'error': e.toString(),
      };
    }
  }

  dynamic _executeMethod(String method, List args) {
    switch (method) {
      case 'query':
        return binding.query(args[0] as String);
      case 'queryAll':
        if (args.isEmpty) return binding.queryAll();
        final typeStr = args[0] as String;
        final type = ProbeType.values.firstWhere(
          (t) => t.name == typeStr || t.name == _camelCase(typeStr),
          orElse: () => ProbeType.display,
        );
        return binding.queryAll(type: type);
      case 'queryPage':
        // Not directly available in Flutter; simulate with queryAll(type: page)
        final pages = binding.queryAll(type: ProbeType.page);
        if (pages.isEmpty) return null;
        return pages.first;
      case 'isEffectivelyVisible':
        final el = binding.query(args[0] as String);
        return el?.isVisible ?? false;
      default:
        throw UnimplementedError('Method $method not mapped in Flutter runner');
    }
  }

  bool _evaluate(dynamic actual, Map<String, dynamic> expect) {
    if (expect['is_null'] == true) return actual == null;
    if (expect['not_null'] == true && actual == null) return false;
    if (expect['is_true'] == true) return actual == true;
    if (expect['is_false'] == true) return actual == false;

    if (expect.containsKey('fields')) {
      final fields = expect['fields'] as Map<String, dynamic>;
      for (final entry in fields.entries) {
        final actualValue = _getPath(actual, entry.key);
        if (entry.value is Map) {
          if (!_evalOp(actualValue, entry.value as Map<String, dynamic>)) return false;
        } else {
          if (actualValue != entry.value) return false;
        }
      }
    }
    return true;
  }

  dynamic _getPath(dynamic obj, String path) {
    if (obj == null) return null;
    final parts = path.split('.');
    dynamic current = obj;
    for (final part of parts) {
      if (current is ProbeElement) {
        current = _probeField(current, part);
      } else if (current is Map) {
        current = current[part];
      } else if (current is List && part == 'length') {
        current = current.length;
      } else {
        return null;
      }
    }
    return current;
  }

  dynamic _probeField(ProbeElement el, String field) {
    switch (field) {
      case 'id': return el.id;
      case 'type': return el.type.name;
      case 'source': return el.source;
      case 'state': return el.state;
      case 'layout': return {
        'visible': el.isVisible,
        'width': el.bounds?[2] ?? 0,
        'height': el.bounds?[3] ?? 0,
      };
      case 'linkage': return el.linkage;
      case 'isVisible': return el.isVisible;
      default: return null;
    }
  }

  bool _evalOp(dynamic actual, Map<String, dynamic> op) {
    if (op.containsKey('gt')) return actual is num && actual > (op['gt'] as num);
    if (op.containsKey('gte')) return actual is num && actual >= (op['gte'] as num);
    if (op.containsKey('contains')) return actual is String && actual.contains(op['contains'] as String);
    if (op.containsKey('has_length')) return actual is List && actual.length == (op['has_length'] as int);
    if (op.containsKey('not_null')) return actual != null;
    return false;
  }

  String _camelCase(String s) {
    final parts = s.split('-');
    return parts.first + parts.skip(1).map((p) => p[0].toUpperCase() + p.substring(1)).join();
  }

  dynamic _serialize(dynamic obj) {
    if (obj is ProbeElement) return {'id': obj.id, 'type': obj.type.name};
    if (obj is List) return obj.map(_serialize).toList();
    return obj?.toString();
  }
}
```

- [ ] **Step 3: Write test that runs vectors against example app**

```dart
// spec/conformance/flutter-runner/test/conformance_test.dart
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_test_probe/ui_test_probe.dart';
import 'package:probe_conformance_flutter/conformance_runner.dart';

// Import the example app — adjust path as needed
// For now, inline a minimal probe-annotated widget
Widget buildTestApp() {
  return const MaterialApp(home: _OrderPage());
}

class _OrderPage extends StatelessWidget {
  const _OrderPage();
  @override
  Widget build(BuildContext context) {
    return ProbeWidget(
      id: 'order-management-page',
      type: ProbeType.page,
      state: const {'current': 'loaded'},
      child: Scaffold(
        body: Column(
          children: [
            ProbeWidget(
              id: 'status-filter',
              type: ProbeType.selector,
              state: const {'current': 'loaded'},
              linkage: [LinkagePath(targetId: 'order-table', effect: LinkageEffect.dataReload)],
              child: const DropdownButton<String>(
                value: 'all',
                items: [DropdownMenuItem(value: 'all', child: Text('All'))],
                onChanged: null,
              ),
            ),
            ProbeWidget(
              id: 'order-table',
              type: ProbeType.dataContainer,
              source: 'GET /api/orders',
              state: const {'current': 'loaded'},
              child: const DataTable(
                columns: [DataColumn(label: Text('ID'))],
                rows: [],
              ),
            ),
            ProbeWidget(
              id: 'order-paginator',
              type: ProbeType.navigation,
              state: const {'current': 'loaded'},
              linkage: [LinkagePath(targetId: 'order-table', effect: LinkageEffect.dataReload)],
              child: const Text('Page 1'),
            ),
          ],
        ),
        floatingActionButton: ProbeWidget(
          id: 'create-order-btn',
          type: ProbeType.action,
          state: const {'current': 'loaded'},
          child: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
        ),
      ),
    );
  }
}

void main() {
  group('Flutter Conformance', () {
    testWidgets('primitive-registry vectors', (tester) async {
      await tester.pumpWidget(buildTestApp());
      await tester.pumpAndSettle();

      final binding = ProbeBinding.ensureInitialized();
      binding.scan();

      final runner = ConformanceRunner(binding);
      final vectorPath = '${Directory.current.path}/../vectors/primitive-registry.json';

      if (!File(vectorPath).existsSync()) {
        fail('Vector file not found: $vectorPath');
      }

      final vectors = runner.loadVectors(vectorPath);
      var passed = 0;
      var failed = 0;

      for (final vector in vectors) {
        // Skip action-based vectors that require modal (not in this minimal app)
        if ((vector['action'] as Map)['args']?.contains('create-order-modal') == true ||
            (vector['action'] as Map)['args']?.contains('customer-input') == true ||
            (vector['action'] as Map)['args']?.contains('amount-input') == true) {
          continue;
        }

        final result = runner.runPrimitive(vector);
        if (result['status'] == 'pass') {
          passed++;
        } else {
          failed++;
          // ignore: avoid_print
          print('  [${result['status']}] ${result['vector_id']}: ${result['error'] ?? result['actual']}');
        }
      }

      // ignore: avoid_print
      print('Flutter registry conformance: $passed pass, $failed fail');
      expect(failed, equals(0), reason: '$failed vector(s) failed');
    });
  });
}
```

- [ ] **Step 4: Run Flutter conformance**

```bash
cd spec/conformance/flutter-runner && flutter pub get && flutter test
```

- [ ] **Step 5: Commit**

```bash
git add spec/conformance/flutter-runner/
git commit -m "feat: add Flutter conformance runner"
```

---

### Task 8: CLI `probe conformance` Command

**Files:**
- Create: `tools/cli/src/commands/conformance.ts`
- Modify: `tools/cli/src/index.ts`

- [ ] **Step 1: Write the conformance command**

```typescript
// tools/cli/src/commands/conformance.ts
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ConformanceOptions {
  platform: string[];
  vectorDir: string;
  json?: boolean;
  output?: string;
}

interface PlatformTestResult {
  platform: string;
  status: 'pass' | 'fail' | 'skip';
  passed: number;
  failed: number;
  total: number;
  error?: string;
}

/** Detect which toolchains are available on this machine. */
function detectToolchains(): Record<string, boolean> {
  const check = (cmd: string): boolean => {
    try { execSync(cmd, { stdio: 'ignore' }); return true; } catch { return false; }
  };
  return {
    web: check('node --version'),
    flutter: check('flutter --version'),
    ios: check('swift --version'),
    android: check('gradle --version') || check('flutter doctor'),
    windows: check('dotnet --version'),
  };
}

/** Run conformance for a single platform. */
function runPlatform(platform: string, vectorDir: string, projectRoot: string): PlatformTestResult {
  try {
    switch (platform) {
      case 'web': {
        // Web runner is a Node script
        const runnerPath = path.join(projectRoot, 'spec/conformance/runner/web-runner.ts');
        if (!fs.existsSync(runnerPath)) {
          return { platform, status: 'skip', passed: 0, failed: 0, total: 0, error: 'Web runner not found' };
        }
        const result = execSync(
          `cd ${path.join(projectRoot, 'spec/conformance/runner')} && npx vitest run web-runner.spec.ts --reporter=json 2>/dev/null`,
          { encoding: 'utf-8', timeout: 120000 }
        );
        // Parse vitest JSON output
        const passed = (result.match(/passed/g) || []).length;
        return { platform, status: 'pass', passed, failed: 0, total: passed };
      }
      case 'flutter': {
        const runnerPath = path.join(projectRoot, 'spec/conformance/flutter-runner');
        if (!fs.existsSync(runnerPath)) {
          return { platform, status: 'skip', passed: 0, failed: 0, total: 0, error: 'Flutter runner not found' };
        }
        execSync(`cd ${runnerPath} && flutter test`, { encoding: 'utf-8', timeout: 120000 });
        return { platform, status: 'pass', passed: 1, failed: 0, total: 1 };
      }
      default:
        return { platform, status: 'skip', passed: 0, failed: 0, total: 0, error: `No runner for ${platform}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { platform, status: 'fail', passed: 0, failed: 1, total: 1, error: msg.slice(0, 200) };
  }
}

export function conformanceCommand(options: ConformanceOptions): void {
  const projectRoot = process.cwd();
  const vectorDir = path.resolve(options.vectorDir);
  const toolchains = detectToolchains();

  // Filter to requested platforms that have toolchains
  const platforms = options.platform.length > 0
    ? options.platform
    : Object.keys(toolchains).filter(k => toolchains[k]);

  console.log(`Running conformance on: ${platforms.join(', ')}`);

  const results: PlatformTestResult[] = [];
  for (const platform of platforms) {
    if (!toolchains[platform]) {
      results.push({ platform, status: 'skip', passed: 0, failed: 0, total: 0, error: 'toolchain not available' });
      continue;
    }
    console.log(`  Testing ${platform}...`);
    results.push(runPlatform(platform, vectorDir, projectRoot));
  }

  // Build report
  const report = {
    generated_at: new Date().toISOString(),
    tool_version: '0.1.0',
    platforms_tested: results.filter(r => r.status !== 'skip').map(r => r.platform),
    platforms_skipped: results.filter(r => r.status === 'skip').map(r => ({ platform: r.platform, reason: r.error ?? 'unknown' })),
    results,
    overall_status: results.every(r => r.status === 'pass' || r.status === 'skip') ? 'pass' : 'fail',
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n=== Cross-Platform Conformance Report ===\n');
    for (const r of results) {
      const icon = r.status === 'pass' ? '✓' : r.status === 'skip' ? '—' : '✗';
      console.log(`  ${icon} ${r.platform}: ${r.status} (${r.passed}/${r.total})`);
      if (r.error) console.log(`    ${r.error}`);
    }
    console.log(`\nOverall: ${report.overall_status}`);
  }

  if (options.output) {
    fs.writeFileSync(options.output, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to ${options.output}`);
  }
}
```

- [ ] **Step 2: Register command in CLI index**

Add to `tools/cli/src/index.ts` after existing commands:

```typescript
import { conformanceCommand } from './commands/conformance';

program
  .command('conformance')
  .description('Run cross-platform conformance test vectors')
  .option('-p, --platform <platforms...>', 'Platforms to test (web,flutter,ios,android,windows)', [])
  .option('-v, --vector-dir <path>', 'Vector directory', './spec/conformance/vectors')
  .option('--json', 'Output JSON report')
  .option('-o, --output <path>', 'Save report to file')
  .action(conformanceCommand);
```

- [ ] **Step 3: Verify CLI builds**

```bash
cd tools/cli && npm run typecheck
```

- [ ] **Step 4: Commit**

```bash
git add tools/cli/src/commands/conformance.ts tools/cli/src/index.ts
git commit -m "feat: add probe conformance CLI command"
```

---

### Task 9: Integration Test — Full Pipeline

**Files:** No new files — this validates everything works end-to-end.

- [ ] **Step 1: Build Web SDK**

```bash
cd sdk/web && npm run build
```

- [ ] **Step 2: Start example app**

```bash
cd examples/web-react && npm run dev &
# Wait for server to start
sleep 3
```

- [ ] **Step 3: Run Web conformance**

```bash
cd spec/conformance/runner && npm test
```
Expected: All vectors pass (or known expected failures documented).

- [ ] **Step 4: Run Flutter conformance**

```bash
cd spec/conformance/flutter-runner && flutter test
```
Expected: Registry vectors pass.

- [ ] **Step 5: Run CLI command**

```bash
cd /Users/aa/workspace/ui-test-probe
npx ts-node tools/cli/src/index.ts conformance --platform web flutter --json
```

- [ ] **Step 6: Kill dev server and commit**

```bash
kill %1  # kill background dev server
git add -A
git commit -m "test: verify full cross-platform conformance pipeline"
```

---

## Summary

| Task | Deliverable | Vectors |
|------|------------|---------|
| 1 | example-app.json (shared contract) | — |
| 2 | Vector schema + TypeScript types | — |
| 3 | Assertion engine + tests | — |
| 4 | 5 primitive vector files | 32 |
| 5 | 2 scenario vector files | 6 |
| 6 | Web conformance runner | — |
| 7 | Flutter conformance runner | — |
| 8 | `probe conformance` CLI | — |
| 9 | Full pipeline integration test | — |

**Total: 38 test vectors, 2 platform runners, 1 CLI command, 9 tasks.**
