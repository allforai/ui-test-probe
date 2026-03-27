# Flutter UI Test Probe Example

Order Management page demonstrating `ProbeWidget` annotations and `flutter_test` integration.

## What This Shows

- **ProbeWidget wrappers** on key controls (table, filter, paginator, button, modal)
- **Linkage declarations** between filter/paginator and the data table
- **Probe.page()** for page-level state tracking
- **Animation tracking** on modal open/close
- **ProbeBinding** test extensions for event-driven assertions

## Files

| File | Purpose |
|------|---------|
| `lib/order_page.dart` | Flutter widget with ProbeWidget annotations |
| `test/order_page_test.dart` | flutter_test using ProbeBinding extensions |

## Key Concepts

1. **ProbeWidget** wraps any Flutter widget to register it in the probe registry with a semantic ID, type, and optional metadata (source, linkage, animation).

2. **Probe.page()** wraps the top-level page widget to track page state (loading/loaded/error) and automatically collect child probe elements.

3. **ProbeBinding** extends `WidgetTester` with `probeTester` — providing `query()`, `actAndWait()`, `verifyLinkage()`, `setDevice()`, and `runAcrossDevices()`.

4. Widget tree hierarchy naturally maps to probe parent/children relationships. No manual hierarchy wiring needed.

## Running Tests

```bash
flutter test test/order_page_test.dart
```
