# UI Test Probe -- Electron Example

Reference example demonstrating `data-probe-*` annotations in an Electron application and Playwright-based test integration.

## Scenario

Order Management Page (same as web examples) with:
- Status filter dropdown (selector, linked to order table)
- Order data table (data-container, sortable/filterable)
- Paginator (navigation, linked to order table)
- "Create Order" button (action, keyboard shortcut Ctrl+N)
- Create order modal dialog (modal, form with validation)

## Key Difference from Web

Electron reuses the **same Web SDK** -- `data-probe-*` HTML attributes in the renderer process, collected via the same Playwright integration. Playwright has first-class Electron support via `electron.launch()`, so the ProbeAPI works identically.

## Files

- `src/renderer/OrderPage.tsx` -- React component in Electron renderer with `data-probe-*` attributes
- `tests/order-page.spec.ts` -- Playwright tests targeting the Electron app

## Running Tests

```bash
npm install
npx playwright install

# Tests launch the Electron app via _electron.launch()
npx playwright test
```
