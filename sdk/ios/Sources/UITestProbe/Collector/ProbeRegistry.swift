import Foundation
#if canImport(UIKit)
import UIKit
#endif

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

    /// The current device profile for platform context.
    public var currentDevice: DeviceProfile?

    private init() {}

    /// Scan the current view hierarchy and rebuild the probe registry.
    ///
    /// Walks the accessibility tree looking for views with probe annotations
    /// and extracts their metadata into `ProbeElement` objects.
    public func scan() {
        elements.removeAll()

        #if canImport(UIKit)
        // Walk all UIWindow instances and their subview trees
        for scene in UIApplication.shared.connectedScenes {
            guard let windowScene = scene as? UIWindowScene else { continue }
            for window in windowScene.windows {
                walkView(window, parentId: nil)
            }
        }
        #endif
    }

    /// Register a probe element directly (useful for SwiftUI preference-based collection).
    ///
    /// - Parameter element: The probe element to register.
    public func register(_ element: ProbeElement) {
        elements[element.id] = element
    }

    /// Query a single probe element by its ID.
    ///
    /// - Parameter probeId: The unique probe identifier.
    /// - Returns: The matching `ProbeElement`, or `nil` if not found.
    public func query(_ probeId: String) -> ProbeElement? {
        return elements[probeId]
    }

    /// Query all probe elements matching optional filters.
    ///
    /// - Parameters:
    ///   - type: If provided, only return elements of this type.
    ///   - screen: If provided, only return elements on this screen.
    /// - Returns: Array of matching `ProbeElement` instances.
    public func queryAll(type: ProbeType? = nil, screen: String? = nil) -> [ProbeElement] {
        var results = Array(elements.values)

        if let type = type {
            results = results.filter { $0.type == type }
        }

        if let screen = screen {
            results = results.filter { $0.screen == screen }
        }

        return results
    }

    /// Reset the registry, clearing all discovered elements.
    public func reset() {
        elements.removeAll()
    }

    // MARK: - Private Helpers

    #if canImport(UIKit)
    /// Recursively walk a UIView hierarchy, parsing probe annotations.
    private func walkView(_ view: UIView, parentId: String?) {
        if let probeId = view.accessibilityIdentifier, !probeId.isEmpty {
            let element = parseProbeElement(from: view, probeId: probeId, parentId: parentId)
            elements[probeId] = element

            // Continue walking children with this view as parent
            for subview in view.subviews {
                walkView(subview, parentId: probeId)
            }
        } else {
            // Not a probe element -- keep walking children with same parent
            for subview in view.subviews {
                walkView(subview, parentId: parentId)
            }
        }
    }

    /// Parse a UIView's accessibility properties into a ProbeElement.
    private func parseProbeElement(from view: UIView, probeId: String, parentId: String?) -> ProbeElement {
        let hint = view.accessibilityHint ?? ""
        let valueStr = view.accessibilityValue ?? ""
        let label = view.accessibilityLabel

        // Parse hint: "probeType:control|probeSource:api:/users|probeLinkage:t1:navigate;t2:toggle"
        let hintParts = parseHint(hint)
        let probeType = hintParts.type ?? .display
        let source = hintParts.source
        let linkage = hintParts.linkage

        // Parse state from accessibilityValue: "key1=value1,key2=value2"
        let state = parseState(valueStr)

        // Extract bounds
        let frame = view.convert(view.bounds, to: nil)
        let bounds = [Double(frame.origin.x), Double(frame.origin.y),
                      Double(frame.size.width), Double(frame.size.height)]

        // Determine visibility: not hidden, not zero-size, alpha > 0, within a window
        let isVisible = !view.isHidden
            && view.alpha > 0
            && view.frame.size.width > 0
            && view.frame.size.height > 0
            && view.window != nil

        let isEnabled: Bool
        if let control = view as? UIControl {
            isEnabled = control.isEnabled
        } else {
            isEnabled = view.isUserInteractionEnabled
        }

        // Clean up label: strip "probe:" prefix if present
        var displayLabel = label
        if let l = label, l.hasPrefix("probe:") {
            displayLabel = String(l.dropFirst("probe:".count))
        }

        // Build platform context
        let platformContext = buildPlatformContext()

        return ProbeElement(
            id: probeId,
            type: probeType,
            label: displayLabel,
            value: view.accessibilityValue,
            state: state,
            source: source,
            linkage: linkage,
            bounds: bounds,
            isVisible: isVisible,
            isEnabled: isEnabled,
            screen: nil,
            a11yLabel: label,
            a11yRole: accessibilityRoleString(for: view),
            parentId: parentId,
            platformContext: platformContext
        )
    }

    /// Parse the accessibilityHint into type, source, and linkage components.
    private func parseHint(_ hint: String) -> (type: ProbeType?, source: String?, linkage: [LinkagePath]) {
        guard !hint.isEmpty else {
            return (nil, nil, [])
        }

        var probeType: ProbeType?
        var source: String?
        var linkage: [LinkagePath] = []

        // Split by pipe for combined hints
        let segments = hint.components(separatedBy: "|")
        for segment in segments {
            let trimmed = segment.trimmingCharacters(in: .whitespaces)

            if trimmed.hasPrefix("probeType:") {
                let typeStr = String(trimmed.dropFirst("probeType:".count))
                probeType = ProbeType(rawValue: typeStr)
            } else if trimmed.hasPrefix("probeSource:") {
                source = String(trimmed.dropFirst("probeSource:".count))
            } else if trimmed.hasPrefix("probeLinkage:") {
                let linkageStr = String(trimmed.dropFirst("probeLinkage:".count))
                linkage = parseLinkage(linkageStr)
            }
        }

        return (probeType, source, linkage)
    }

    /// Parse linkage string: "targetId:effect;targetId2:effect2"
    private func parseLinkage(_ str: String) -> [LinkagePath] {
        guard !str.isEmpty else { return [] }

        return str.components(separatedBy: ";").compactMap { pair in
            let parts = pair.components(separatedBy: ":")
            guard parts.count >= 2,
                  let effect = LinkageEffect(rawValue: parts[1]) else {
                return nil
            }
            return LinkagePath(targetId: parts[0], effect: effect)
        }
    }

    /// Parse state string: "key1=value1,key2=value2" into dictionary.
    private func parseState(_ str: String) -> [String: String] {
        guard !str.isEmpty else { return [:] }

        var state: [String: String] = [:]
        for pair in str.components(separatedBy: ",") {
            let kv = pair.components(separatedBy: "=")
            if kv.count == 2 {
                state[kv[0].trimmingCharacters(in: .whitespaces)] = kv[1].trimmingCharacters(in: .whitespaces)
            }
        }
        return state
    }

    /// Map UIKit accessibility traits to a role string.
    private func accessibilityRoleString(for view: UIView) -> String? {
        let traits = view.accessibilityTraits

        if traits.contains(.button) { return "button" }
        if traits.contains(.link) { return "link" }
        if traits.contains(.image) { return "image" }
        if traits.contains(.header) { return "header" }
        if traits.contains(.searchField) { return "searchField" }
        if traits.contains(.adjustable) { return "adjustable" }
        if traits.contains(.staticText) { return "staticText" }
        if traits.contains(.tabBar) { return "tabBar" }

        if view is UITextField || view is UITextView { return "textField" }
        if view is UISwitch { return "switch" }
        if view is UISlider { return "slider" }
        if view is UIImageView { return "image" }

        return nil
    }

    /// Build platform context from the current environment.
    private func buildPlatformContext() -> PlatformContext {
        let device = currentDevice ?? DeviceProfile(
            name: UIDevice.current.name,
            width: Double(UIScreen.main.bounds.width),
            height: Double(UIScreen.main.bounds.height),
            pixelRatio: Double(UIScreen.main.scale),
            platform: "ios"
        )

        return PlatformContext(
            platform: "ios",
            osVersion: UIDevice.current.systemVersion,
            device: device,
            locale: Locale.current.identifier,
            isDarkMode: UITraitCollection.current.userInterfaceStyle == .dark,
            textScaleFactor: Double(UIApplication.shared.preferredContentSizeCategory.rawValue.count) / 10.0
        )
    }
    #endif
}
