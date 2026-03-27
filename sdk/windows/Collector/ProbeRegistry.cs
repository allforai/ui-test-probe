using UITestProbe.Annotations;
using UITestProbe.Models;

namespace UITestProbe.Collector;

/// <summary>
/// Scans the MAUI visual tree for probe-annotated controls and builds
/// an in-memory registry of <see cref="ProbeElement"/> instances.
/// Uses UI Automation APIs on Windows to traverse the element tree.
/// </summary>
public class ProbeRegistry
{
    private readonly Dictionary<string, ProbeElement> _elements = new();

    /// <summary>
    /// Maps a probe ID back to its native VisualElement for ancestor lookups and actions.
    /// </summary>
    private readonly Dictionary<string, Microsoft.Maui.Controls.VisualElement> _nativeElements = new();

    /// <summary>
    /// Performs a full scan of the visual tree starting from the root page.
    /// Discovers all controls with Probe.Id attached properties and
    /// builds ProbeElement records from their annotations + runtime state.
    /// </summary>
    /// <param name="root">The root visual element (typically a Page) to scan from.</param>
    /// <returns>Count of registered probe elements found.</returns>
    public int Scan(Microsoft.Maui.Controls.VisualElement root)
    {
        _elements.Clear();
        _nativeElements.Clear();
        WalkTree(root, parent: null);
        return _elements.Count;
    }

    /// <summary>
    /// Returns the native VisualElement for the given probe ID, or null.
    /// </summary>
    public Microsoft.Maui.Controls.VisualElement? GetNativeElement(string id)
    {
        return _nativeElements.TryGetValue(id, out var el) ? el : null;
    }

    private void WalkTree(Microsoft.Maui.Controls.VisualElement element, string? parent)
    {
        var probeId = Probe.GetId(element);

        if (probeId != null)
        {
            var probeElement = BuildElement(element, probeId, parent);
            _elements[probeId] = probeElement;
            _nativeElements[probeId] = element;
        }

        // The current element's probe ID becomes the parent for nested probe elements
        var effectiveParent = probeId ?? parent;

        // Walk children depending on container type
        if (element is Microsoft.Maui.Controls.Layout layout)
        {
            foreach (var child in layout.Children)
            {
                if (child is Microsoft.Maui.Controls.VisualElement childVisual)
                    WalkTree(childVisual, effectiveParent);
            }
        }
        else if (element is Microsoft.Maui.Controls.ContentView contentView
                 && contentView.Content is Microsoft.Maui.Controls.VisualElement contentChild)
        {
            WalkTree(contentChild, effectiveParent);
        }
        else if (element is Microsoft.Maui.Controls.ContentPage contentPage
                 && contentPage.Content is Microsoft.Maui.Controls.VisualElement pageChild)
        {
            WalkTree(pageChild, effectiveParent);
        }
        else if (element is Microsoft.Maui.Controls.ScrollView scrollView
                 && scrollView.Content is Microsoft.Maui.Controls.VisualElement scrollChild)
        {
            WalkTree(scrollChild, effectiveParent);
        }
    }

    private ProbeElement BuildElement(Microsoft.Maui.Controls.VisualElement element, string probeId, string? parent)
    {
        var typeStr = Probe.GetType(element);
        var probeType = ParseProbeType(typeStr);
        var stateStr = Probe.GetState(element) ?? "loaded";
        var sourceStr = Probe.GetSource(element);
        var linkageStr = Probe.GetLinkage(element);
        var childrenStr = Probe.GetChildren(element);

        var bounds = element.Bounds;
        var layoutInfo = new LayoutInfo
        {
            X = bounds.X,
            Y = bounds.Y,
            Width = bounds.Width,
            Height = bounds.Height,
            Visible = element.IsVisible,
        };

        var state = new StateInfo
        {
            Current = stateStr,
            Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        };

        SourceInfo? source = sourceStr != null ? ParseSource(sourceStr) : null;
        LinkageInfo? linkage = linkageStr != null ? ParseLinkage(linkageStr) : null;
        IReadOnlyList<string>? children = childrenStr != null
            ? childrenStr.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList()
            : null;

        return new ProbeElement
        {
            Id = probeId,
            Type = probeType,
            State = state,
            Layout = layoutInfo,
            Source = source,
            Linkage = linkage,
            Parent = parent,
            Children = children,
            Accessibility = new AccessibilityInfo
            {
                Label = Microsoft.Maui.Controls.AutomationProperties.GetName(element),
            },
        };
    }

    /// <summary>
    /// Refreshes runtime state (bounds, visibility, current state) of a registered element.
    /// </summary>
    private ProbeElement? RefreshElement(string id)
    {
        if (!_elements.TryGetValue(id, out var existing)) return null;
        if (!_nativeElements.TryGetValue(id, out var native)) return existing;

        var bounds = native.Bounds;
        var stateStr = Probe.GetState(native) ?? "loaded";

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
                X = bounds.X,
                Y = bounds.Y,
                Width = bounds.Width,
                Height = bounds.Height,
                Visible = native.IsVisible,
            },
        };

        _elements[id] = refreshed;
        return refreshed;
    }

    private static ProbeType ParseProbeType(string? typeStr)
    {
        if (typeStr == null) return ProbeType.Display;
        return Enum.TryParse<ProbeType>(typeStr, ignoreCase: true, out var parsed)
            ? parsed
            : ProbeType.Display;
    }

    private static SourceInfo ParseSource(string raw)
    {
        // Format: "GET /api/orders" or "POST /api/orders"
        var parts = raw.Split(' ', 2, StringSplitOptions.TrimEntries);
        return new SourceInfo
        {
            Method = parts.Length > 1 ? parts[0] : "GET",
            Url = parts.Length > 1 ? parts[1] : parts[0],
        };
    }

    private static LinkageInfo ParseLinkage(string raw)
    {
        // Format: "target:<id>; effect:<effect>; path:<type>" -- multiple targets separated by '|'
        var segments = raw.Split('|', StringSplitOptions.TrimEntries);
        var targets = new List<LinkageTarget>();

        foreach (var segment in segments)
        {
            var props = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var pair in segment.Split(';', StringSplitOptions.TrimEntries))
            {
                var kv = pair.Split(':', 2, StringSplitOptions.TrimEntries);
                if (kv.Length == 2)
                    props[kv[0]] = kv[1];
            }

            if (!props.TryGetValue("target", out var targetId)) continue;

            var effect = LinkageEffect.DataReload;
            if (props.TryGetValue("effect", out var effectStr))
                Enum.TryParse(effectStr, ignoreCase: true, out effect);

            LinkagePath path = new DirectPath();
            if (props.TryGetValue("path", out var pathStr))
                path = ParseLinkagePath(pathStr);

            targets.Add(new LinkageTarget { Id = targetId, Effect = effect, Path = path });
        }

        return new LinkageInfo { Targets = targets };
    }

    private static LinkagePath ParseLinkagePath(string pathStr)
    {
        var colonIdx = pathStr.IndexOf(':');
        if (colonIdx < 0) return new DirectPath();

        var kind = pathStr[..colonIdx].Trim().ToLowerInvariant();
        var value = pathStr[(colonIdx + 1)..].Trim();

        return kind switch
        {
            "api" => new ApiPath { Url = value },
            "store" => new StorePath { StoreName = value },
            "chain" => new ChainPath { Through = value },
            "navigation" => new NavigationPath { Route = value },
            "computed" => new ComputedPath { Expression = value },
            _ => new DirectPath(),
        };
    }

    /// <summary>
    /// Queries a single registered element by its probe ID.
    /// </summary>
    /// <param name="id">Semantic probe identifier (e.g., "order-table").</param>
    /// <returns>The matching ProbeElement, or null if not found.</returns>
    public ProbeElement? Query(string id)
    {
        return RefreshElement(id);
    }

    /// <summary>
    /// Queries all registered elements, optionally filtered by type.
    /// </summary>
    /// <param name="type">Optional type filter. Null returns all elements.</param>
    /// <returns>List of matching ProbeElements with refreshed state.</returns>
    public IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null)
    {
        // Refresh all elements before returning
        foreach (var id in _elements.Keys.ToList())
            RefreshElement(id);

        if (type == null)
            return _elements.Values.ToList();

        return _elements.Values.Where(e => e.Type == type.Value).ToList();
    }

    /// <summary>
    /// Returns the page-level probe summary: page element, all child
    /// elements, and any elements not yet in a ready state.
    /// </summary>
    /// <returns>Page summary with element list and unready element IDs.</returns>
    public PageSummary QueryPage()
    {
        // Refresh all elements
        foreach (var id in _elements.Keys.ToList())
            RefreshElement(id);

        var pageElement = _elements.Values.FirstOrDefault(e => e.Type == ProbeType.Page);
        var allElements = _elements.Values.ToList();
        var unready = allElements
            .Where(e => e.State.Current != "loaded" && e.State.Current != "visible")
            .Select(e => e.Id)
            .ToList();

        return new PageSummary
        {
            Id = pageElement?.Id ?? "unknown",
            State = pageElement?.State.Current ?? "unknown",
            Elements = allElements,
            UnreadyElements = unready,
        };
    }

    /// <summary>
    /// Returns direct children of the specified probe element.
    /// </summary>
    public IReadOnlyList<ProbeElement> QueryChildren(string id)
    {
        var element = Query(id);
        if (element?.Children == null || element.Children.Count == 0)
            return Array.Empty<ProbeElement>();

        var result = new List<ProbeElement>();
        foreach (var childId in element.Children)
        {
            // Support glob patterns like "order-row-*"
            if (childId.Contains('*'))
            {
                var pattern = "^" + System.Text.RegularExpressions.Regex.Escape(childId).Replace("\\*", ".*") + "$";
                var matches = _elements.Keys
                    .Where(k => System.Text.RegularExpressions.Regex.IsMatch(k, pattern))
                    .ToList();
                foreach (var matchId in matches)
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

    /// <summary>
    /// Returns all descendants of the specified probe element.
    /// </summary>
    public IReadOnlyList<ProbeElement> QueryDescendants(string id)
    {
        var result = new List<ProbeElement>();
        CollectDescendants(id, result, new HashSet<string>());
        return result;
    }

    private void CollectDescendants(string id, List<ProbeElement> result, HashSet<string> visited)
    {
        if (!visited.Add(id)) return; // prevent cycles

        var children = QueryChildren(id);
        foreach (var child in children)
        {
            result.Add(child);
            CollectDescendants(child.Id, result, visited);
        }
    }

    /// <summary>
    /// Checks effective visibility by walking the ancestor chain.
    /// A child may be visible but its parent hidden, making it effectively invisible.
    /// </summary>
    public bool IsEffectivelyVisible(string id)
    {
        var element = Query(id);
        if (element == null) return false;
        if (!element.Layout.Visible) return false;

        // Walk ancestor chain via native VisualElement tree
        if (_nativeElements.TryGetValue(id, out var native))
        {
            var current = native.Parent as Microsoft.Maui.Controls.VisualElement;
            while (current != null)
            {
                if (!current.IsVisible) return false;
                current = current.Parent as Microsoft.Maui.Controls.VisualElement;
            }
        }

        return true;
    }
}

/// <summary>
/// Summary of the current page's probe state.
/// </summary>
public record PageSummary
{
    public required string Id { get; init; }
    public required string State { get; init; }
    public required IReadOnlyList<ProbeElement> Elements { get; init; }
    public required IReadOnlyList<string> UnreadyElements { get; init; }
}
