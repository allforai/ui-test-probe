import Foundation

/// Result of a dispatched action.
public struct ActionResult: Sendable {
    /// Whether the action completed successfully.
    public let success: Bool
    /// The probe element after the action was performed.
    public let element: ProbeElement
    /// Error message if the action failed.
    public let error: String?

    public init(success: Bool, element: ProbeElement, error: String? = nil) {
        self.success = success
        self.element = element
        self.error = error
    }
}

/// Dispatches semantic actions against probe elements by their IDs.
///
/// All actions perform pre-checks (visibility, enabled state) before
/// executing and return an `ActionResult` with the post-action state.
public class ActionDispatcher {
    /// The probe registry for element lookup.
    private let registry: ProbeRegistry

    public init(registry: ProbeRegistry = .shared) {
        self.registry = registry
    }

    /// Tap a probe element.
    ///
    /// Pre-checks: element must be visible and enabled.
    /// - Parameter probeId: The probe ID to tap.
    /// - Returns: The action result with post-tap state.
    public func tap(_ probeId: String) async throws -> ActionResult {
        // TODO: validate element state, perform tap via accessibility API, return result
        fatalError("ActionDispatcher.tap() not yet implemented")
    }

    /// Fill a text input probe element with the given text.
    ///
    /// Pre-checks: element must be of type `.input`, visible, and enabled.
    /// - Parameters:
    ///   - probeId: The probe ID of the input element.
    ///   - text: The text to enter.
    /// - Returns: The action result with post-fill state.
    public func fill(_ probeId: String, text: String) async throws -> ActionResult {
        // TODO: validate input type, clear existing text, enter new text
        fatalError("ActionDispatcher.fill() not yet implemented")
    }

    /// Select a value from a probe element (picker, segmented control).
    ///
    /// Pre-checks: element must be visible and enabled.
    /// - Parameters:
    ///   - probeId: The probe ID of the selectable element.
    ///   - value: The value to select.
    /// - Returns: The action result with post-selection state.
    public func select(_ probeId: String, value: String) async throws -> ActionResult {
        // TODO: validate element, perform selection
        fatalError("ActionDispatcher.select() not yet implemented")
    }

    /// Perform an action and wait for a state change.
    ///
    /// - Parameters:
    ///   - probeId: The probe ID to act on.
    ///   - expectStateKey: The state key to monitor.
    ///   - expectStateValue: The expected state value.
    ///   - timeout: Maximum time to wait for the state change.
    /// - Returns: The action result after the state change.
    public func actAndWait(
        _ probeId: String,
        expectStateKey: String,
        expectStateValue: String,
        timeout: TimeInterval = 5.0
    ) async throws -> ActionResult {
        // TODO: execute tap, poll for state change with timeout
        fatalError("ActionDispatcher.actAndWait() not yet implemented")
    }

    /// Verify that a probe element's linkage produces the expected effect.
    ///
    /// - Parameter probeId: The probe ID whose linkage to verify.
    /// - Returns: `true` if all linkage effects were observed.
    public func verifyLinkage(_ probeId: String) async throws -> Bool {
        // TODO: resolve linkage paths, trigger element, verify effects on targets
        fatalError("ActionDispatcher.verifyLinkage() not yet implemented")
    }
}
