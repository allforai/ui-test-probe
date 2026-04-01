using System.Windows;

namespace UITestProbe.Wpf.Annotations;

/// <summary>
/// WPF attached properties for probe annotations.
/// Usage in XAML: <c>probe:Probe.Id="order-table"</c>
/// These attach semantic metadata to WPF controls, read by the ProbeRegistry at test time.
/// </summary>
public static class Probe
{
    // ── Probe.Id ──
    public static readonly DependencyProperty IdProperty =
        DependencyProperty.RegisterAttached("Id", typeof(string), typeof(Probe),
            new FrameworkPropertyMetadata(null));

    public static string? GetId(DependencyObject obj) => (string?)obj.GetValue(IdProperty);
    public static void SetId(DependencyObject obj, string? value) => obj.SetValue(IdProperty, value);

    // ── Probe.Type ──
    public static readonly DependencyProperty TypeProperty =
        DependencyProperty.RegisterAttached("Type", typeof(string), typeof(Probe),
            new FrameworkPropertyMetadata(null));

    public static string? GetType(DependencyObject obj) => (string?)obj.GetValue(TypeProperty);
    public static void SetType(DependencyObject obj, string? value) => obj.SetValue(TypeProperty, value);

    // ── Probe.State ──
    public static readonly DependencyProperty StateProperty =
        DependencyProperty.RegisterAttached("State", typeof(string), typeof(Probe),
            new FrameworkPropertyMetadata(null));

    public static string? GetState(DependencyObject obj) => (string?)obj.GetValue(StateProperty);
    public static void SetState(DependencyObject obj, string? value) => obj.SetValue(StateProperty, value);

    // ── Probe.Source ──
    public static readonly DependencyProperty SourceProperty =
        DependencyProperty.RegisterAttached("Source", typeof(string), typeof(Probe),
            new FrameworkPropertyMetadata(null));

    public static string? GetSource(DependencyObject obj) => (string?)obj.GetValue(SourceProperty);
    public static void SetSource(DependencyObject obj, string? value) => obj.SetValue(SourceProperty, value);

    // ── Probe.Linkage ──
    public static readonly DependencyProperty LinkageProperty =
        DependencyProperty.RegisterAttached("Linkage", typeof(string), typeof(Probe),
            new FrameworkPropertyMetadata(null));

    public static string? GetLinkage(DependencyObject obj) => (string?)obj.GetValue(LinkageProperty);
    public static void SetLinkage(DependencyObject obj, string? value) => obj.SetValue(LinkageProperty, value);

    // ── Probe.Children ──
    public static readonly DependencyProperty ChildrenProperty =
        DependencyProperty.RegisterAttached("Children", typeof(string), typeof(Probe),
            new FrameworkPropertyMetadata(null));

    public static string? GetChildren(DependencyObject obj) => (string?)obj.GetValue(ChildrenProperty);
    public static void SetChildren(DependencyObject obj, string? value) => obj.SetValue(ChildrenProperty, value);

    // ── Probe.Trigger ──
    public static readonly DependencyProperty TriggerProperty =
        DependencyProperty.RegisterAttached("Trigger", typeof(string), typeof(Probe),
            new FrameworkPropertyMetadata(null));

    public static string? GetTrigger(DependencyObject obj) => (string?)obj.GetValue(TriggerProperty);
    public static void SetTrigger(DependencyObject obj, string? value) => obj.SetValue(TriggerProperty, value);
}
