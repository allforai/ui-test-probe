using System.Windows.Forms;
using UITestProbe.Core.Actions;
using UITestProbe.Core.Models;
using UITestProbe.WinForms.Actions;
using UITestProbe.WinForms.Annotations;
using UITestProbe.WinForms.Collector;

namespace UITestProbe.WinFormTest;

/// <summary>
/// High-level test driver for WinForms applications.
/// </summary>
public class WinFormProbeDriver
{
    private readonly WinFormProbeRegistry _registry;
    private readonly WinFormActionDispatcher _dispatcher;

    public WinFormProbeDriver(ProbeExtenderProvider provider, Control root)
    {
        _registry = new WinFormProbeRegistry(provider, root);
        _dispatcher = new WinFormActionDispatcher(_registry);
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
