# UI Test Probe - Jetpack Compose Example

Order Management page demonstrating UI Test Probe annotations in
Jetpack Compose with instrumented test integration.

## Probe Modifiers

Compose components are annotated via `Modifier` extensions:

```kotlin
OrderTable(
    modifier = Modifier
        .probeId("order-table")
        .probeType(ProbeType.DATA_CONTAINER)
        .probeSource("GET /api/orders")
        .probeState(viewModel.tableState)
)
```

Linkage between components:

```kotlin
Modifier
    .probeId("status-filter")
    .probeLinkage("order-table", LinkageEffect.DATA_RELOAD, ApiPath("GET /api/orders"))
```

## Testing

Tests use `ProbeTestRule` with Compose test APIs:

```kotlin
probeRule.waitForPageReady()
probeRule.actAndWait("status-filter", "select:completed", target = "order-table")
```

## Running

```bash
./gradlew connectedAndroidTest
```
