import Foundation

/// Classification of UI elements by their semantic role.
public enum ProbeType: String, Codable, Sendable {
    /// Interactive control (button, toggle, slider).
    case control
    /// Data display element (text, label, badge).
    case display
    /// Data input element (text field, picker, checkbox).
    case input
    /// Navigation element (tab, link, drawer item).
    case navigation
    /// Layout container (card, list, section).
    case container
    /// Media element (image, video, audio).
    case media
    /// Feedback element (toast, snackbar, dialog).
    case feedback
}

/// The effect type of a linkage between probe elements.
public enum LinkageEffect: String, Codable, Sendable {
    /// Navigates to a different screen or route.
    case navigate
    /// Shows or hides another element.
    case toggle
    /// Triggers a data refresh or fetch.
    case refresh
    /// Submits data (form submission, API call).
    case submit
    /// Filters or sorts displayed data.
    case filter
    /// Opens a modal, dialog, or overlay.
    case overlay
}

/// Describes a linkage path from one probe element to another.
public struct LinkagePath: Codable, Sendable {
    /// The probe ID of the target element.
    public let targetId: String
    /// The effect this linkage produces.
    public let effect: LinkageEffect
    /// Optional condition that must be met for this linkage to activate.
    public let condition: String?

    public init(targetId: String, effect: LinkageEffect, condition: String? = nil) {
        self.targetId = targetId
        self.effect = effect
        self.condition = condition
    }
}

/// Describes the device profile for cross-device testing.
public struct DeviceProfile: Codable, Sendable {
    /// Device name (e.g., "iPhone 15 Pro", "iPad Air").
    public let name: String
    /// Logical screen width in points.
    public let width: Double
    /// Logical screen height in points.
    public let height: Double
    /// Device pixel ratio (scale factor).
    public let pixelRatio: Double
    /// Platform identifier ("ios", "macos").
    public let platform: String

    public init(name: String, width: Double, height: Double, pixelRatio: Double = 1.0, platform: String) {
        self.name = name
        self.width = width
        self.height = height
        self.pixelRatio = pixelRatio
        self.platform = platform
    }
}

/// Platform context information captured at scan time.
public struct PlatformContext: Codable, Sendable {
    /// The platform ("ios", "macos").
    public let platform: String
    /// OS version string.
    public let osVersion: String
    /// Device profile if available.
    public let device: DeviceProfile?
    /// Locale identifier (e.g., "en_US").
    public let locale: String
    /// Whether dark mode is active.
    public let isDarkMode: Bool
    /// Text scale factor (Dynamic Type).
    public let textScaleFactor: Double

    public init(
        platform: String,
        osVersion: String,
        device: DeviceProfile? = nil,
        locale: String,
        isDarkMode: Bool = false,
        textScaleFactor: Double = 1.0
    ) {
        self.platform = platform
        self.osVersion = osVersion
        self.device = device
        self.locale = locale
        self.isDarkMode = isDarkMode
        self.textScaleFactor = textScaleFactor
    }
}

/// A fully-resolved probe element with all 15 fields from the spec.
public struct ProbeElement: Codable, Sendable {
    /// Unique probe identifier.
    public let id: String
    /// Semantic type classification.
    public let type: ProbeType
    /// Human-readable label.
    public let label: String?
    /// Current value (encoded as String for Codable compliance).
    public let value: String?
    /// Semantic state map (e.g., ["enabled": "true", "loading": "false"]).
    public let state: [String: String]
    /// Data source URI or identifier.
    public let source: String?
    /// Linkage paths to other probe elements.
    public let linkage: [LinkagePath]
    /// Bounding box: [x, y, width, height] in points.
    public let bounds: [Double]?
    /// Whether the element is effectively visible on screen.
    public let isVisible: Bool
    /// Whether the element is enabled for interaction.
    public let isEnabled: Bool
    /// The screen/route this element belongs to.
    public let screen: String?
    /// Accessibility label.
    public let a11yLabel: String?
    /// Accessibility role.
    public let a11yRole: String?
    /// Parent probe ID in the hierarchy.
    public let parentId: String?
    /// Platform context at capture time.
    public let platformContext: PlatformContext?

    public init(
        id: String,
        type: ProbeType,
        label: String? = nil,
        value: String? = nil,
        state: [String: String] = [:],
        source: String? = nil,
        linkage: [LinkagePath] = [],
        bounds: [Double]? = nil,
        isVisible: Bool = true,
        isEnabled: Bool = true,
        screen: String? = nil,
        a11yLabel: String? = nil,
        a11yRole: String? = nil,
        parentId: String? = nil,
        platformContext: PlatformContext? = nil
    ) {
        self.id = id
        self.type = type
        self.label = label
        self.value = value
        self.state = state
        self.source = source
        self.linkage = linkage
        self.bounds = bounds
        self.isVisible = isVisible
        self.isEnabled = isEnabled
        self.screen = screen
        self.a11yLabel = a11yLabel
        self.a11yRole = a11yRole
        self.parentId = parentId
        self.platformContext = platformContext
    }
}
