import XCTest
import UITestProbe

/// Errors specific to ProbeXCTest operations.
public enum ProbeXCTestError: Error, LocalizedError {
    case elementNotFound(String)
    case pageNotReady(TimeInterval)
    case stateTimeout(String, String, String, TimeInterval)

    public var errorDescription: String? {
        switch self {
        case .elementNotFound(let id):
            return "Probe element '\(id)' not found"
        case .pageNotReady(let timeout):
            return "Page did not become ready within \(timeout)s"
        case .stateTimeout(let id, let key, let value, let timeout):
            return "Element '\(id)' did not reach state \(key)=\(value) within \(timeout)s"
        }
    }
}

public extension XCUIApplication {
    var probe: ProbeXCTest {
        ProbeXCTest(app: self)
    }
}

public class ProbeXCTest {
    private let app: XCUIApplication
    private let registry = ProbeRegistry.shared
    private var deviceProfile: DeviceProfile?
    private let pollInterval: TimeInterval = 0.1

    init(app: XCUIApplication) {
        self.app = app
    }

    public func query(_ probeId: String) throws -> ProbeElement {
        let xcElement = app.descendants(matching: .any).matching(identifier: probeId).firstMatch
        guard xcElement.exists else {
            registry.scan()
            if let element = registry.query(probeId) {
                return element
            }
            throw ProbeXCTestError.elementNotFound(probeId)
        }
        return parseXCUIElement(xcElement, probeId: probeId)
    }

    public func queryAll(type: ProbeType? = nil, screen: String? = nil) -> [ProbeElement] {
        registry.scan()
        return registry.queryAll(type: type, screen: screen)
    }

    public func waitForPageReady(timeout: TimeInterval = 5.0) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        var previousSnapshot: [String: [String: String]] = [:]

        while Date() < deadline {
            registry.scan()
            let allElements = registry.queryAll()
            var currentSnapshot: [String: [String: String]] = [:]
            for element in allElements {
                currentSnapshot[element.id] = element.state
            }
            let hasLoading = allElements.contains {
                $0.state["loading"] == "true"
                || $0.state["submitting"] == "true"
                || $0.state["transitioning"] == "true"
            }
            if !allElements.isEmpty && !hasLoading && currentSnapshot == previousSnapshot {
                return
            }
            previousSnapshot = currentSnapshot
            try await Task.sleep(nanoseconds: UInt64(pollInterval * 1_000_000_000))
        }

        registry.scan()
        let allElements = registry.queryAll()
        let hasLoading = allElements.contains {
            $0.state["loading"] == "true"
            || $0.state["submitting"] == "true"
            || $0.state["transitioning"] == "true"
        }
        if hasLoading || allElements.isEmpty {
            throw ProbeXCTestError.pageNotReady(timeout)
        }
    }

    public func actAndWait(
        _ probeId: String,
        expectStateKey: String,
        expectStateValue: String,
        timeout: TimeInterval = 5.0
    ) async throws -> ProbeElement {
        let xcElement = app.descendants(matching: .any).matching(identifier: probeId).firstMatch
        guard xcElement.exists else {
            throw ProbeXCTestError.elementNotFound(probeId)
        }
        xcElement.tap()

        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            registry.scan()
            if let current = registry.query(probeId),
               current.state[expectStateKey] == expectStateValue {
                return current
            }
            if xcElement.exists {
                let parsed = parseXCUIElement(xcElement, probeId: probeId)
                if parsed.state[expectStateKey] == expectStateValue {
                    return parsed
                }
            }
            try await Task.sleep(nanoseconds: UInt64(pollInterval * 1_000_000_000))
        }

        registry.scan()
        if let current = registry.query(probeId),
           current.state[expectStateKey] == expectStateValue {
            return current
        }
        throw ProbeXCTestError.stateTimeout(probeId, expectStateKey, expectStateValue, timeout)
    }

    public func setDevice(_ device: DeviceProfile) {
        deviceProfile = device
        registry.currentDevice = device
    }

    // MARK: - Private

    private func parseXCUIElement(_ xcElement: XCUIElement, probeId: String) -> ProbeElement {
        let label = xcElement.label
        let value = xcElement.value as? String ?? ""
        let hint = xcElement.accessibilityHint ?? ""
        let hintInfo = parseHint(hint)
        let state = parseState(value)
        let frame = xcElement.frame
        let bounds = [Double(frame.origin.x), Double(frame.origin.y),
                      Double(frame.size.width), Double(frame.size.height)]
        let isVisible = xcElement.exists && xcElement.isHittable
        let isEnabled = xcElement.isEnabled
        var displayLabel: String? = label.isEmpty ? nil : label
        if let l = displayLabel, l.hasPrefix("probe:") {
            displayLabel = String(l.dropFirst("probe:".count))
        }
        return ProbeElement(
            id: probeId, type: hintInfo.type ?? .display, label: displayLabel,
            value: value.isEmpty ? nil : value, state: state, source: hintInfo.source,
            linkage: hintInfo.linkage, bounds: bounds, isVisible: isVisible,
            isEnabled: isEnabled, screen: nil, a11yLabel: label.isEmpty ? nil : label,
            a11yRole: mapElementType(xcElement.elementType), parentId: nil, platformContext: nil
        )
    }

    private func parseHint(_ hint: String) -> (type: ProbeType?, source: String?, linkage: [LinkagePath]) {
        guard !hint.isEmpty else { return (nil, nil, []) }
        var probeType: ProbeType?
        var source: String?
        var linkage: [LinkagePath] = []
        for segment in hint.components(separatedBy: "|") {
            let trimmed = segment.trimmingCharacters(in: .whitespaces)
            if trimmed.hasPrefix("probeType:") {
                probeType = ProbeType(rawValue: String(trimmed.dropFirst("probeType:".count)))
            } else if trimmed.hasPrefix("probeSource:") {
                source = String(trimmed.dropFirst("probeSource:".count))
            } else if trimmed.hasPrefix("probeLinkage:") {
                linkage = parseLinkageString(String(trimmed.dropFirst("probeLinkage:".count)))
            }
        }
        return (probeType, source, linkage)
    }

    private func parseLinkageString(_ str: String) -> [LinkagePath] {
        guard !str.isEmpty else { return [] }
        return str.components(separatedBy: ";").compactMap { pair in
            let parts = pair.components(separatedBy: ":")
            guard parts.count >= 2, let effect = LinkageEffect(rawValue: parts[1]) else { return nil }
            return LinkagePath(targetId: parts[0], effect: effect)
        }
    }

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

    private func mapElementType(_ type: XCUIElement.ElementType) -> String? {
        switch type {
        case .button: return "button"
        case .staticText: return "staticText"
        case .textField: return "textField"
        case .secureTextField: return "secureTextField"
        case .textView: return "textView"
        case .image: return "image"
        case .link: return "link"
        case .switch: return "switch"
        case .slider: return "slider"
        case .picker: return "picker"
        case .table: return "table"
        case .cell: return "cell"
        case .navigationBar: return "navigationBar"
        case .tabBar: return "tabBar"
        case .scrollView: return "scrollView"
        default: return nil
        }
    }
}
