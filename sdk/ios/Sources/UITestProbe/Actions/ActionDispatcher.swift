import Foundation
#if canImport(UIKit)
import UIKit
#endif

/// Errors that can occur during action dispatch.
public enum ActionError: Error, LocalizedError {
    /// The probe element was not found in the registry.
    case elementNotFound(String)
    /// The element is not visible and cannot be interacted with.
    case elementNotVisible(String)
    /// The element is not enabled and cannot be interacted with.
    case elementNotEnabled(String)
    /// The element type is incompatible with the requested action.
    case incompatibleType(String, ProbeType)
    /// The corresponding UIView was not found in the view hierarchy.
    case viewNotFound(String)
    /// The action timed out waiting for the expected state.
    case timeout(String)

    public var errorDescription: String? {
        switch self {
        case .elementNotFound(let id):
            return "Probe element '\(id)' not found in registry"
        case .elementNotVisible(let id):
            return "Probe element '\(id)' is not visible"
        case .elementNotEnabled(let id):
            return "Probe element '\(id)' is not enabled"
        case .incompatibleType(let id, let type):
            return "Probe element '\(id)' has type '\(type.rawValue)' which is incompatible with this action"
        case .viewNotFound(let id):
            return "UIView for probe element '\(id)' not found in view hierarchy"
        case .timeout(let msg):
            return "Timeout: \(msg)"
        }
    }
}

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

    /// Polling interval for state change waits (in seconds).
    private let pollInterval: TimeInterval = 0.05

    public init(registry: ProbeRegistry = .shared) {
        self.registry = registry
    }

    /// Tap a probe element.
    ///
    /// Pre-checks: element must be visible and enabled.
    /// - Parameter probeId: The probe ID to tap.
    /// - Returns: The action result with post-tap state.
    public func tap(_ probeId: String) async throws -> ActionResult {
        let element = try preCheck(probeId)

        #if canImport(UIKit)
        guard let view = findView(for: probeId) else {
            throw ActionError.viewNotFound(probeId)
        }

        await MainActor.run {
            let center = CGPoint(x: view.bounds.midX, y: view.bounds.midY)

            // Send touch events to simulate a tap
            if let control = view as? UIControl {
                control.sendActions(for: .touchUpInside)
            } else {
                // For non-UIControl views, use the first target/action or send touch events
                let touchDown = UITouch()
                _ = touchDown // Touch simulation requires private API in UIKit
                // Fall back to accessibility activation
                view.accessibilityActivate()
            }
        }
        #endif

        // Re-scan and return updated element
        registry.scan()
        let updated = registry.query(probeId) ?? element
        return ActionResult(success: true, element: updated)
    }

    /// Fill a text input probe element with the given text.
    ///
    /// Pre-checks: element must be of type `.form`, visible, and enabled.
    /// - Parameters:
    ///   - probeId: The probe ID of the input element.
    ///   - text: The text to enter.
    /// - Returns: The action result with post-fill state.
    public func fill(_ probeId: String, text: String) async throws -> ActionResult {
        let element = try preCheck(probeId)

        if element.type != .form {
            throw ActionError.incompatibleType(probeId, element.type)
        }

        #if canImport(UIKit)
        guard let view = findView(for: probeId) else {
            throw ActionError.viewNotFound(probeId)
        }

        await MainActor.run {
            if let textField = view as? UITextField {
                textField.text = ""
                textField.insertText(text)
                textField.sendActions(for: .editingChanged)
            } else if let textView = view as? UITextView {
                textView.text = text
                textView.delegate?.textViewDidChange?(textView)
            }
        }
        #endif

        // Re-scan and return updated element
        registry.scan()
        let updated = registry.query(probeId) ?? element
        return ActionResult(success: true, element: updated)
    }

    /// Select a value from a probe element (picker, segmented control).
    ///
    /// Pre-checks: element must be visible and enabled.
    /// - Parameters:
    ///   - probeId: The probe ID of the selectable element.
    ///   - value: The value to select.
    /// - Returns: The action result with post-selection state.
    public func select(_ probeId: String, value: String) async throws -> ActionResult {
        let element = try preCheck(probeId)

        #if canImport(UIKit)
        guard let view = findView(for: probeId) else {
            throw ActionError.viewNotFound(probeId)
        }

        await MainActor.run {
            if let segmented = view as? UISegmentedControl {
                // Find segment matching the value
                for i in 0..<segmented.numberOfSegments {
                    if segmented.titleForSegment(at: i) == value {
                        segmented.selectedSegmentIndex = i
                        segmented.sendActions(for: .valueChanged)
                        break
                    }
                }
            } else if let picker = view as? UIPickerView {
                // Attempt to select a row in the first component matching the value
                let dataSource = picker.dataSource
                let delegate = picker.delegate
                if let rowCount = dataSource?.pickerView(picker, numberOfRowsInComponent: 0) {
                    for row in 0..<rowCount {
                        let title = delegate?.pickerView?(picker, titleForRow: row, forComponent: 0)
                        if title == value {
                            picker.selectRow(row, inComponent: 0, animated: false)
                            delegate?.pickerView?(picker, didSelectRow: row, inComponent: 0)
                            break
                        }
                    }
                }
            } else {
                // Generic fallback: try accessibility-based selection
                view.accessibilityValue = value
            }
        }
        #endif

        // Re-scan and return updated element
        registry.scan()
        let updated = registry.query(probeId) ?? element
        return ActionResult(success: true, element: updated)
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
        // Perform the tap action
        _ = try await tap(probeId)

        // Poll for the expected state change
        let deadline = Date().addingTimeInterval(timeout)

        while Date() < deadline {
            registry.scan()
            if let current = registry.query(probeId),
               current.state[expectStateKey] == expectStateValue {
                return ActionResult(success: true, element: current)
            }
            try await Task.sleep(nanoseconds: UInt64(pollInterval * 1_000_000_000))
        }

        // Final check after timeout
        registry.scan()
        if let current = registry.query(probeId),
           current.state[expectStateKey] == expectStateValue {
            return ActionResult(success: true, element: current)
        }

        let element = registry.query(probeId)!
        throw ActionError.timeout(
            "Element '\(probeId)' did not reach state \(expectStateKey)=\(expectStateValue) within \(timeout)s"
        )
    }

    /// Verify that a probe element's linkage produces the expected effect.
    ///
    /// - Parameter probeId: The probe ID whose linkage to verify.
    /// - Returns: `true` if all linkage effects were observed.
    public func verifyLinkage(_ probeId: String) async throws -> Bool {
        registry.scan()
        guard let element = registry.query(probeId) else {
            throw ActionError.elementNotFound(probeId)
        }

        guard !element.linkage.isEmpty else {
            // No linkage defined -- nothing to verify
            return true
        }

        // Snapshot the state of all linkage targets before the action
        var targetsBefore: [String: ProbeElement] = [:]
        for path in element.linkage {
            if let target = registry.query(path.targetId) {
                targetsBefore[path.targetId] = target
            }
        }

        // Perform the action
        _ = try await tap(probeId)

        // Wait briefly for effects to propagate
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5s

        // Re-scan and verify each linkage target has changed
        registry.scan()

        for path in element.linkage {
            guard let targetAfter = registry.query(path.targetId) else {
                // Target element disappeared -- could be valid for navigate/toggle
                if path.effect == .navigate || path.effect == .visibilityToggle {
                    continue
                }
                return false
            }

            let targetBefore = targetsBefore[path.targetId]

            switch path.effect {
            case .navigate:
                // Verify screen changed or element appeared/disappeared
                if targetAfter.screen == targetBefore?.screen && targetBefore != nil {
                    return false
                }
            case .visibilityToggle:
                // Verify visibility changed
                if targetAfter.isVisible == targetBefore?.isVisible {
                    return false
                }
            case .dataReload:
                // Verify state changed (any state change counts)
                if targetAfter.state == targetBefore?.state {
                    return false
                }
            case .optionsUpdate:
                // Verify options/value changed
                if targetAfter.value == targetBefore?.value {
                    return false
                }
            case .enabledToggle:
                // Verify enabled state changed
                if targetAfter.state == targetBefore?.state {
                    return false
                }
            case .valueUpdate:
                // Verify value changed
                if targetAfter.value == targetBefore?.value {
                    return false
                }
            case .reset:
                // Verify the target's state or value changed
                if targetAfter.state == targetBefore?.state && targetAfter.value == targetBefore?.value {
                    return false
                }
            }
        }

        return true
    }

    // MARK: - Private Helpers

    /// Validate that the element exists, is visible, and is enabled.
    private func preCheck(_ probeId: String) throws -> ProbeElement {
        registry.scan()

        guard let element = registry.query(probeId) else {
            throw ActionError.elementNotFound(probeId)
        }

        guard element.isVisible else {
            throw ActionError.elementNotVisible(probeId)
        }

        guard element.isEnabled else {
            throw ActionError.elementNotEnabled(probeId)
        }

        return element
    }

    #if canImport(UIKit)
    /// Find the UIView corresponding to a probe ID by walking the view hierarchy.
    private func findView(for probeId: String) -> UIView? {
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                if let found = findViewRecursive(in: window, probeId: probeId) {
                    return found
                }
            }
        }
        return nil
    }

    /// Recursively search for a view with the given accessibility identifier.
    private func findViewRecursive(in view: UIView, probeId: String) -> UIView? {
        if view.accessibilityIdentifier == probeId {
            return view
        }
        for subview in view.subviews {
            if let found = findViewRecursive(in: subview, probeId: probeId) {
                return found
            }
        }
        return nil
    }
    #endif
}
