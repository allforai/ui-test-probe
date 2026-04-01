using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Media;
using UITestProbe.Core.Collector;
using UITestProbe.Core.Models;
using UITestProbe.Wpf.Annotations;

namespace UITestProbe.Wpf.Collector;

/// <summary>
/// WPF implementation of the probe registry. Walks the WPF visual tree using
/// VisualTreeHelper to discover probe-annotated controls.
/// </summary>
public class WpfProbeRegistry : IProbeRegistry
{
    private readonly Dictionary<string, ProbeElement> _elements = new();
    private readonly Dictionary<string, DependencyObject> _nativeElements = new();
    private DependencyObject? _root;

    public WpfProbeRegistry(DependencyObject? root = null)
    {
        _root = root;
    }

    public void SetRoot(DependencyObject root) => _root = root;

    public DependencyObject? GetNativeElement(string id) =>
        _nativeElements.TryGetValue(id, out var el) ? el : null;

    public int Scan()
    {
        if (_root == null) return 0;
        _elements.Clear();
        _nativeElements.Clear();
        WalkTree(_root, parent: null);
        return _elements.Count;
    }

    private void WalkTree(DependencyObject element, string? parent)
    {
        var probeId = Probe.GetId(element);

        if (probeId != null)
        {
            var probeElement = BuildElement(element, probeId, parent);
            _elements[probeId] = probeElement;
            _nativeElements[probeId] = element;
        }

        var effectiveParent = probeId ?? parent;

        var childCount = VisualTreeHelper.GetChildrenCount(element);
        for (var i = 0; i < childCount; i++)
        {
            var child = VisualTreeHelper.GetChild(element, i);
            WalkTree(child, effectiveParent);
        }
    }

    private static ProbeElement BuildElement(DependencyObject element, string probeId, string? parent)
    {
        var typeStr = Probe.GetType(element);
        var stateStr = Probe.GetState(element) ?? "loaded";
        var sourceStr = Probe.GetSource(element);
        var linkageStr = Probe.GetLinkage(element);
        var childrenStr = Probe.GetChildren(element);

        var layout = GetLayout(element);
        var source = sourceStr != null ? AnnotationParser.ParseSource(sourceStr) : null;
        var linkage = linkageStr != null ? AnnotationParser.ParseLinkage(linkageStr) : null;
        var children = AnnotationParser.ParseChildren(childrenStr);

        return new ProbeElement
        {
            Id = probeId,
            Type = AnnotationParser.ParseProbeType(typeStr),
            State = new StateInfo
            {
                Current = stateStr,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            },
            Layout = layout,
            Source = source,
            Linkage = linkage,
            Parent = parent,
            Children = children,
            Accessibility = new AccessibilityInfo
            {
                Label = element is FrameworkElement fe
                    ? System.Windows.Automation.AutomationProperties.GetName(fe)
                    : null,
            },
        };
    }

    private static LayoutInfo GetLayout(DependencyObject element)
    {
        if (element is UIElement uiElement)
        {
            var renderSize = uiElement.RenderSize;
            var point = uiElement.TranslatePoint(new Point(0, 0),
                Application.Current?.MainWindow ?? uiElement);

            return new LayoutInfo
            {
                X = point.X,
                Y = point.Y,
                Width = renderSize.Width,
                Height = renderSize.Height,
                Visible = uiElement.Visibility == Visibility.Visible && uiElement.IsVisible,
            };
        }

        return new LayoutInfo { Visible = false };
    }

    private ProbeElement? RefreshElement(string id)
    {
        if (!_elements.TryGetValue(id, out var existing)) return null;
        if (!_nativeElements.TryGetValue(id, out var native)) return existing;

        var stateStr = Probe.GetState(native) ?? "loaded";
        var layout = GetLayout(native);

        var refreshed = existing with
        {
            State = new StateInfo
            {
                Current = stateStr,
                Previous = existing.State.Current != stateStr ? existing.State.Current : existing.State.Previous,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            },
            Layout = layout,
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
            var current = VisualTreeHelper.GetParent(native);
            while (current != null)
            {
                if (current is UIElement uiEl && !uiEl.IsVisible) return false;
                current = VisualTreeHelper.GetParent(current);
            }
        }
        return true;
    }
}
