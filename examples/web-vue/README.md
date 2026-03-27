# UI Test Probe -- Web Vue Example

Reference example demonstrating `data-probe-*` annotation patterns and Playwright ProbeAPI test integration in a Vue 3 application.

## Scenario

Order Management Page with:
- Status filter dropdown (selector, linked to order table)
- Order data table (data-container, sortable/filterable)
- Paginator (navigation, linked to order table)
- "Create Order" button (action, keyboard shortcut Ctrl+N)
- Create order modal dialog (modal, form with validation)

## Files

- `src/OrderPage.vue` -- Vue 3 Composition API component with `data-probe-*` attributes
- `tests/order-page.spec.ts` -- Playwright tests using `page.probe.*` API

## Notes

The ProbeAPI is framework-agnostic for web platforms. The same `page.probe.*` methods work identically whether the app is built with React, Vue, Svelte, or Angular. Only the annotation syntax differs slightly due to framework template conventions (e.g., Vue uses `:data-probe-state` for dynamic bindings).

## Running Tests

```bash
npm install
npx playwright install
npx playwright test
```
