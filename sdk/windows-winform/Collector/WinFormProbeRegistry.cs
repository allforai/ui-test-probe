using System.Text.RegularExpressions;
using System.Windows.Forms;
using UITestProbe.Core.Collector;
using UITestProbe.Core.Models;
using UITestProbe.WinForms.Annotations;

namespace UITestProbe.WinForms.Collector;

/// <summary>
/// WinForms implementation of the probe registry. Discovers probe-annotated
/// controls via the ProbeExtenderProvider and walks the Control tree.
/// </summary>
public class WinFormProbeRegistry : IProbeRegistry
{
    private readonly Dictionary<string, ProbeElement> _elements = new();
    private readonly Dictionary<string, Control> _nativeElements = new();
    private readonly ProbeExtenderProvider _provider;
    private Control? _root;

    public WinFormProbeRegistry(ProbeExtenderProvider provider, Control? root = null)
    {
        _provider = provider;
        _root = root;
    }

    public void SetRoot(Control root) => _root = root;

    public Control? GetNativeElement(string id) =>
        _nativeElements.TryGetValue(id, out var el) ? el : null;

    public int Scan()
    {
        _elements.Clear();
        _nativeElements.Clear();

        // Register all controls that the extender provider knows about
        foreach (var (control, id) in _provider.GetAnnotatedControls())
        {
            var element = BuildElement(control, id);
            _elements[id] = element;
            _nativeElements[id] = control;
        }

        // Also walk the tree from root to find parent relationships
        if (_root != null)
            AssignParents(_root, null);

        return _elements.Count;
    }

    private void AssignParents(Control control, string? parentProbeId)
    {
        var probeId = _provider.GetProbeId(control);
        var effectiveParent = probeId ?? parentProbeId;

        if (probeId != null && parentProbeId != null && _elements.ContainsKey(probeId))
        {
            _elements[probeId] = _elements[probeId] with { Parent = parentProbeId };
        }

        foreach (Control child in control.Controls)
        {
            AssignParents(child, effectiveParent);
        }
    }

    private ProbeElement BuildElement(Control control, string probeId)
    {
        var typeStr = _provider.GetTypeFor(control);
        var stateStr = _provider.GetStateFor(control) ?? "loaded";
        var sourceStr = _provider.GetSourceFor(control);
        var linkageStr = _provider.GetLinkageFor(control);
        var childrenStr = _provider.GetChildrenFor(control);

        var bounds = control.Bounds;
        var screenPoint = control.Parent != null
            ? control.Parent.PointToScreen(control.Location)
            : control.PointToScreen(System.Drawing.Point.Empty);

        return new ProbeElement
        {
            Id = probeId,
            Type = AnnotationParser.ParseProbeType(typeStr),
            State = new StateInfo
            {
                Current = stateStr,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            },
            Layout = new LayoutInfo
            {
                X = bounds.X,
                Y = bounds.Y,
                Width = bounds.Width,
                Height = bounds.Height,
                Visible = control.Visible,
            },
            Source = sourceStr != null ? AnnotationParser.ParseSource(sourceStr) : null,
            Linkage = linkageStr != null ? AnnotationParser.ParseLinkage(linkageStr) : null,
            Children = AnnotationParser.ParseChildren(childrenStr),
            Accessibility = new AccessibilityInfo
            {
                Label = control.AccessibleName,
            },
        };
    }

    private ProbeElement? RefreshElement(string id)
    {
        if (!_elements.TryGetValue(id, out var existing)) return null;
        if (!_nativeElements.TryGetValue(id, out var native)) return existing;

        var stateStr = _provider.GetStateFor(native) ?? "loaded";
        var bounds = native.Bounds;

        var refreshed = existing with
        {
            State = new StateInfo
            {
                Current = stateStr,
                Previous = existing.State.Current != stateStr ? existing.State.Current : existing.State.Previous,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            },
            Layout = new LayoutInfo
            {
                X = bounds.X, Y = bounds.Y,
                Width = bounds.Width, Height = bounds.Height,
                Visible = native.Visible,
            },
        };

        _elements[id] = refreshed;
        return refreshed;
    }

    public ProbeElement? Query(string id) => RefreshElement(id);

    public IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null)
    {
        foreach (var id in _elements.Keys.ToList()) RefreshElement(id);
        return type == null
            ? _elements.Values.ToList()
            : _elements.Values.Where(e => e.Type == type.Value).ToList();
    }

    public PageSummary QueryPage()
    {
        foreach (var id in _elements.Keys.ToList()) RefreshElement(id);
        var pageElement = _elements.Values.FirstOrDefault(e => e.Type == ProbeType.Page);
        var all = _elements.Values.ToList();
        var unready = all.Where(e => e.State.Current is not "loaded" and not "visible").Select(e => e.Id).ToList();
        return new PageSummary
        {
            Id = pageElement?.Id ?? "unknown",
            State = pageElement?.State.Current ?? "unknown",
            Elements = all,
            UnreadyElements = unready,
        };
    }

    public IReadOnlyList<ProbeElement> QueryChildren(string id)
    {
        var element = Query(id);
        if (element?.Children == null) return Array.Empty<ProbeElement>();

        var result = new List<ProbeElement>();
        foreach (var childId in element.Children)
        {
            if (childId.Contains('*'))
            {
                var pattern = "^" + Regex.Escape(childId).Replace("\\*", ".*") + "$";
                foreach (var matchId in _elements.Keys.Where(k => Regex.IsMatch(k, pattern)))
                {
                    var child = RefreshElement(matchId);
                    if (child != null) result.Add(child);
                }
            }
            else
            {
                var child = RefreshElement(childId);
                if (child != null) result.Add(child);
            }
        }
        return result;
    }

    public IReadOnlyList<ProbeElement> QueryDescendants(string id)
    {
        var result = new List<ProbeElement>();
        CollectDescendants(id, result, new HashSet<string>());
        return result;
    }

    private void CollectDescendants(string id, List<ProbeElement> result, HashSet<string> visited)
    {
        if (!visited.Add(id)) return;
        foreach (var child in QueryChildren(id))
        {
            result.Add(child);
            CollectDescendants(child.Id, result, visited);
        }
    }

    public bool IsEffectivelyVisible(string id)
    {
        var element = Query(id);
        if (element == null || !element.Layout.Visible) return false;

        if (_nativeElements.TryGetValue(id, out var native))
        {
            var current = native.Parent;
            while (current != null)
            {
                if (!current.Visible) return false;
                current = current.Parent;
            }
        }
        return true;
    }
}
