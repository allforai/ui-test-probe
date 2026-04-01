using System.Windows;
using UITestProbe.Core.Actions;
using UITestProbe.Core.Models;
using UITestProbe.Wpf.Actions;
using UITestProbe.Wpf.Collector;

namespace UITestProbe.WpfTest;

/// <summary>
/// High-level test driver for WPF applications. Wraps WpfProbeRegistry + WpfActionDispatcher
/// with convenient test helper methods.
/// </summary>
public class WpfProbeDriver
{
    private readonly WpfProbeRegistry _registry;
    private readonly WpfActionDispatcher _dispatcher;

    public WpfProbeDriver(DependencyObject root)
    {
        _registry = new WpfProbeRegistry(root);
        _dispatcher = new WpfActionDispatcher(_registry);
        _registry.Scan();
    }

    public void Rescan() => _registry.Scan();
    public ProbeElement? Query(string id) => _registry.Query(id);
    public IReadOnlyList<ProbeElement> QueryAll(ProbeType? type = null) => _registry.QueryAll(type);

    public async Task WaitForPageReady(int timeoutMs = 5000)
    {
        var deadline = DateTimeOffset.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var page = _registry.QueryPage();
            if (page.UnreadyElements.Count == 0) return;
            await Task.Delay(50);
        }
        throw new TimeoutException("WaitForPageReady timed out.");
    }

    public async Task WaitFor(string id, string state, int timeoutMs = 5000)
    {
        var deadline = DateTimeOffset.UtcNow.AddMilliseconds(timeoutMs);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var el = _registry.Query(id);
            if (el?.State.Current == state) return;
            await Task.Delay(50);
        }
        throw new TimeoutException($"WaitFor '{id}' to reach state '{state}' timed out.");
    }

    public Task Click(string id) => _dispatcher.Click(id);
    public Task Fill(string id, string value) => _dispatcher.Fill(id, value);
    public Task<ActAndWaitResult> ActAndWait(string id, string action, string target,
        string expectedState = "loaded", int timeoutMs = 5000)
        => _dispatcher.ActAndWait(id, action, target, expectedState, timeoutMs);
    public Task<LinkageResult> VerifyLinkage(string probeId, string action)
        => _dispatcher.VerifyLinkage(probeId, action);

    public bool IsEffectivelyVisible(string id) => _registry.IsEffectivelyVisible(id);
}
