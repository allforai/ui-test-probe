using Microsoft.Maui.Controls;

namespace UITestProbe.Annotations;

/// <summary>
/// Attached properties for XAML probe annotations.
/// Usage: <c>probe:Probe.Id="order-table"</c>, <c>probe:Probe.Type="DataContainer"</c>
/// These properties attach semantic metadata to MAUI controls, read by the
/// ProbeRegistry at test time. Production builds can tree-shake the collector;
/// annotations remain inert.
/// </summary>
public static class Probe
{
    // ── Probe.Id ──
    // Unique semantic identifier for the control (e.g., "order-table", "status-filter").

    public static readonly BindableProperty IdProperty =
        BindableProperty.CreateAttached(
            "Id",
            typeof(string),
            typeof(Probe),
            defaultValue: null);

    public static string? GetId(BindableObject view) =>
        (string?)view.GetValue(IdProperty);

    public static void SetId(BindableObject view, string? value) =>
        view.SetValue(IdProperty, value);

    // ── Probe.Type ──
    // Control type classification matching ProbeType enum
    // (e.g., "Page", "DataContainer", "Selector", "Action").

    public static readonly BindableProperty TypeProperty =
        BindableProperty.CreateAttached(
            "Type",
            typeof(string),
            typeof(Probe),
            defaultValue: null);

    public static string? GetType(BindableObject view) =>
        (string?)view.GetValue(TypeProperty);

    public static void SetType(BindableObject view, string? value) =>
        view.SetValue(TypeProperty, value);

    // ── Probe.State ──
    // Bindable state string reflecting control lifecycle
    // (e.g., "loading", "loaded", "error", "empty", "disabled").

    public static readonly BindableProperty StateProperty =
        BindableProperty.CreateAttached(
            "State",
            typeof(string),
            typeof(Probe),
            defaultValue: null);

    public static string? GetState(BindableObject view) =>
        (string?)view.GetValue(StateProperty);

    public static void SetState(BindableObject view, string? value) =>
        view.SetValue(StateProperty, value);

    // ── Probe.Source ──
    // Data source binding descriptor (e.g., "GET /api/orders").
    // Parsed by the collector into a structured Source object.

    public static readonly BindableProperty SourceProperty =
        BindableProperty.CreateAttached(
            "Source",
            typeof(string),
            typeof(Probe),
            defaultValue: null);

    public static string? GetSource(BindableObject view) =>
        (string?)view.GetValue(SourceProperty);

    public static void SetSource(BindableObject view, string? value) =>
        view.SetValue(SourceProperty, value);

    // ── Probe.Linkage ──
    // Linkage declaration describing cause-effect relationships.
    // Format: "target:<id>; effect:<LinkageEffect>; path:<descriptor>"
    // Parsed by the collector into structured LinkageTarget objects.

    public static readonly BindableProperty LinkageProperty =
        BindableProperty.CreateAttached(
            "Linkage",
            typeof(string),
            typeof(Probe),
            defaultValue: null);

    public static string? GetLinkage(BindableObject view) =>
        (string?)view.GetValue(LinkageProperty);

    public static void SetLinkage(BindableObject view, string? value) =>
        view.SetValue(LinkageProperty, value);

    // ── Probe.Children ──
    // Glob pattern or comma-separated list of child probe IDs.
    // Used for hierarchy traversal (e.g., "order-row-*").

    public static readonly BindableProperty ChildrenProperty =
        BindableProperty.CreateAttached(
            "Children",
            typeof(string),
            typeof(Probe),
            defaultValue: null);

    public static string? GetChildren(BindableObject view) =>
        (string?)view.GetValue(ChildrenProperty);

    public static void SetChildren(BindableObject view, string? value) =>
        view.SetValue(ChildrenProperty, value);

    // ── Probe.Trigger ──
    // Interaction descriptor (e.g., "tap; opens:create-order-modal").
    // Consumed by ActionDispatcher for semantic action resolution.

    public static readonly BindableProperty TriggerProperty =
        BindableProperty.CreateAttached(
            "Trigger",
            typeof(string),
            typeof(Probe),
            defaultValue: null);

    public static string? GetTrigger(BindableObject view) =>
        (string?)view.GetValue(TriggerProperty);

    public static void SetTrigger(BindableObject view, string? value) =>
        view.SetValue(TriggerProperty, value);
}
