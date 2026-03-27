# UI Test Probe -- Web React Example

Reference example demonstrating `data-probe-*` annotation patterns and Playwright ProbeAPI test integration in a React application.

## Scenario

Order Management Page with:
- Status filter dropdown (selector, linked to order table)
- Order data table (data-container, sortable/filterable)
- Paginator (navigation, linked to order table)
- "Create Order" button (action, keyboard shortcut Ctrl+N)
- Create order modal dialog (modal, form with validation)

## Files

- `src/OrderPage.tsx` -- React component with `data-probe-*` HTML attributes on key controls
- `tests/order-page.spec.ts` -- Playwright tests using `page.probe.*` API

## Key Concepts

**Annotations** are plain HTML `data-probe-*` attributes. No runtime dependency required in production -- the probe collector is injected only during testing via Playwright `addInitScript()`.

**ProbeAPI** (`page.probe.*`) provides semantic querying, event-driven waits, linkage verification, and snapshot diffing -- replacing screenshot-based guessing with structured introspection.

## Running Tests

```bash
# Install dependencies (once the SDK is published)
npm install
npx playwright install

# Run tests
npx playwright test
```
