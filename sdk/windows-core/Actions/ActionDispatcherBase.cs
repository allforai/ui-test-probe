using UITestProbe.Core.Collector;
using UITestProbe.Core.Models;

namespace UITestProbe.Core.Actions;

/// <summary>
/// Base class for action dispatchers. Provides framework-agnostic pre-flight checks,
/// actAndWait, and linkage verification. Subclasses implement platform-specific
/// Click/Fill/Select by interacting with native controls.
/// </summary>
public abstract class ActionDispatcherBase
{
    protected readonly IProbeRegistry Registry;

    protected ActionDispatcherBase(IProbeRegistry registry)
    {
        Registry = registry;
    }

    public abstract Task Click(string id);
    public abstract Task Fill(string id, string value);
    public abstract Task Select(string id, string value);

    /// <summary>
    /// Performs a semantic action and waits for a linked target to reach expected state.
    /// </summary>
    public async Task<ActAndWaitResult> ActAndWait(
        string id, string action, string target,
        string expectedState = "loaded", int timeoutMs = 5000)
    {
        PreFlightCheck(id);

        var actionStart = DateTimeOffset.UtcNow;

        if (action.StartsWith("select:", StringComparison.OrdinalIgnoreCase))
            await Select(id, action["select:".Length..]);
        else if (action.StartsWith("fill:", StringComparison.OrdinalIgnoreCase))
            await Fill(id, action["fill:".Length..]);
        else
            await Click(id);

        var actionDuration = (DateTimeOffset.UtcNow - actionStart).TotalMilliseconds;

        var waitStart = DateTimeOffset.UtcNow;
        var deadline = waitStart.AddMilliseconds(timeoutMs);
        StateInfo? targetState = null;

        while (DateTimeOffset.UtcNow < deadline)
        {
            var targetElement = Registry.Query(target);
            if (targetElement != null)
            {
                targetState = targetElement.State;
                if (targetElement.State.Current == expectedState) break;
            }
            await Task.Delay(50);
        }

        var waitDuration = (DateTimeOffset.UtcNow - waitStart).TotalMilliseconds;

        LinkageResult? linkageResults = null;
        var sourceElement = Registry.Query(id);
        if (sourceElement?.Linkage != null)
            linkageResults = await VerifyLinkage(id, action);

        return new ActAndWaitResult
        {
            ActionDuration = actionDuration,
            WaitDuration = waitDuration,
            TargetState = targetState ?? new StateInfo { Current = "unknown", Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() },
            LinkageResults = linkageResults,
        };
    }

    /// <summary>
    /// Verifies the full linkage chain triggered by an action.
    /// </summary>
    public async Task<LinkageResult> VerifyLinkage(string id, string action)
    {
        var element = Registry.Query(id);
        if (element?.Linkage == null)
        {
            return new LinkageResult
            {
                Trigger = id, Action = action,
                DirectEffects = Array.Empty<DirectEffect>(),
                ChainedEffects = Array.Empty<ChainedEffect>(),
                ApiCalls = Array.Empty<ApiCall>(),
            };
        }

        var directEffects = new List<DirectEffect>();
        var chainedEffects = new List<ChainedEffect>();
        var apiCalls = new List<ApiCall>();

        foreach (var linkTarget in element.Linkage.Targets)
        {
            var start = DateTimeOffset.UtcNow;
            await Task.Delay(200);

            var targetElement = Registry.Query(linkTarget.Id);
            var duration = (DateTimeOffset.UtcNow - start).TotalMilliseconds;

            if (linkTarget.Path is ChainPath chainPath)
            {
                chainedEffects.Add(new ChainedEffect
                {
                    Target = linkTarget.Id, Effect = linkTarget.Effect.ToString(),
                    Through = chainPath.Through,
                    Result = targetElement != null && targetElement.State.Current == "loaded" ? "pass" : "timeout",
                    Duration = duration,
                });
            }
            else
            {
                directEffects.Add(new DirectEffect
                {
                    Target = linkTarget.Id, Effect = linkTarget.Effect.ToString(),
                    Result = targetElement != null ? (targetElement.State.Current == "error" ? "fail" : "pass") : "timeout",
                    Duration = duration,
                });
            }

            if (linkTarget.Path is ApiPath apiPath)
            {
                apiCalls.Add(new ApiCall
                {
                    Url = apiPath.Url, Method = apiPath.Method ?? "GET",
                    Status = targetElement?.Source?.Status ?? 0,
                    ResponseTime = targetElement?.Source?.ResponseTime ?? 0,
                });
            }
            else if (targetElement?.Source != null)
            {
                apiCalls.Add(new ApiCall
                {
                    Url = targetElement.Source.Url, Method = targetElement.Source.Method,
                    Status = targetElement.Source.Status ?? 0,
                    ResponseTime = targetElement.Source.ResponseTime ?? 0,
                });
            }
        }

        return new LinkageResult
        {
            Trigger = id, Action = action,
            DirectEffects = directEffects, ChainedEffects = chainedEffects, ApiCalls = apiCalls,
        };
    }

    /// <summary>
    /// Pre-flight checks: exists, visible, enabled, not busy.
    /// </summary>
    protected void PreFlightCheck(string id, string? requiredType = null)
    {
        var element = Registry.Query(id);

        if (element == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Element '{id}' not found in probe registry.");
        if (!Registry.IsEffectivelyVisible(id))
            throw new ProbeActionException("NOT_VISIBLE", id, $"Element '{id}' is not effectively visible.");
        if (element.State.Current == "disabled")
            throw new ProbeActionException("DISABLED", id, $"Element '{id}' is disabled.");
        if (element.State.Current is "loading" or "submitting")
            throw new ProbeActionException("BUSY", id, $"Element '{id}' is busy (state: {element.State.Current}).");

        if (requiredType != null)
        {
            var expectedType = Enum.TryParse<ProbeType>(requiredType, ignoreCase: true, out var parsed) ? parsed : (ProbeType?)null;
            if (expectedType != null && element.Type != expectedType.Value)
                throw new ProbeActionException("TYPE_MISMATCH", id, $"Element '{id}' is type {element.Type} but action requires {requiredType}.");
        }
    }
}

public record ActAndWaitResult
{
    public double ActionDuration { get; init; }
    public double WaitDuration { get; init; }
    public required StateInfo TargetState { get; init; }
    public LinkageResult? LinkageResults { get; init; }
}

public record LinkageResult
{
    public required string Trigger { get; init; }
    public required string Action { get; init; }
    public required IReadOnlyList<DirectEffect> DirectEffects { get; init; }
    public required IReadOnlyList<ChainedEffect> ChainedEffects { get; init; }
    public required IReadOnlyList<ApiCall> ApiCalls { get; init; }
}

public record DirectEffect
{
    public required string Target { get; init; }
    public required string Effect { get; init; }
    public required string Result { get; init; }
    public double Duration { get; init; }
}

public record ChainedEffect
{
    public required string Target { get; init; }
    public required string Effect { get; init; }
    public required string Through { get; init; }
    public required string Result { get; init; }
    public double Duration { get; init; }
}

public record ApiCall
{
    public required string Url { get; init; }
    public required string Method { get; init; }
    public int Status { get; init; }
    public double ResponseTime { get; init; }
}

public class ProbeActionException : Exception
{
    public string ErrorCode { get; }
    public string ProbeId { get; }

    public ProbeActionException(string errorCode, string probeId, string message)
        : base(message)
    {
        ErrorCode = errorCode;
        ProbeId = probeId;
    }
}
