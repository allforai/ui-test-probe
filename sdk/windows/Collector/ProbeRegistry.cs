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
    /// Performs a full scan of the visual tree starting from the root page.
    /// Discovers all controls with Probe.Id attached properties and
    /// builds ProbeElement records from their annotations + runtime state.
    /// </summary>
    /// <param name="root">The root visual element (typically a Page) to scan from.</param>
    /// <returns>Count of registered probe elements found.</returns>
    public int Scan(Microsoft.Maui.Controls.VisualElement root)
    {
        // TODO: Walk the MAUI visual tree recursively.
        // For each element with Probe.GetId(element) != null:
        //   1. Read attached properties (Id, Type, State, Source, Linkage, Children)
        //   2. Map to ProbeType enum
        //   3. Read layout bounds via element.Bounds
        //   4. Parse Source string into SourceInfo
        //   5. Parse Linkage string into LinkageInfo
        //   6. Construct ProbeElement and register in _elements dict
        throw new NotImplementedException();
    }

    /// <summary>
    /// Queries a single registered element by its probe ID.
    /// </summary>
    /// <param name="id">Semantic probe identifier (e.g., "order-table").</param>
    /// <returns>The matching ProbeElement, or null if not found.</returns>
    public ProbeElement? Query(string id)
    {
        // TODO: Look up element in registry, refresh runtime state
        // (bounds, visibility, data values) before returning.
        throw new NotImplementedException();
    }

    /// <summary>
    /// Queries all registered elements, optionally filtered by type.
    /// </summary>
    /// <param name="type">Optional type filter. Null returns all elements.</param>
    /// <returns>List of matching ProbeElements with refreshed state.</returns>
    public IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null)
    {
        // TODO: Return all elements from registry, optionally filtered.
        // Refresh runtime state for each before returning.
        throw new NotImplementedException();
    }

    /// <summary>
    /// Returns the page-level probe summary: page element, all child
    /// elements, and any elements not yet in a ready state.
    /// </summary>
    /// <returns>Page summary with element list and unready element IDs.</returns>
    public PageSummary QueryPage()
    {
        // TODO: Find the Page-type element, collect all registered elements,
        // identify those with state != "loaded".
        throw new NotImplementedException();
    }

    /// <summary>
    /// Returns direct children of the specified probe element.
    /// </summary>
    public IReadOnlyList<ProbeElement> QueryChildren(string id)
    {
        // TODO: Use parent/children hierarchy from registry.
        throw new NotImplementedException();
    }

    /// <summary>
    /// Returns all descendants of the specified probe element.
    /// </summary>
    public IReadOnlyList<ProbeElement> QueryDescendants(string id)
    {
        // TODO: Recursive walk through children hierarchy.
        throw new NotImplementedException();
    }

    /// <summary>
    /// Checks effective visibility by walking the ancestor chain.
    /// A child may be visible but its parent hidden, making it effectively invisible.
    /// </summary>
    public bool IsEffectivelyVisible(string id)
    {
        // TODO: Walk parent chain; return false if any ancestor is not visible.
        throw new NotImplementedException();
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
