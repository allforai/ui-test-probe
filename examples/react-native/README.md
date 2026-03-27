# React Native UI Test Probe Example

Order Management page demonstrating `probeProps` annotations and Detox integration.

## What This Shows

- **probeProps** on FlatList, Picker, Button, and Modal components
- **Linkage declarations** between filter/paginator and the data list
- **Session tracking** on the create-order form
- **ProbeAPI** Detox extension for event-driven assertions

## Files

| File | Purpose |
|------|---------|
| `src/OrderPage.tsx` | React Native screen with probeProps annotations |
| `tests/order-page.test.ts` | Detox test using ProbeAPI extensions |

## Key Concepts

1. **probeProps** is a plain object spread onto components alongside `testID`. It declares probe metadata: `type`, `state`, `source`, `linkage`, and `session`.

2. The probe runtime (injected in test builds only) reads `probeProps` from the native view tree and registers elements in the probe registry.

3. **ProbeAPI** extends Detox's `device` and `element` APIs with `probe.query()`, `probe.actAndWait()`, `probe.verifyLinkage()`, `probe.setDevice()`, and `probe.runAcrossDevices()`.

## Running Tests

```bash
detox test -c ios.sim.debug
```
