import SwiftUI

// MARK: - Preference Key for Probe Metadata

/// Preference key that collects probe metadata up the SwiftUI view hierarchy.
struct ProbePreferenceKey: PreferenceKey {
    static var defaultValue: [ProbeElement] = []

    static func reduce(value: inout [ProbeElement], nextValue: () -> [ProbeElement]) {
        value.append(contentsOf: nextValue())
    }
}

// MARK: - View Modifiers

/// ViewModifier that attaches a probe identifier to a view.
struct ProbeIdModifier: ViewModifier {
    let id: String

    func body(content: Content) -> some View {
        content
            .accessibilityIdentifier(id)
            .accessibilityLabel("probe:\(id)")
    }
}

/// ViewModifier that attaches a probe type to a view.
struct ProbeTypeModifier: ViewModifier {
    let type: ProbeType

    func body(content: Content) -> some View {
        content
            .accessibilityHint("probeType:\(type.rawValue)")
    }
}

/// ViewModifier that attaches semantic state to a view.
struct ProbeStateModifier: ViewModifier {
    let state: [String: String]

    func body(content: Content) -> some View {
        let encoded = state.map { "\($0.key)=\($0.value)" }.joined(separator: ",")
        content
            .accessibilityValue(encoded)
    }
}

/// ViewModifier that attaches a data source to a view.
struct ProbeSourceModifier: ViewModifier {
    let source: String

    func body(content: Content) -> some View {
        // Store source in a custom accessibility property
        content
            .accessibilityHint("probeSource:\(source)")
    }
}

/// ViewModifier that attaches linkage metadata to a view.
struct ProbeLinkageModifier: ViewModifier {
    let linkage: [LinkagePath]

    func body(content: Content) -> some View {
        let encoded = linkage.map { "\($0.targetId):\($0.effect.rawValue)" }.joined(separator: ";")
        content
            .accessibilityHint("probeLinkage:\(encoded)")
    }
}

// MARK: - View Extensions

public extension View {
    /// Annotate this view with a probe identifier for test discovery.
    ///
    /// - Parameter id: Unique probe ID within the current screen.
    /// - Returns: The modified view with probe metadata attached.
    func probeId(_ id: String) -> some View {
        modifier(ProbeIdModifier(id: id))
    }

    /// Annotate this view with a semantic probe type.
    ///
    /// - Parameter type: The probe type classification.
    /// - Returns: The modified view with type metadata attached.
    func probeType(_ type: ProbeType) -> some View {
        modifier(ProbeTypeModifier(type: type))
    }

    /// Annotate this view with semantic state for test assertions.
    ///
    /// - Parameter state: Key-value pairs representing the element's state.
    /// - Returns: The modified view with state metadata attached.
    func probeState(_ state: [String: String]) -> some View {
        modifier(ProbeStateModifier(state: state))
    }

    /// Annotate this view with a data source identifier.
    ///
    /// - Parameter source: URI or identifier for the data source (e.g., "api:/users").
    /// - Returns: The modified view with source metadata attached.
    func probeSource(_ source: String) -> some View {
        modifier(ProbeSourceModifier(source: source))
    }

    /// Annotate this view with linkage paths to other probe elements.
    ///
    /// - Parameter linkage: Array of linkage paths describing connections to other elements.
    /// - Returns: The modified view with linkage metadata attached.
    func probeLinkage(_ linkage: [LinkagePath]) -> some View {
        modifier(ProbeLinkageModifier(linkage: linkage))
    }
}
