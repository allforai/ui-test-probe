using UITestProbe.WinUI.Collector;
using UITestProbe.WinUI.Actions;
using UITestProbe.Core.Actions;
using UITestProbe.Core.Models;

namespace UITestProbe.WinUITest;

/// <summary>
/// High-level test driver wrapping UI Automation and the probe SDK.
/// Provides a fluent API for probe-driven MAUI/WinUI tests.
/// Methods mirror the UITestProbe interface from DESIGN.md.
/// </summary>
public class ProbeDriver
{
    private readonly MauiProbeRegistry _registry;
    private readonly MauiActionDispatcher _dispatcher;
    private Microsoft.Maui.Controls.VisualElement? _root;
    private string? _currentDevice;

    /// <summary>
    /// Well-known device dimensions keyed by preset name.
    /// Tuple: (Width, Height, PixelRatio, FormFactor).
    /// </summary>
    private static readonly Dictionary<string, (int Width, int Height, double PixelRatio, string FormFactor)> DeviceDimensions = new()
    {
        [DevicePreset.IPhoneSe] = (375, 667, 2.0, "phone"),
        [DevicePreset.IPhone15Pro] = (393, 852, 3.0, "phone"),
        [DevicePreset.IPadAir] = (820, 1180, 2.0, "tablet"),
        [DevicePreset.IPadPro12] = (1024, 1366, 2.0, "tablet"),
        [DevicePreset.Pixel8] = (412, 924, 2.625, "phone"),
        [DevicePreset.GalaxyS24] = (360, 780, 3.0, "phone"),
        [DevicePreset.GalaxyTabS9] = (800, 1280, 1.5, "tablet"),
        [DevicePreset.GalaxyFold] = (344, 882, 3.0, "foldable"),
        [DevicePreset.MacBookAir13] = (1470, 956, 2.0, "desktop"),
        [DevicePreset.Desktop1080p] = (1920, 1080, 1.0, "desktop"),
        [DevicePreset.Desktop1440p] = (2560, 1440, 1.0, "desktop"),
    };

    /// <summary>
    /// Initializes the probe driver for a running MAUI application.
    /// Scans the visual tree to discover all probe-annotated controls.
    /// </summary>
    /// <param name="app">The MAUI Application instance to instrument.</param>
    public ProbeDriver(object app)
    {
        _registry = new MauiProbeRegistry();
        _dispatcher = new MauiActionDispatcher(_registry);

        // Obtain root page from the MAUI Application
        if (app is Microsoft.Maui.Controls.Application mauiApp)
        {
            _root = mauiApp.MainPage;
        }
        else if (app is Microsoft.Maui.Controls.VisualElement visualElement)
        {
            _root = visualElement;
        }

        if (_root != null)
        {
            _registry.SetRoot(_root);
            _registry.Scan();
        }
    }

    /// <summary>
    /// Re-scans the visual tree. Useful after navigation or layout changes.
    /// </summary>
    public void Rescan()
    {
        if (_root != null)
        {
            _registry.SetRoot(_root);
            _registry.Scan();
        }
    }

    // -- Element Registry --

    /// <summary>
    /// Queries a single probe element by ID. Returns a snapshot of
    /// the element's current state, data, source, layout, and linkage.
    /// </summary>
    /// <param name="id">Semantic probe identifier.</param>
    /// <returns>ProbeElement snapshot, or null if not registered.</returns>
    public ProbeElement? Query(string id)
    {
        return _registry.Query(id);
    }

    /// <summary>
    /// Returns all registered probe elements, optionally filtered by type.
    /// </summary>
    public IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null)
    {
        return _registry.QueryAll(type);
    }

    // -- Event Stream / Waiting --

    /// <summary>
    /// Blocks until the page-level probe element reports "loaded" state
    /// and all registered elements have completed initial data fetch.
    /// </summary>
    /// <param name="timeoutMs">Maximum wait time in milliseconds.</param>
    /// <exception cref="TimeoutException">If page is not ready within timeout.</exception>
    public void WaitForPageReady(int timeoutMs = 10000)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            // Re-scan to pick up dynamic element changes
            if (_root != null)
            {
                _registry.SetRoot(_root);
                _registry.Scan();
            }

            var page = _registry.QueryPage();
            if (page.State == "loaded" && page.UnreadyElements.Count == 0)
                return;

            Thread.Sleep(50);
        }

        var finalSummary = _registry.QueryPage();
        throw new TimeoutException(
            $"Page not ready within {timeoutMs}ms. " +
            $"Page state: '{finalSummary.State}'. " +
            $"Unready elements: [{string.Join(", ", finalSummary.UnreadyElements)}]");
    }

    /// <summary>
    /// Blocks until the specified element reaches the target state.
    /// </summary>
    /// <param name="id">Probe ID to monitor.</param>
    /// <param name="state">Target state to wait for (e.g., ProbeState.Visible).</param>
    /// <param name="timeoutMs">Maximum wait time in milliseconds.</param>
    public void WaitFor(string id, string state, int timeoutMs = 5000)
    {
        var deadline = DateTime.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTime.UtcNow < deadline)
        {
            var el = _registry.Query(id);
            if (el?.State.Current == state) return;
            Thread.Sleep(50);
        }

        var finalElement = _registry.Query(id);
        var currentState = finalElement?.State.Current ?? "not found";
        throw new TimeoutException(
            $"Element '{id}' did not reach state '{state}' within {timeoutMs}ms. " +
            $"Current state: '{currentState}'.");
    }

    // -- Action Dispatch --

    /// <summary>
    /// Performs a tap action on the specified probe element.
    /// </summary>
    public void Tap(string id)
    {
        _dispatcher.Click(id).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Fills a form element with the specified value.
    /// </summary>
    public void Fill(string id, string value)
    {
        _dispatcher.Fill(id, value).GetAwaiter().GetResult();
    }

    /// <summary>
    /// Performs a semantic action on a trigger element and waits for
    /// a linked target element to reach the expected state.
    /// </summary>
    /// <param name="probeId">Probe ID of the trigger element.</param>
    /// <param name="action">Semantic action (e.g., "select:completed", "tap").</param>
    /// <param name="target">Probe ID of the linked target to wait for.</param>
    /// <param name="expectedState">Expected final state (default: "loaded").</param>
    /// <param name="timeoutMs">Timeout in milliseconds.</param>
    public void ActAndWait(
        string probeId,
        string action,
        string target,
        string expectedState = "loaded",
        int timeoutMs = 5000)
    {
        _dispatcher.ActAndWait(probeId, action, target, expectedState, timeoutMs)
            .GetAwaiter().GetResult();
    }

    /// <summary>
    /// Verifies the complete linkage chain triggered by an action.
    /// Returns direct effects, chained effects, and observed API calls.
    /// </summary>
    public LinkageResult VerifyLinkage(string probeId, string action)
    {
        return _dispatcher.VerifyLinkage(probeId, action).GetAwaiter().GetResult();
    }

    // -- Visibility --

    /// <summary>
    /// Checks effective visibility by walking the ancestor chain.
    /// Returns false if any ancestor is hidden, even if the element itself is visible.
    /// </summary>
    public bool IsEffectivelyVisible(string id)
    {
        return _registry.IsEffectivelyVisible(id);
    }

    /// <summary>
    /// Shorthand: checks if element exists and is effectively visible.
    /// </summary>
    public bool IsVisible(string id)
    {
        var el = Query(id);
        return el != null && IsEffectivelyVisible(id);
    }

    // -- Device Presets --

    /// <summary>
    /// Configures the test window to match a built-in device preset.
    /// Resizes the MAUI window to the device's screen dimensions.
    /// </summary>
    /// <param name="preset">Device preset name (e.g., "desktop-1080p", "ipad-air").</param>
    public void SetDevice(string preset)
    {
        if (!DeviceDimensions.TryGetValue(preset, out var dimensions))
            throw new ArgumentException(
                $"Unknown device preset '{preset}'. " +
                $"Known presets: {string.Join(", ", DeviceDimensions.Keys)}");

        _currentDevice = preset;

        // Resize the MAUI application window if running in a windowed context
        if (_root != null)
        {
            var window = _root is Microsoft.Maui.Controls.Page page ? page.Window : null;
            if (window != null)
            {
                window.Width = dimensions.Width;
                window.Height = dimensions.Height;
            }
        }

        // Re-scan after layout change so layout metrics are refreshed
        Rescan();
    }

    /// <summary>
    /// Runs the same test function across multiple device presets,
    /// collecting pass/fail results per device.
    /// </summary>
    /// <param name="devices">List of device preset names.</param>
    /// <param name="test">Test function to execute per device.</param>
    /// <returns>Results keyed by device name.</returns>
    public Dictionary<string, TestResult> RunAcrossDevices(
        IReadOnlyList<string> devices,
        Action<ProbeDriver> test)
    {
        var results = new Dictionary<string, TestResult>();

        foreach (var device in devices)
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            try
            {
                SetDevice(device);
                test(this);
                sw.Stop();
                results[device] = new TestResult { Passed = true, DurationMs = sw.Elapsed.TotalMilliseconds };
            }
            catch (Exception ex)
            {
                sw.Stop();
                results[device] = new TestResult { Passed = false, Error = ex.Message, DurationMs = sw.Elapsed.TotalMilliseconds };
            }
        }

        return results;
    }
}

/// <summary>
/// Result of a single device test run.
/// </summary>
public record TestResult
{
    public bool Passed { get; init; }
    public string? Error { get; init; }
    public double DurationMs { get; init; }
}

/// <summary>
/// Well-known device preset constants.
/// </summary>
public static class DevicePreset
{
    public const string IPhoneSe = "iphone-se";
    public const string IPhone15Pro = "iphone-15-pro";
    public const string IPadAir = "ipad-air";
    public const string IPadPro12 = "ipad-pro-12";
    public const string Pixel8 = "pixel-8";
    public const string GalaxyS24 = "galaxy-s24";
    public const string GalaxyTabS9 = "galaxy-tab-s9";
    public const string GalaxyFold = "galaxy-fold";
    public const string MacBookAir13 = "macbook-air-13";
    public const string Desktop1080p = "desktop-1080p";
    public const string Desktop1440p = "desktop-1440p";
}

/// <summary>
/// Well-known probe states for assertion convenience.
/// </summary>
public static class ProbeState
{
    public const string Loading = "loading";
    public const string Loaded = "loaded";
    public const string Error = "error";
    public const string Empty = "empty";
    public const string Disabled = "disabled";
    public const string Submitting = "submitting";
    public const string Visible = "visible";
    public const string Hidden = "hidden";
}
