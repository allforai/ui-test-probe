using UITestProbe.Core.Models;

namespace UITestProbe.Core.Collector;

/// <summary>
/// Platform-agnostic interface for the probe element registry.
/// Each Windows UI framework (WPF, WinForms, WinUI/MAUI) provides its own implementation.
/// </summary>
public interface IProbeRegistry
{
    /// <summary>Scans the UI tree and registers all probe-annotated elements.</summary>
    /// <returns>Count of discovered probe elements.</returns>
    int Scan();

    /// <summary>Queries a single element by probe ID, refreshing runtime state.</summary>
    ProbeElement? Query(string id);

    /// <summary>Queries all elements, optionally filtered by type.</summary>
    IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null);

    /// <summary>Returns page-level summary with element list and unready IDs.</summary>
    PageSummary QueryPage();

    /// <summary>Returns direct children of the specified element.</summary>
    IReadOnlyList<ProbeElement> QueryChildren(string id);

    /// <summary>Returns all descendants recursively.</summary>
    IReadOnlyList<ProbeElement> QueryDescendants(string id);

    /// <summary>Checks effective visibility by walking the ancestor chain.</summary>
    bool IsEffectivelyVisible(string id);
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
