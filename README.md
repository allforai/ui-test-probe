# UI Test Probe

> Observable UI testing infrastructure — transforms black-box screenshot testing into white-box state queries.

## Problem

AI-driven testing tools currently rely on **screenshots + visual guessing** to verify UI. This is slow, fragile, and shallow — LLM can't tell if a DataGrid has the *right* data, only that it has *some* data.

## Solution

A cross-platform UI observability framework with **6 primitives**:

| Primitive | Purpose |
|-----------|---------|
| **Element Registry** | Register + query UI elements by semantic ID |
| **State Exposure** | Real-time state of any element (loaded/error/disabled/...) |
| **Event Stream** | Subscribe to state changes (event-driven, not polling) |
| **Source Binding** | Link elements to their API data sources |
| **Layout Metrics** | Position, size, scroll, render time |
| **Action Dispatch** | Semantic operations with smart pre-checks + auto linkage verification |

### Two-Layer Architecture

**Layer 1 — Light Annotation** (dev time): Add semantic attributes to key UI controls.

```html
<table
  data-probe-id="order-list"
  data-probe-type="data-container"
  data-probe-state="loaded"
  data-probe-source="GET /api/orders"
>
```

**Layer 2 — Runtime Collector** (test time): Inject a script that exposes `window.__probe__` API.

```javascript
// Query: direct state access instead of screenshot guessing
const list = await page.probe.query('order-list');
// { state: "loaded", data: { rows: 8 }, source: { url: "GET /api/orders", status: 200 } }

// Wait: event-driven instead of fixed timeout
await page.probe.waitForPageReady();

// Act: semantic operation with smart pre-checks
await page.probe.select('status-filter', 'completed');

// Verify: operation + wait + linkage verification in one call
const result = await page.probe.actAndWait(
  'status-filter', 'select:completed',
  { target: 'order-table', state: 'loaded' }
);
// result.linkageResults.directEffects[0].result === 'pass'
```

## 7 Testing Pain Points Addressed

| Pain Point | How Probe Solves It |
|------------|-------------------|
| **Data linkage** | `verifyLinkage()` traces trigger → propagation → response chain |
| **Control state** | `query().state` returns exact state, no screenshot guessing |
| **API seams** | `source` binding links elements to API call status/payload |
| **Data grids** | `data.rows/columns/sort/filter/selectedRows` — structured, not visual |
| **Pagination** | Paginator ↔ DataGrid linkage with page/total/hasNext |
| **Multimedia** | `data.readyState/paused/currentTime` for video; `source.status` for images |
| **Focus navigation** | `accessibility.tabIndex` + Event Stream focus tracking |

## Element Model (15 Attributes)

```
id, type, accessibility, state, data, source, linkage, layout,
shortcuts, animation, locale, theme, eventBindings, session,
parent, children
```

- **Type-specific**: DataGrid has `data.sort/filter`, video has `data.currentTime/paused`. Empty fields omitted.
- **Hierarchy**: `parent` + `children` form a tree. `isEffectivelyVisible(id)` checks the ancestor chain — child `visible=true` but parent `hidden` → effectively invisible.

## Linkage Model (6 Path Types)

| Path | Description |
|------|------------|
| `direct` | Pure frontend state propagation |
| `api` | Through API call (network seam) |
| `computed` | Derived calculation (A × B → C) |
| `store` | Through state management (Redux/Pinia/Bloc) |
| `navigation` | Through route change |
| `chain` | Through intermediate element (A → B → C) |

## Platform Coverage

| Platform | SDK Language | Status |
|----------|-------------|--------|
| Web (React/Vue/Svelte/Angular) | TypeScript | Phase 1 |
| Flutter (Web/Mobile/Desktop) | Dart | Phase 2 |
| SwiftUI (iOS/macOS) | Swift | Phase 3 |
| Jetpack Compose (Android) | Kotlin | Phase 3 |
| WinUI/MAUI (Windows) | C# | Phase 4 |
| React Native | TypeScript | Phase 4 |
| Electron | TypeScript (reuses Web SDK) | Phase 1 |

## Documentation

- [SPEC.md](./SPEC.md) — Requirements specification
- [DESIGN.md](./DESIGN.md) — Technical design (6 primitives, 13 attributes, 6 linkage paths, full API)

## License

MIT
