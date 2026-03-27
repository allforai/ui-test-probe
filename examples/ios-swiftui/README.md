# UI Test Probe - SwiftUI Example

Order Management page demonstrating UI Test Probe annotations in SwiftUI
with XCUITest integration.

## Probe Modifiers

SwiftUI views are annotated with chained modifiers:

```swift
OrderTable()
    .probeId("order-table")
    .probeType(.dataContainer)
    .probeSource("GET /api/orders")
    .probeState(viewModel.tableState)
```

Linkage between components is declared at the source:

```swift
StatusFilter()
    .probeId("status-filter")
    .probeLinkage(to: "order-table", effect: .dataReload, path: .api("GET /api/orders"))
```

## Testing

Tests use `ProbeXCTest` extensions on `XCUIApplication`:

```swift
let probe = ProbeXCTest(app)
probe.waitForPageReady()
probe.actAndWait("status-filter", action: .select("completed"), target: "order-table", state: "loaded")
```

## Running

```bash
xcodebuild test -scheme OrderApp -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```
