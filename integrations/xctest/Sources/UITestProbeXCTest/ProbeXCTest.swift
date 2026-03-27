import XCTest
import UITestProbe

/// Extension on `XCUIApplication` providing probe-aware testing capabilities.
///
/// Usage:
/// ```swift
/// let app = XCUIApplication()
/// app.launch()
///
/// let element = app.probe.query("login-submit")
/// try await app.probe.actAndWait("login-submit", expectStateKey: "loading", expectStateValue: "false")
/// ```
public extension XCUIApplication {
    /// Access the probe testing API for this application.
    var probe: ProbeXCTest {
        ProbeXCTest(app: self)
    }
}

/// Probe-aware XCTest helper wrapping an `XCUIApplication`.
public class ProbeXCTest {
    /// The underlying XCUIApplication.
    private let app: XCUIApplication

    /// The probe registry for element discovery.
    private let registry = ProbeRegistry.shared

    init(app: XCUIApplication) {
        self.app = app
    }

    /// Query a single probe element by ID.
    ///
    /// - Parameter probeId: The unique probe identifier.
    /// - Returns: The matching `ProbeElement`.
    /// - Throws: If the element is not found.
    public func query(_ probeId: String) throws -> ProbeElement {
        // TODO: scan accessibility hierarchy via XCUIElement queries, return ProbeElement
        fatalError("ProbeXCTest.query() not yet implemented")
    }

    /// Query all probe elements, optionally filtered.
    ///
    /// - Parameters:
    ///   - type: If provided, only return elements of this type.
    ///   - screen: If provided, only return elements on this screen.
    /// - Returns: Array of matching `ProbeElement` instances.
    public func queryAll(type: ProbeType? = nil, screen: String? = nil) -> [ProbeElement] {
        // TODO: delegate to registry with filters
        fatalError("ProbeXCTest.queryAll() not yet implemented")
    }

    /// Wait for the current page to be fully loaded and idle.
    ///
    /// Waits for all XCUIElement existence predicates to stabilize
    /// and all probe elements to report stable states.
    ///
    /// - Parameter timeout: Maximum wait time.
    public func waitForPageReady(timeout: TimeInterval = 5.0) async throws {
        // TODO: use XCTNSPredicateExpectation + probe state stability check
        fatalError("ProbeXCTest.waitForPageReady() not yet implemented")
    }

    /// Perform an action on a probe element and wait for an expected state.
    ///
    /// Taps the element identified by `probeId`, then waits for the
    /// target element to reach the expected state.
    ///
    /// - Parameters:
    ///   - probeId: The probe ID to act on.
    ///   - expectStateKey: The state key to monitor.
    ///   - expectStateValue: The expected value.
    ///   - timeout: Maximum wait time.
    /// - Returns: The probe element after the state change.
    public func actAndWait(
        _ probeId: String,
        expectStateKey: String,
        expectStateValue: String,
        timeout: TimeInterval = 5.0
    ) async throws -> ProbeElement {
        // TODO: find XCUIElement by accessibility ID, tap, poll for state
        fatalError("ProbeXCTest.actAndWait() not yet implemented")
    }

    /// Set the simulated device profile for responsive testing.
    ///
    /// Note: In XCTest UI tests, device simulation is limited to what
    /// the test runner supports. This configures the probe context.
    ///
    /// - Parameter device: The device profile to simulate.
    public func setDevice(_ device: DeviceProfile) {
        // TODO: configure probe context with device profile
        fatalError("ProbeXCTest.setDevice() not yet implemented")
    }
}
