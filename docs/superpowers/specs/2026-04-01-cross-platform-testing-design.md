# Cross-Platform Testing Design

> Date: 2026-04-01
> Status: Approved
> Scope: Conformance test framework + per-platform E2E + unified reporting

## Problem

ui-test-probe is a cross-platform UI test observability SDK spanning 7 platforms (Web, Flutter, iOS, Android, WPF, WinForms, WinUI). Each platform has its own SDK implementation that must produce semantically equivalent results for the same annotated UI. Currently there is no mechanism to verify cross-platform consistency — each platform is tested in isolation with no shared contract.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Test strategy | Conformance + E2E (both) | Conformance ensures cross-platform equivalence; E2E covers platform-specific edge cases |
| Conformance granularity | Primitive-level + scenario-level | Primitive-level localizes failures; scenario-level validates composition |
| Example app consistency | Shared spec file (`example-app.json`) | Lightweight contract; each platform implements freely but must include all defined elements |
| Execution strategy | CLI local + CI matrix | Local for dev speed; CI for full coverage |

## Architecture: Three-Layer Test Pyramid

```
┌─────────────────────────────────────────────┐
│  Layer 3: Cross-Platform Equivalence Report  │  Aggregation
├─────────────────────────────────────────────┤
│  Layer 2: Per-Platform E2E Tests             │  Depth (platform-specific edges)
├─────────────────────────────────────────────┤
│  Layer 1: Conformance Test Vectors           │  Consistency gate
└─────────────────────────────────────────────┘
```

## Layer 1: Conformance Tests

### File Structure

```
spec/conformance/
├── example-app.json              # What the example app must contain
├── vectors/
│   ├── primitive-registry.json   # query, queryAll, queryPage
│   ├── primitive-state.json      # getState, getStates, waitForState
│   ├── primitive-events.json     # waitForPageReady, onStateChange
│   ├── primitive-source.json     # getSource, getNetworkLog, waitForSource
│   ├── primitive-layout.json     # getLayout, getOverlaps, getScrollPosition
│   ├── primitive-actions.json    # click, fill, select + pre-check errors
│   ├── scenario-filter-reload.json
│   ├── scenario-modal-lifecycle.json
│   ├── scenario-pagination.json
│   └── scenario-linkage-chain.json
└── runner/
    ├── conformance-runner.ts     # Web
    ├── conformance-runner.dart   # Flutter
    ├── ConformanceRunner.swift   # iOS
    ├── ConformanceRunner.kt      # Android
    └── ConformanceRunner.cs      # Windows
```

### example-app.json

Defines the contract for what every platform's example app must contain. Each platform's example is free to implement the UI however it wants, but must register these probe elements with these IDs, types, and linkages.

```json
{
  "schema_version": "1.0",
  "name": "Order Management",
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
      "required_states": ["loading", "loaded"],
      "linkage_from": ["status-filter", "order-paginator"]
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

### Test Vector Format

#### Primitive-level vectors

Each vector tests one API method with one input and one expected output.

```json
{
  "id": "REG-001",
  "name": "query existing element returns correct structure",
  "action": { "method": "query", "args": ["order-table"] },
  "expect": {
    "not_null": true,
    "fields": {
      "id": "order-table",
      "type": "data-container",
      "state.current": "loaded",
      "layout.visible": true,
      "layout.width": { "gt": 0 },
      "layout.height": { "gt": 0 }
    }
  }
}
```

Expect operators: `eq` (default), `gt`, `lt`, `gte`, `lte`, `contains`, `not_null`, `is_null`, `is_true`, `is_false`, `has_length`, `matches` (regex).

#### Scenario-level vectors

Each vector is a sequence of actions + assertions that validate cross-primitive behavior.

```json
{
  "id": "SCENE-001",
  "name": "status filter triggers table reload via linkage",
  "precondition": "waitForPageReady",
  "steps": [
    { "action": "snapshot", "save_as": "before" },
    { "action": "select", "args": ["status-filter", "completed"] },
    { "action": "waitForState", "args": ["order-table", "loaded"], "timeout_ms": 5000 },
    { "action": "snapshot", "save_as": "after" },
    {
      "assert": "diff_contains_change",
      "args": ["before", "after", "order-table"]
    },
    {
      "assert": "verifyLinkage",
      "args": ["status-filter", "select:completed"],
      "expect": {
        "directEffects[0].target": "order-table",
        "directEffects[0].result": "pass"
      }
    }
  ]
}
```

### Conformance Runner Contract

Each platform implements a runner that:
1. Reads vector JSON files
2. Maps `action.method` to the platform's SDK method
3. Executes and collects results
4. Outputs standardized result JSON:

```json
{
  "platform": "flutter",
  "runner_version": "0.1.0",
  "vectors_file": "primitive-registry.json",
  "results": [
    {
      "vector_id": "REG-001",
      "status": "pass",
      "duration_ms": 12,
      "actual": { "id": "order-table", "type": "data-container" }
    },
    {
      "vector_id": "REG-002",
      "status": "fail",
      "duration_ms": 5,
      "expected": { "is_null": true },
      "actual": "non-null value returned",
      "error": "query('does-not-exist') returned stale cached element"
    }
  ]
}
```

### Method Mapping Table

Each runner maps vector action names to platform-specific calls:

| Vector action | Web (TS) | Flutter (Dart) | iOS (Swift) | Android (Kotlin) | Windows (C#) |
|--------------|----------|----------------|-------------|-------------------|--------------|
| `query` | `probe.query(id)` | `binding.query(id)` | `registry.query(id)` | `registry.query(id)` | `registry.Query(id)` |
| `queryAll` | `probe.queryAll(type)` | `binding.queryAll(type:)` | `registry.queryAll(type:)` | `registry.queryAll(type)` | `registry.QueryAll(type)` |
| `waitForState` | `probe.waitForState(id, state)` | `binding.waitForState(id, stateKey:, stateValue:)` | `registry.waitForState(id, state:)` | `registry.waitForState(id, state)` | TBD |
| `select` | `probe.select(id, value)` | `dispatcher.select(id, value)` | `dispatcher.select(id, value:)` | `dispatcher.select(id, value)` | `dispatcher.Select(id, value)` |
| `click` | `probe.click(id)` | `dispatcher.tap(id)` | `dispatcher.tap(id)` | `dispatcher.tap(id)` | `dispatcher.Click(id)` |
| `fill` | `probe.fill(id, value)` | `dispatcher.fill(id, text:)` | `dispatcher.fill(id, text:)` | `dispatcher.fill(id, text)` | `dispatcher.Fill(id, value)` |
| `snapshot` | `probe.snapshot()` | custom scan+serialize | custom scan+serialize | custom scan+serialize | custom scan+serialize |
| `verifyLinkage` | `probe.verifyLinkage(id, action)` | `dispatcher.verifyLinkage(id)` | `dispatcher.verifyLinkage(id, action:)` | `dispatcher.verifyLinkage(id, action)` | `dispatcher.VerifyLinkage(id, action)` |

Note: Signature differences are expected (each language has its conventions). The runner is responsible for adapting the vector args to the platform's calling convention. The conformance contract is on the **output shape**, not the method signature.

## Layer 2: Per-Platform E2E Tests

Each platform writes native E2E tests covering platform-specific edge cases that conformance vectors cannot capture.

| Platform | Test Framework | Platform-Specific Test Points |
|----------|---------------|-------------------------------|
| Web | Playwright | MutationObserver timing after DOM mutations; fetch/XHR interception accuracy; iframe cross-origin probe isolation; SPA route change re-scan |
| Flutter | flutter_test | Widget tree rebuild preserves registry; StatefulWidget state changes propagate to probe state; Hot reload does not break probe binding |
| iOS | XCTest | SwiftUI view modifier lifecycle; background→foreground state restoration; NavigationStack push/pop re-scan |
| Android | Compose Test | Recomposition preserves probe state; Configuration change (rotation) survival; LazyColumn item recycling |
| WPF | MSTest | Visual tree dynamic loading; DataTemplate probe discovery; Window activation/deactivation |
| WinForms | MSTest | Dynamic Control add/remove; MDI child window probe isolation; Designer-time ExtenderProvider persistence |
| WinUI | MSTest | XAML Islands interop; NavigationView page transitions; Windowed vs fullscreen layout |

E2E tests live in each platform's integration directory (e.g., `integrations/playwright/tests/`, `examples/flutter/test/`).

## Layer 3: Cross-Platform Equivalence Report

### Report Schema

```json
{
  "generated_at": "ISO timestamp",
  "tool_version": "0.1.0",
  "platforms_tested": ["web", "flutter", "ios"],
  "platforms_skipped": [
    { "platform": "android", "reason": "gradle not available" }
  ],
  "conformance": {
    "vectors_total": 45,
    "results_by_platform": {
      "web": { "passed": 45, "failed": 0, "skipped": 0 },
      "flutter": { "passed": 43, "failed": 2, "skipped": 0 }
    },
    "failures": [
      {
        "vector_id": "REG-005",
        "platform": "flutter",
        "name": "getLayout returns renderTime",
        "expected": "layout.renderTime exists",
        "actual": "field missing",
        "severity": "minor"
      }
    ]
  },
  "e2e": {
    "web": { "total": 10, "passed": 10, "failed": 0 },
    "flutter": { "total": 7, "passed": 7, "failed": 0 }
  },
  "equivalence_matrix": {
    "query":         { "web": "pass", "flutter": "pass", "ios": "pass" },
    "queryAll":      { "web": "pass", "flutter": "pass", "ios": "pass" },
    "getState":      { "web": "pass", "flutter": "pass", "ios": "skip" },
    "waitForState":  { "web": "pass", "flutter": "pass", "ios": "fail" },
    "actAndWait":    { "web": "pass", "flutter": "pass", "ios": "skip" },
    "verifyLinkage": { "web": "pass", "flutter": "pass", "ios": "skip" }
  },
  "overall_status": "partial",
  "summary": "43/45 conformance vectors pass on Flutter, 2 minor failures (renderTime, scrollPosition). iOS skipped 5 vectors (features not yet implemented)."
}
```

## Execution

### Local: `probe validate`

```bash
probe validate                              # All available platforms
probe validate --platform web,flutter       # Specific platforms
probe validate --conformance-only           # Just conformance (fast)
probe validate --e2e-only                   # Just E2E (deep)
probe validate --json                       # Machine-readable output
probe validate --report cross-platform.json # Save report to file
```

The CLI auto-detects available toolchains (node, flutter, swift, gradle, dotnet) and only runs platforms that can execute.

### CI: GitHub Actions Matrix

```yaml
jobs:
  test:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: web
            os: ubuntu-latest
            setup: "npm install"
          - platform: flutter
            os: ubuntu-latest
            setup: "flutter pub get"
          - platform: ios
            os: macos-latest
            setup: "swift build"
          - platform: android
            os: ubuntu-latest
            setup: "gradle build"
          - platform: windows
            os: windows-latest
            setup: "dotnet build"
    steps:
      - uses: actions/checkout@v4
      - run: ${{ matrix.setup }}
      - run: probe validate --platform ${{ matrix.platform }} --json > result-${{ matrix.platform }}.json
      - uses: actions/upload-artifact@v4
        with:
          name: result-${{ matrix.platform }}
          path: result-${{ matrix.platform }}.json

  report:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - run: probe report --merge result-*/result-*.json --output cross-platform-report.json
      - run: probe report --merge result-*/result-*.json --format md --output cross-platform-report.md
```

## Implementation Priority

| Phase | Deliverable | Depends On |
|-------|------------|------------|
| P1 | `spec/conformance/example-app.json` + 6 primitive vector files + Web conformance runner | Web SDK (done) |
| P2 | 4 scenario vector files + Flutter conformance runner | Flutter SDK (done) |
| P3 | `probe validate` CLI command with auto-detection + unified report | P1 + P2 |
| P4 | iOS + Android conformance runners | Platform SDKs |
| P5 | Windows conformance runners (WPF/WinForms/WinUI) | Windows SDKs |
| P6 | GitHub Actions CI matrix + `probe report --merge` | P3 |

## Estimated Vector Counts

| Category | Vector Count |
|----------|-------------|
| primitive-registry | 8 (query, queryAll, queryPage, queryChildren, queryDescendants, queryParent, getAncestorChain, isEffectivelyVisible) |
| primitive-state | 4 (getState, getStates, waitForState, waitForPageReady) |
| primitive-events | 3 (onStateChange, onEvent, event history) |
| primitive-source | 4 (getSource, getNetworkLog, waitForSource, source matching) |
| primitive-layout | 4 (getLayout, getOverlaps, getScrollPosition, visibility) |
| primitive-actions | 12 (click, fill, select + 5 pre-check errors + actAndWait + verifyLinkage + snapshot + diff) |
| scenario-filter-reload | 3 |
| scenario-modal-lifecycle | 3 |
| scenario-pagination | 2 |
| scenario-linkage-chain | 2 |
| **Total** | **~45** |

## Success Criteria

1. Web + Flutter conformance runners pass all vectors
2. `probe validate` runs locally with one command
3. Cross-platform report shows equivalence matrix for all implemented methods
4. CI produces automated cross-platform report on every PR
