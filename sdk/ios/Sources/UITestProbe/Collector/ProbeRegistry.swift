import Foundation

/// Discovers and indexes annotated views via the accessibility tree.
///
/// At test time, `ProbeRegistry` scans the view hierarchy for views
/// annotated with probe modifiers and builds a queryable index of
/// `ProbeElement` instances.
public class ProbeRegistry {
    /// Singleton shared instance.
    public static let shared = ProbeRegistry()

    /// Internal storage of discovered probe elements keyed by ID.
    private var elements: [String: ProbeElement] = [:]

    private init() {}

    /// Scan the current view hierarchy and rebuild the probe registry.
    ///
    /// Walks the accessibility tree looking for views with probe annotations
    /// and extracts their metadata into `ProbeElement` objects.
    public func scan() {
        // TODO: walk accessibility tree, parse probe metadata from accessibility properties
        fatalError("ProbeRegistry.scan() not yet implemented")
    }

    /// Query a single probe element by its ID.
    ///
    /// - Parameter probeId: The unique probe identifier.
    /// - Returns: The matching `ProbeElement`, or `nil` if not found.
    public func query(_ probeId: String) -> ProbeElement? {
        // TODO: look up element in registry
        fatalError("ProbeRegistry.query() not yet implemented")
    }

    /// Query all probe elements matching optional filters.
    ///
    /// - Parameters:
    ///   - type: If provided, only return elements of this type.
    ///   - screen: If provided, only return elements on this screen.
    /// - Returns: Array of matching `ProbeElement` instances.
    public func queryAll(type: ProbeType? = nil, screen: String? = nil) -> [ProbeElement] {
        // TODO: filter elements by type and/or screen
        fatalError("ProbeRegistry.queryAll() not yet implemented")
    }

    /// Reset the registry, clearing all discovered elements.
    public func reset() {
        elements.removeAll()
    }
}
