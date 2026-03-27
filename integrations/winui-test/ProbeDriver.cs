using UITestProbe.Collector;
using UITestProbe.Actions;
using UITestProbe.Models;

namespace UITestProbe.Net;

/// <summary>
/// High-level test driver wrapping UI Automation and the probe SDK.
/// Provides a fluent API for probe-driven MAUI/WinUI tests.
/// Methods mirror the UITestProbe interface from DESIGN.md.
/// </summary>
public class ProbeDriver
{
    private readonly ProbeRegistry _registry;
    private readonly ActionDispatcher _dispatcher;

    /// <summary>
    /// Initializes the probe driver for a running MAUI application.
    /// Scans the visual tree to discover all probe-annotated controls.
    /// </summary>
    /// <param name="app">The MAUI Application instance to instrument.</param>
    public ProbeDriver(object app)
    {
        _registry = new ProbeRegistry();
        _dispatcher = new ActionDispatcher(_registry);
        // TODO: Obtain root page from app, run initial Scan().
    }

    // ── Element Registry ──

    /// <summary>
    /// Queries a single probe element by ID. Returns a snapshot of
    /// the element's current state, data, source, layout, and linkage.
    /// </summary>
    /// <param name="id">Semantic probe identifier.</param>
    /// <returns>ProbeElement snapshot, or null if not registered.</returns>
    public ProbeElement? Query(string id)
    {
        // TODO: Delegate to registry.Query(id).
        throw new NotImplementedException();
    }

    /// <summary>
    /// Returns all registered probe elements, optionally filtered by type.
    /// </summary>
    public IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null)
    {
        // TODO: Delegate to registry.QueryAll(type).
        throw new NotImplementedException();
    }

    // ── Event Stream / Waiting ──

    /// <summary>
    /// Blocks until the page-level probe element reports "loaded" state
    /// and all registered elements have completed initial data fetch.
    /// </summary>
    /// <param name="timeoutMs">Maximum wait time in milliseconds.</param>
    /// <exception cref="TimeoutException">If page is not ready within timeout.</exception>
    public void WaitForPageReady(int timeoutMs = 10000)
    {
        // TODO: 1. Find Page-type element
        //       2. Poll/subscribe until state == "loaded"
        //       3. Check all elements for non-loading state
        //       4. Throw on timeout
        throw new NotImplementedException();
    }

    /// <summary>
    /// Blocks until the specified element reaches the target state.
    /// </summary>
    /// <param name="id">Probe ID to monitor.</param>
    /// <param name="state">Target state to wait for (e.g., ProbeState.Visible).</param>
    /// <param name="timeoutMs">Maximum wait time in milliseconds.</param>
    public void WaitFor(string id, string state, int timeoutMs = 5000)
    {
        // TODO: Subscribe to state changes, block until match or timeout.
        throw new NotImplementedException();
    }

    // ── Action Dispatch ──

    /// <summary>
    /// Performs a tap action on the specified probe element.
    /// </summary>
    public void Tap(string id)
    {
        // TODO: Delegate to dispatcher.Click(id).
        throw new NotImplementedException();
    }

    /// <summary>
    /// Fills a form element with the specified value.
    /// </summary>
    public void Fill(string id, string value)
    {
        // TODO: Delegate to dispatcher.Fill(id, value).
        throw new NotImplementedException();
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
        // TODO: Delegate to dispatcher.ActAndWait(...).
        throw new NotImplementedException();
    }

    /// <summary>
    /// Verifies the complete linkage chain triggered by an action.
    /// Returns direct effects, chained effects, and observed API calls.
    /// </summary>
    public LinkageResult VerifyLinkage(string probeId, string action)
    {
        // TODO: Delegate to dispatcher.VerifyLinkage(probeId, action).
        throw new NotImplementedException();
    }

    // ── Visibility ──

    /// <summary>
    /// Checks effective visibility by walking the ancestor chain.
    /// Returns false if any ancestor is hidden, even if the element itself is visible.
    /// </summary>
    public bool IsEffectivelyVisible(string id)
    {
        // TODO: Delegate to registry.IsEffectivelyVisible(id).
        throw new NotImplementedException();
    }

    /// <summary>
    /// Shorthand: checks if element exists and is effectively visible.
    /// </summary>
    public bool IsVisible(string id)
    {
        var el = Query(id);
        return el != null && IsEffectivelyVisible(id);
    }

    // ── Device Presets ──

    /// <summary>
    /// Configures the test window to match a built-in device preset.
    /// Resizes the MAUI window to the device's screen dimensions.
    /// </summary>
    /// <param name="preset">Device preset name (e.g., "desktop-1080p", "ipad-air").</param>
    public void SetDevice(string preset)
    {
        // TODO: Look up device preset, resize application window,
        //       re-scan visual tree after layout change.
        throw new NotImplementedException();
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
        // TODO: For each device: SetDevice, re-scan, run test, capture result.
        throw new NotImplementedException();
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
