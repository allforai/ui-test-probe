# UI Test Probe - .NET MAUI Example

Order Management page demonstrating UI Test Probe annotations in
MAUI XAML with MSTest integration.

## Probe Attached Properties

MAUI views are annotated with XAML attached properties:

```xml
<CollectionView
    probe:Probe.Id="order-table"
    probe:Probe.Type="DataContainer"
    probe:Probe.Source="GET /api/orders"
    probe:Probe.State="{Binding TableState}" />
```

Linkage between components:

```xml
<Picker
    probe:Probe.Id="status-filter"
    probe:Probe.Type="Selector"
    probe:Probe.Linkage="target:order-table; effect:DataReload; path:GET /api/orders" />
```

## Testing

Tests use `UITestProbe.NET` with MSTest:

```csharp
var probe = new ProbeDriver(app);
probe.WaitForPageReady();
probe.ActAndWait("status-filter", "select:completed", target: "order-table");
```

## Running

```bash
dotnet test
```
