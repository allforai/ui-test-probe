package com.allforai.uitestprobe.models

/**
 * Classification of UI elements by their semantic role.
 * Matches the canonical 9-value spec in spec/probe-types.ts.
 */
enum class ProbeType {
    /** Table, DataGrid, List, Tree. */
    DATA_CONTAINER,
    /** ComboBox, Select, Dropdown. */
    SELECTOR,
    /** Button, Link, MenuItem. */
    ACTION,
    /** Label, Badge, Counter, Chip. */
    DISPLAY,
    /** Image, Video, Audio, Canvas. */
    MEDIA,
    /** Input, TextArea, Checkbox, Radio. */
    FORM,
    /** Page-level container — anchor for waitForPageReady(). */
    PAGE,
    /** Dialog, Drawer, Popover, Tooltip. */
    MODAL,
    /** Tabs, Breadcrumb, Sidebar, Paginator. */
    NAVIGATION,
}

/**
 * The effect type of a linkage between probe elements.
 * Matches the canonical 7-value spec in spec/probe-types.ts.
 */
enum class LinkageEffect {
    /** Updates available options in a selector. */
    OPTIONS_UPDATE,
    /** Triggers data reload via API. */
    DATA_RELOAD,
    /** Shows or hides another element. */
    VISIBILITY_TOGGLE,
    /** Enables or disables another element. */
    ENABLED_TOGGLE,
    /** Updates the value of another element. */
    VALUE_UPDATE,
    /** Resets another element to default state. */
    RESET,
    /** Triggers navigation to a different route. */
    NAVIGATE,
}

/**
 * Describes a linkage path from one probe element to another.
 */
sealed class LinkagePath {
    /** The probe ID of the target element. */
    abstract val targetId: String
    /** The effect this linkage produces. */
    abstract val effect: LinkageEffect
    /** Optional condition that must be met for this linkage to activate. */
    abstract val condition: String?

    data class Simple(
        override val targetId: String,
        override val effect: LinkageEffect,
        override val condition: String? = null,
    ) : LinkagePath()

    data class Conditional(
        override val targetId: String,
        override val effect: LinkageEffect,
        override val condition: String,
    ) : LinkagePath()
}

/**
 * Describes the device profile for cross-device testing.
 */
data class DeviceProfile(
    /** Device name (e.g., "Pixel 8", "Galaxy S24"). */
    val name: String,
    /** Logical screen width in dp. */
    val width: Double,
    /** Logical screen height in dp. */
    val height: Double,
    /** Device pixel ratio (density). */
    val pixelRatio: Double = 1.0,
    /** Platform identifier ("android"). */
    val platform: String = "android",
)

/**
 * Platform context information captured at scan time.
 */
data class PlatformContext(
    /** The platform ("android"). */
    val platform: String = "android",
    /** OS version string (e.g., "14"). */
    val osVersion: String,
    /** Device profile if available. */
    val device: DeviceProfile? = null,
    /** Locale identifier (e.g., "en_US"). */
    val locale: String,
    /** Whether dark mode is active. */
    val isDarkMode: Boolean = false,
    /** Font scale factor. */
    val fontScale: Float = 1.0f,
)

/**
 * A fully-resolved probe element with all 15 fields from the spec.
 */
data class ProbeElement(
    /** Unique probe identifier. */
    val id: String,
    /** Semantic type classification. */
    val type: ProbeType,
    /** Human-readable label. */
    val label: String? = null,
    /** Current value (for inputs/displays). */
    val value: Any? = null,
    /** Semantic state map (e.g., mapOf("enabled" to true)). */
    val state: Map<String, Any> = emptyMap(),
    /** Data source URI or identifier. */
    val source: String? = null,
    /** Linkage paths to other probe elements. */
    val linkage: List<LinkagePath> = emptyList(),
    /** Bounding box: [x, y, width, height] in dp. */
    val bounds: List<Float>? = null,
    /** Whether the element is effectively visible on screen. */
    val isVisible: Boolean = true,
    /** Whether the element is enabled for interaction. */
    val isEnabled: Boolean = true,
    /** The screen/route this element belongs to. */
    val screen: String? = null,
    /** Accessibility content description. */
    val a11yLabel: String? = null,
    /** Accessibility role. */
    val a11yRole: String? = null,
    /** Parent probe ID in the hierarchy. */
    val parentId: String? = null,
    /** Platform context at capture time. */
    val platformContext: PlatformContext? = null,
)
