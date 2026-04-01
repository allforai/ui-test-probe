using System.ComponentModel;
using System.Windows.Forms;

namespace UITestProbe.WinForms.Annotations;

/// <summary>
/// WinForms extender provider for probe annotations. Allows setting probe metadata
/// on any Control via the designer or code:
/// <code>probeProvider.SetProbeId(myButton, "submit-btn");</code>
/// In the designer, properties appear under "Probe" in the property grid.
/// </summary>
[ProvideProperty("ProbeId", typeof(Control))]
[ProvideProperty("ProbeType", typeof(Control))]
[ProvideProperty("ProbeState", typeof(Control))]
[ProvideProperty("ProbeSource", typeof(Control))]
[ProvideProperty("ProbeLinkage", typeof(Control))]
[ProvideProperty("ProbeChildren", typeof(Control))]
[ProvideProperty("ProbeTrigger", typeof(Control))]
public class ProbeExtenderProvider : Component, IExtenderProvider
{
    private readonly Dictionary<Control, string?> _ids = new();
    private readonly Dictionary<Control, string?> _types = new();
    private readonly Dictionary<Control, string?> _states = new();
    private readonly Dictionary<Control, string?> _sources = new();
    private readonly Dictionary<Control, string?> _linkages = new();
    private readonly Dictionary<Control, string?> _children = new();
    private readonly Dictionary<Control, string?> _triggers = new();

    public bool CanExtend(object extendee) => extendee is Control;

    // ── ProbeId ──
    [Category("Probe")]
    [Description("Semantic probe identifier (e.g., 'order-table')")]
    public string? GetProbeId(Control control) => _ids.GetValueOrDefault(control);
    public void SetProbeId(Control control, string? value) => _ids[control] = value;

    // ── ProbeType ──
    [Category("Probe")]
    [Description("Control type classification (e.g., 'DataContainer', 'Selector')")]
    public string? GetProbeType(Control control) => _types.GetValueOrDefault(control);
    public void SetProbeType(Control control, string? value) => _types[control] = value;

    // ── ProbeState ──
    [Category("Probe")]
    [Description("Bindable state string (e.g., 'loading', 'loaded', 'error')")]
    public string? GetProbeState(Control control) => _states.GetValueOrDefault(control);
    public void SetProbeState(Control control, string? value) => _states[control] = value;

    // ── ProbeSource ──
    [Category("Probe")]
    [Description("Data source descriptor (e.g., 'GET /api/orders')")]
    public string? GetProbeSource(Control control) => _sources.GetValueOrDefault(control);
    public void SetProbeSource(Control control, string? value) => _sources[control] = value;

    // ── ProbeLinkage ──
    [Category("Probe")]
    [Description("Linkage declaration for cause-effect relationships")]
    public string? GetProbeLinkage(Control control) => _linkages.GetValueOrDefault(control);
    public void SetProbeLinkage(Control control, string? value) => _linkages[control] = value;

    // ── ProbeChildren ──
    [Category("Probe")]
    [Description("Child probe IDs or glob pattern (e.g., 'order-row-*')")]
    public string? GetProbeChildren(Control control) => _children.GetValueOrDefault(control);
    public void SetProbeChildren(Control control, string? value) => _children[control] = value;

    // ── ProbeTrigger ──
    [Category("Probe")]
    [Description("Interaction descriptor (e.g., 'tap; opens:create-order-modal')")]
    public string? GetProbeTrigger(Control control) => _triggers.GetValueOrDefault(control);
    public void SetProbeTrigger(Control control, string? value) => _triggers[control] = value;

    /// <summary>
    /// Returns all controls that have a ProbeId set.
    /// </summary>
    internal IEnumerable<(Control Control, string Id)> GetAnnotatedControls()
    {
        foreach (var (control, id) in _ids)
        {
            if (!string.IsNullOrEmpty(id))
                yield return (control, id);
        }
    }

    internal string? GetTypeFor(Control control) => _types.GetValueOrDefault(control);
    internal string? GetStateFor(Control control) => _states.GetValueOrDefault(control);
    internal string? GetSourceFor(Control control) => _sources.GetValueOrDefault(control);
    internal string? GetLinkageFor(Control control) => _linkages.GetValueOrDefault(control);
    internal string? GetChildrenFor(Control control) => _children.GetValueOrDefault(control);
}
