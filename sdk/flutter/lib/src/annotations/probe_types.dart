/// Core types for the UI Test Probe annotation system.

/// Classification of UI elements by their semantic role.
/// Matches the canonical 9-value spec in spec/probe-types.ts.
enum ProbeType {
  /// Table, DataGrid, List, Tree.
  dataContainer,

  /// ComboBox, Select, Dropdown.
  selector,

  /// Button, Link, MenuItem.
  action,

  /// Label, Badge, Counter, Chip.
  display,

  /// Image, Video, Audio, Canvas.
  media,

  /// Input, TextArea, Checkbox, Radio.
  form,

  /// Page-level container — anchor for waitForPageReady().
  page,

  /// Dialog, Drawer, Popover, Tooltip.
  modal,

  /// Tabs, Breadcrumb, Sidebar, Paginator.
  navigation,
}

/// The effect type of a linkage between probe elements.
/// Matches the canonical 7-value spec in spec/probe-types.ts.
enum LinkageEffect {
  /// Updates available options in a selector.
  optionsUpdate,

  /// Triggers data reload via API.
  dataReload,

  /// Shows or hides another element.
  visibilityToggle,

  /// Enables or disables another element.
  enabledToggle,

  /// Updates the value of another element.
  valueUpdate,

  /// Resets another element to default state.
  reset,

  /// Triggers navigation to a different route.
  navigate,
}

/// Describes a linkage path from one probe element to another.
class LinkagePath {
  /// The probe ID of the target element.
  final String targetId;

  /// The effect this linkage produces.
  final LinkageEffect effect;

  /// Optional condition that must be met for this linkage to activate.
  final String? condition;

  const LinkagePath({
    required this.targetId,
    required this.effect,
    this.condition,
  });

  @override
  String toString() => 'LinkagePath($targetId, $effect)';
}

/// Describes the device profile for cross-device testing.
class DeviceProfile {
  /// Device name (e.g., "iPhone 15 Pro", "Pixel 8").
  final String name;

  /// Logical screen width in dp/pt.
  final double width;

  /// Logical screen height in dp/pt.
  final double height;

  /// Device pixel ratio.
  final double pixelRatio;

  /// Platform identifier (ios, android, web).
  final String platform;

  const DeviceProfile({
    required this.name,
    required this.width,
    required this.height,
    this.pixelRatio = 1.0,
    required this.platform,
  });
}

/// Platform context information captured at scan time.
class PlatformContext {
  /// The platform (ios, android, web, macos, linux, windows).
  final String platform;

  /// OS version string.
  final String osVersion;

  /// Device profile if available.
  final DeviceProfile? device;

  /// Locale identifier (e.g., "en_US").
  final String locale;

  /// Whether dark mode is active.
  final bool isDarkMode;

  /// Text scale factor.
  final double textScaleFactor;

  const PlatformContext({
    required this.platform,
    required this.osVersion,
    this.device,
    required this.locale,
    this.isDarkMode = false,
    this.textScaleFactor = 1.0,
  });
}

/// A fully-resolved probe element with all 15 fields from the spec.
class ProbeElement {
  /// Unique probe identifier.
  final String id;

  /// Semantic type classification.
  final ProbeType type;

  /// Human-readable label.
  final String? label;

  /// Current value (for inputs/displays).
  final dynamic value;

  /// Semantic state map (e.g., {"enabled": true, "loading": false}).
  final Map<String, dynamic> state;

  /// Data source URI or identifier.
  final String? source;

  /// Linkage paths to other probe elements.
  final List<LinkagePath> linkage;

  /// Bounding box: [x, y, width, height] in logical pixels.
  final List<double>? bounds;

  /// Whether the element is effectively visible on screen.
  final bool isVisible;

  /// Whether the element is enabled for interaction.
  final bool isEnabled;

  /// The screen/route this element belongs to.
  final String? screen;

  /// Accessibility label.
  final String? a11yLabel;

  /// Accessibility role.
  final String? a11yRole;

  /// Parent probe ID in the hierarchy.
  final String? parentId;

  /// Platform context at capture time.
  final PlatformContext? platformContext;

  const ProbeElement({
    required this.id,
    required this.type,
    this.label,
    this.value,
    this.state = const {},
    this.source,
    this.linkage = const [],
    this.bounds,
    this.isVisible = true,
    this.isEnabled = true,
    this.screen,
    this.a11yLabel,
    this.a11yRole,
    this.parentId,
    this.platformContext,
  });

  @override
  String toString() => 'ProbeElement($id, $type)';
}
