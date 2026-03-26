# UI Probe

> Observable UI testing infrastructure — transforms black-box screenshot testing into white-box state queries.

## Problem

AI-driven testing tools (LLM agents) currently rely on **screenshots + visual guessing** to verify UI. This is slow, fragile, and shallow — LLM can't tell if a DataGrid has the *right* data, only that it has *some* data.

## Solution

A two-layer UI observability framework:

**Layer 1 — Light Annotation** (dev time): Add semantic `data-probe-*` attributes to key UI controls.

```html
<table
  data-probe-id="order-list"
  data-probe-type="data-container"
  data-probe-state="loaded"
  data-probe-source="GET /api/orders"
  data-probe-rows="8"
>
```

**Layer 2 — Runtime Collector** (test time): Inject a script that exposes `window.__probe__` API.

```javascript
// Instead of: screenshot → LLM guesses "has data?"
// Now: direct query → structured answer
const list = await page.evaluate(() => window.__probe__.query('order-list'));
// { component: "DataGrid", state: "loaded", rows: 8, source: "GET /api/orders → 200 OK" }
```

## Key Capabilities

- **query()** — Get any control's state, data source, row count, options
- **waitForPageReady()** — Event-driven wait (replaces fragile `waitForTimeout`)
- **verifyLinkage()** — Verify control A → B causality with before/after state diff
- **snapshot() + diff()** — Full UI state snapshots for regression comparison
- **getDataSourceStatus()** — Verify API actually returned 200, not just "page has data"

## Platform Coverage

| Platform | Annotation | Collector | Status |
|----------|-----------|-----------|--------|
| React / Vue / Svelte / Angular | `data-probe-*` HTML attrs | JS `addInitScript` | Phase 1 |
| Flutter Web | `Semantics` widget | JS `addInitScript` | Phase 1 |
| Flutter Mobile | `Semantics` label | Flutter Driver adapter | Phase 2 |
| SwiftUI / Compose / React Native | Native test IDs | Platform adapters | Phase 2 |

## Spec

See [SPEC.md](./SPEC.md) for the full requirements document.

## License

MIT
