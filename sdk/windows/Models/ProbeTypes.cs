namespace UITestProbe.Models;

/// <summary>
/// Control type classification. Maps to the unified ProbeType enum
/// across all platforms.
/// </summary>
public enum ProbeType
{
    DataContainer,   // Table / DataGrid / List / Tree
    Selector,        // ComboBox / Select / Dropdown
    Action,          // Button / Link / MenuItem
    Display,         // Label / Badge / Counter / Chip
    Media,           // Image / Video / Audio / Canvas
    Form,            // Input / TextArea / Checkbox / Radio
    Page,            // Page-level container
    Modal,           // Dialog / Drawer / Popover / Tooltip
    Navigation,      // Tabs / Breadcrumb / Sidebar / Paginator
}

/// <summary>
/// Effect produced on a linkage target when the source element changes.
/// </summary>
public enum LinkageEffect
{
    OptionsUpdate,
    DataReload,
    VisibilityToggle,
    EnabledToggle,
    ValueUpdate,
    Reset,
    Navigate,
}

/// <summary>
/// Unified probe element model (15 properties + type-level extensions).
/// All platforms map their native UI trees to this structure.
/// Empty/null fields are omitted from serialization.
/// </summary>
public record ProbeElement
{
    // === Element Registry ===
    public required string Id { get; init; }
    public required ProbeType Type { get; init; }
    public AccessibilityInfo? Accessibility { get; init; }

    // === State Exposure ===
    public required StateInfo State { get; init; }

    // === Data (structure varies by Type) ===
    public DataInfo? Data { get; init; }

    // === Source Binding ===
    public SourceInfo? Source { get; init; }

    // === Linkage ===
    public LinkageInfo? Linkage { get; init; }

    // === Layout Metrics ===
    public required LayoutInfo Layout { get; init; }

    // === Shortcuts ===
    public IReadOnlyList<ShortcutInfo>? Shortcuts { get; init; }

    // === Animation ===
    public AnimationInfo? Animation { get; init; }

    // === Locale ===
    public LocaleInfo? Locale { get; init; }

    // === Theme ===
    public ThemeInfo? Theme { get; init; }

    // === Event Bindings ===
    public IReadOnlyList<string>? EventBindings { get; init; }

    // === Session ===
    public SessionInfo? Session { get; init; }

    // === Hierarchy ===
    public string? Parent { get; init; }
    public IReadOnlyList<string>? Children { get; init; }
}

public record AccessibilityInfo
{
    public string? Role { get; init; }
    public string? Label { get; init; }
    public int? TabIndex { get; init; }
}

public record StateInfo
{
    public required string Current { get; init; }
    public string? Previous { get; init; }
    public long Timestamp { get; init; }
    public bool? IsOpen { get; init; }
    public IReadOnlyList<ValidationError>? ValidationErrors { get; init; }
}

public record ValidationError
{
    public required string Field { get; init; }
    public required string Message { get; init; }
}

/// <summary>
/// Data payload — structure depends on the element's ProbeType.
/// DataContainer: rows, columns, sort, filter, selectedRows.
/// Media: currentTime, duration, readyState, paused, networkState.
/// General: value, options.
/// </summary>
public record DataInfo
{
    public object? Value { get; init; }
    public IReadOnlyList<string>? Options { get; init; }
    public int? Rows { get; init; }
    public IReadOnlyList<ColumnInfo>? Columns { get; init; }
    public SortInfo? Sort { get; init; }
    public IReadOnlyList<FilterInfo>? Filter { get; init; }
    public IReadOnlyList<string>? SelectedRows { get; init; }

    // Media extensions
    public double? CurrentTime { get; init; }
    public double? Duration { get; init; }
    public int? ReadyState { get; init; }
    public bool? Paused { get; init; }
    public int? NetworkState { get; init; }
}

public record ColumnInfo
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public bool Visible { get; init; }
}

public record SortInfo
{
    public required string Column { get; init; }
    public required string Direction { get; init; } // "asc" | "desc"
}

public record FilterInfo
{
    public required string Field { get; init; }
    public required string Operator { get; init; }
    public object? Value { get; init; }
}

public record SourceInfo
{
    public required string Url { get; init; }
    public required string Method { get; init; }
    public int? Status { get; init; }
    public double? ResponseTime { get; init; }
    public object? Payload { get; init; }
}

public record LinkageInfo
{
    public required IReadOnlyList<LinkageTarget> Targets { get; init; }
}

public record LinkageTarget
{
    public required string Id { get; init; }
    public required LinkageEffect Effect { get; init; }
    public required LinkagePath Path { get; init; }
}

/// <summary>
/// Base class for linkage path types. Discriminated by <see cref="PathType"/>.
/// </summary>
public abstract record LinkagePath
{
    public abstract string PathType { get; }
}

public record DirectPath : LinkagePath
{
    public override string PathType => "direct";
}

public record ApiPath : LinkagePath
{
    public override string PathType => "api";
    public required string Url { get; init; }
    public string? Method { get; init; }
}

public record ComputedPath : LinkagePath
{
    public override string PathType => "computed";
    public required string Expression { get; init; }
}

public record StorePath : LinkagePath
{
    public override string PathType => "store";
    public required string StoreName { get; init; }
    public string? Action { get; init; }
}

public record NavigationPath : LinkagePath
{
    public override string PathType => "navigation";
    public required string Route { get; init; }
}

public record ChainPath : LinkagePath
{
    public override string PathType => "chain";
    public required string Through { get; init; }
}

public record LayoutInfo
{
    public double X { get; init; }
    public double Y { get; init; }
    public double Width { get; init; }
    public double Height { get; init; }
    public bool Visible { get; init; }
    public double? RenderTime { get; init; }
    public double? ScrollTop { get; init; }
    public double? ScrollLeft { get; init; }
}

public record ShortcutInfo
{
    public required string Key { get; init; }
    public required string Action { get; init; }
    public string? Platform { get; init; }
}

public record AnimationInfo
{
    public bool Playing { get; init; }
    public string? Name { get; init; }
    public double? Duration { get; init; }
    public double? Progress { get; init; }
}

public record LocaleInfo
{
    public string? Language { get; init; }
    public string? Direction { get; init; } // "ltr" | "rtl"
    public bool? IsRTL { get; init; }
}

public record ThemeInfo
{
    public string? Mode { get; init; } // "light" | "dark" | "high-contrast"
    public string? ColorScheme { get; init; }
}

public record SessionInfo
{
    public bool? IsDirty { get; init; }
    public bool? HasUnsavedChanges { get; init; }
}

/// <summary>
/// Platform context describing the runtime environment.
/// </summary>
public record PlatformContext
{
    public required Platform Platform { get; init; }
    public required DeviceProfile Device { get; init; }
    public required ViewportSize Viewport { get; init; }
    public required InputMode InputMode { get; init; }
}

public record ViewportSize
{
    public int Width { get; init; }
    public int Height { get; init; }
}

public enum Platform
{
    WebChrome,
    WebSafari,
    WebFirefox,
    Ios,
    Android,
    MacOs,
    Windows,
    Linux,
}

public record DeviceProfile
{
    public required string Name { get; init; }
    public required ScreenSize ScreenSize { get; init; }
    public double PixelRatio { get; init; }
    public bool HasNotch { get; init; }
    public bool HasSafeArea { get; init; }
    public required string FormFactor { get; init; } // "phone" | "tablet" | "desktop" | "foldable"
}

public record ScreenSize
{
    public int Width { get; init; }
    public int Height { get; init; }
}

public enum InputMode
{
    Touch,
    MouseKeyboard,
    Stylus,
    Gamepad,
}
