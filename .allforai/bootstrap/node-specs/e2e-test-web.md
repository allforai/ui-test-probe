---
node: e2e-test-web
exit_artifacts:
  - .allforai/product-verify/e2e-web-report.json
---

# Task: E2E test the Web SDK with Playwright against examples/web-react

Set up a runnable web example, inject the probe SDK, and run Playwright tests verifying all 6 primitives work end-to-end.

## Prerequisites

- compile-verify-typescript must pass for sdk/web
- Node.js 25+ available

## Steps

### 1. Make examples/web-react runnable

The example has React components with probe annotations but may not have a working build setup. Ensure:
- package.json with React + Vite dependencies
- Working `npm run dev` that serves the app
- OrderPage component with probe annotations renders

### 2. Build sdk/web

```bash
cd sdk/web && npm install && npm run build
```

This produces `dist/` with the probe bundle.

### 3. Set up integrations/playwright

```bash
cd integrations/playwright && npm install
```

### 4. Write and run E2E tests

Create a Playwright test that:
1. **V1 — App launches**: Navigate to the app, verify it loads
2. **V2 — Probe injects**: Verify `window.__probe__` exists after injection
3. **V3 — Element Registry**: `query('order-list')` returns a ProbeElement
4. **V4 — State Exposure**: `getState('order-list')` returns state object
5. **V5 — Event Stream**: `waitForPageReady()` resolves
6. **V6 — Layout Metrics**: `getLayout('order-list')` returns position/size
7. **V7 — Action Dispatch**: `click('create-btn')` works with pre-checks

Each test records: pass/fail, duration, error message if failed.

### 5. Take screenshots as evidence

For each major step, take a screenshot and save to `.allforai/product-verify/screenshots/`.

## Exit Artifact

Write `.allforai/product-verify/e2e-web-report.json`:
```json
{
  "generated_at": "ISO",
  "app": "examples/web-react",
  "browser": "chromium",
  "tests": [
    {
      "id": "V1",
      "name": "App launches without error",
      "status": "pass",
      "duration_ms": 1200,
      "screenshot": "screenshots/v1-app-launch.png"
    }
  ],
  "summary": {
    "total": 7,
    "passed": 0,
    "failed": 0,
    "skipped": 0
  }
}
```

## Downstream Contract

→ **verify-report** reads: tests[].status and summary for the unified report
