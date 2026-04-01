using System.Text.RegularExpressions;
using Microsoft.Maui.Controls;
using UITestProbe.Core.Collector;
using UITestProbe.Core.Models;
using UITestProbe.WinUI.Annotations;

namespace UITestProbe.WinUI.Collector;

/// <summary>
/// MAUI/WinUI implementation of the probe registry.
/// </summary>
public class MauiProbeRegistry : IProbeRegistry
{
    private readonly Dictionary<string, ProbeElement> _elements = new();
    private readonly Dictionary<string, VisualElement> _nativeElements = new();
    private VisualElement? _root;

    public MauiProbeRegistry(VisualElement? root = null) => _root = root;
    public void SetRoot(VisualElement root) => _root = root;
    public VisualElement? GetNativeElement(string id) =>
        _nativeElements.TryGetValue(id, out var el) ? el : null;

    public int Scan()
    {
        if (_root == null) return 0;
        _elements.Clear();
        _nativeElements.Clear();
        WalkTree(_root, parent: null);
        return _elements.Count;
    }

    private void WalkTree(VisualElement element, string? parent)
    {
        var probeId = Probe.GetId(element);
        if (probeId != null)
        {
            _elements[probeId] = BuildElement(element, probeId, parent);
            _nativeElements[probeId] = element;
        }

        var effectiveParent = probeId ?? parent;

        if (element is Layout layout)
            foreach (var child in layout.Children)
                if (child is VisualElement childVisual) WalkTree(childVisual, effectiveParent);
        else if (element is ContentView cv && cv.Content is VisualElement cvChild)
            WalkTree(cvChild, effectiveParent);
        else if (element is ContentPage cp && cp.Content is VisualElement cpChild)
            WalkTree(cpChild, effectiveParent);
        else if (element is ScrollView sv && sv.Content is VisualElement svChild)
            WalkTree(svChild, effectiveParent);
    }

    private static ProbeElement BuildElement(VisualElement element, string probeId, string? parent)
    {
        var typeStr = Probe.GetType(element);
        var stateStr = Probe.GetState(element) ?? "loaded";
        var sourceStr = Probe.GetSource(element);
        var linkageStr = Probe.GetLinkage(element);
        var childrenStr = Probe.GetChildren(element);
        var bounds = element.Bounds;

        return new ProbeElement
        {
            Id = probeId,
            Type = AnnotationParser.ParseProbeType(typeStr),
            State = new StateInfo { Current = stateStr, Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() },
            Layout = new LayoutInfo { X = bounds.X, Y = bounds.Y, Width = bounds.Width, Height = bounds.Height, Visible = element.IsVisible },
            Source = sourceStr != null ? AnnotationParser.ParseSource(sourceStr) : null,
            Linkage = linkageStr != null ? AnnotationParser.ParseLinkage(linkageStr) : null,
            Parent = parent,
            Children = AnnotationParser.ParseChildren(childrenStr),
            Accessibility = new AccessibilityInfo { Label = AutomationProperties.GetName(element) },
        };
    }

    private ProbeElement? RefreshElement(string id)
    {
        if (!_elements.TryGetValue(id, out var existing)) return null;
        if (!_nativeElements.TryGetValue(id, out var native)) return existing;

        var stateStr = Probe.GetState(native) ?? "loaded";
        var bounds = native.Bounds;
        var refreshed = existing with
        {
            State = new StateInfo
            {
                Current = stateStr,
                Previous = existing.State.Current != stateStr ? existing.State.Current : existing.State.Previous,
                Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            },
            Layout = new LayoutInfo { X = bounds.X, Y = bounds.Y, Width = bounds.Width, Height = bounds.Height, Visible = native.IsVisible },
        };
        _elements[id] = refreshed;
        return refreshed;
    }

    public ProbeElement? Query(string id) => RefreshElement(id);

    public IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null)
    {
        foreach (var id in _elements.Keys.ToList()) RefreshElement(id);
        return type == null ? _elements.Values.ToList() : _elements.Values.Where(e => e.Type == type.Value).ToList();
    }

    public PageSummary QueryPage()
    {
        foreach (var id in _elements.Keys.ToList()) RefreshElement(id);
        var pageElement = _elements.Values.FirstOrDefault(e => e.Type == ProbeType.Page);
        var all = _elements.Values.ToList();
        var unready = all.Where(e => e.State.Current is not "loaded" and not "visible").Select(e => e.Id).ToList();
        return new PageSummary
        {
            Id = pageElement?.Id ?? "unknown", State = pageElement?.State.Current ?? "unknown",
            Elements = all, UnreadyElements = unready,
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
                    if (RefreshElement(matchId) is { } child) result.Add(child);
            }
            else if (RefreshElement(childId) is { } child) result.Add(child);
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
        foreach (var child in QueryChildren(id)) { result.Add(child); CollectDescendants(child.Id, result, visited); }
    }

    public bool IsEffectivelyVisible(string id)
    {
        var element = Query(id);
        if (element == null || !element.Layout.Visible) return false;
        if (_nativeElements.TryGetValue(id, out var native))
        {
            var current = native.Parent as VisualElement;
            while (current != null)
            {
                if (!current.IsVisible) return false;
                current = current.Parent as VisualElement;
            }
        }
        return true;
    }
}
