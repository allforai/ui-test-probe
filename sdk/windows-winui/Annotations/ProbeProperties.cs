using Microsoft.Maui.Controls;

namespace UITestProbe.WinUI.Annotations;

/// <summary>
/// MAUI attached properties for XAML probe annotations.
/// Usage: <c>probe:Probe.Id="order-table"</c>
/// </summary>
public static class Probe
{
    public static readonly BindableProperty IdProperty =
        BindableProperty.CreateAttached("Id", typeof(string), typeof(Probe), defaultValue: null);
    public static string? GetId(BindableObject view) => (string?)view.GetValue(IdProperty);
    public static void SetId(BindableObject view, string? value) => view.SetValue(IdProperty, value);

    public static readonly BindableProperty TypeProperty =
        BindableProperty.CreateAttached("Type", typeof(string), typeof(Probe), defaultValue: null);
    public static string? GetType(BindableObject view) => (string?)view.GetValue(TypeProperty);
    public static void SetType(BindableObject view, string? value) => view.SetValue(TypeProperty, value);

    public static readonly BindableProperty StateProperty =
        BindableProperty.CreateAttached("State", typeof(string), typeof(Probe), defaultValue: null);
    public static string? GetState(BindableObject view) => (string?)view.GetValue(StateProperty);
    public static void SetState(BindableObject view, string? value) => view.SetValue(StateProperty, value);

    public static readonly BindableProperty SourceProperty =
        BindableProperty.CreateAttached("Source", typeof(string), typeof(Probe), defaultValue: null);
    public static string? GetSource(BindableObject view) => (string?)view.GetValue(SourceProperty);
    public static void SetSource(BindableObject view, string? value) => view.SetValue(SourceProperty, value);

    public static readonly BindableProperty LinkageProperty =
        BindableProperty.CreateAttached("Linkage", typeof(string), typeof(Probe), defaultValue: null);
    public static string? GetLinkage(BindableObject view) => (string?)view.GetValue(LinkageProperty);
    public static void SetLinkage(BindableObject view, string? value) => view.SetValue(LinkageProperty, value);

    public static readonly BindableProperty ChildrenProperty =
        BindableProperty.CreateAttached("Children", typeof(string), typeof(Probe), defaultValue: null);
    public static string? GetChildren(BindableObject view) => (string?)view.GetValue(ChildrenProperty);
    public static void SetChildren(BindableObject view, string? value) => view.SetValue(ChildrenProperty, value);

    public static readonly BindableProperty TriggerProperty =
        BindableProperty.CreateAttached("Trigger", typeof(string), typeof(Probe), defaultValue: null);
    public static string? GetTrigger(BindableObject view) => (string?)view.GetValue(TriggerProperty);
    public static void SetTrigger(BindableObject view, string? value) => view.SetValue(TriggerProperty, value);
}
