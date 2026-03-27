using UITestProbe.Collector;
using UITestProbe.Models;

namespace UITestProbe.Actions;

/// <summary>
/// Dispatches semantic UI actions via probe IDs with pre-flight checks.
/// Before any action, validates: element exists, is visible, is enabled,
/// is not busy. After action, automatically verifies linkage targets
/// if the element has declared linkages.
/// </summary>
public class ActionDispatcher
{
    private readonly ProbeRegistry _registry;

    public ActionDispatcher(ProbeRegistry registry)
    {
        _registry = registry;
    }

    /// <summary>
    /// Performs a tap/click on the element identified by probe ID.
    /// Pre-checks: exists, visible, enabled, not loading.
    /// </summary>
    /// <param name="id">Probe ID of the target element.</param>
    /// <exception cref="ProbeActionException">If pre-checks fail.</exception>
    public async Task Click(string id)
    {
        // TODO: 1. Query element from registry
        //       2. Run pre-flight checks (exists, visible, enabled, not busy)
        //       3. Invoke UI Automation click on the element
        //       4. If element has linkage, wait for targets to settle
        throw new NotImplementedException();
    }

    /// <summary>
    /// Fills a form control with the specified value.
    /// Pre-checks: exists, visible, enabled, is a form-type control.
    /// </summary>
    /// <param name="id">Probe ID of the form element.</param>
    /// <param name="value">Value to fill.</param>
    public async Task Fill(string id, string value)
    {
        // TODO: Validate element is Form type, clear existing value, type new value.
        throw new NotImplementedException();
    }

    /// <summary>
    /// Selects an option in a selector control.
    /// Pre-checks: exists, visible, enabled, option exists in available options.
    /// </summary>
    /// <param name="id">Probe ID of the selector element.</param>
    /// <param name="value">Option value to select.</param>
    public async Task Select(string id, string value)
    {
        // TODO: Validate element is Selector type, option exists in data.Options,
        //       invoke selection via UI Automation.
        throw new NotImplementedException();
    }

    /// <summary>
    /// Performs a semantic action and waits for a linked target element
    /// to reach the expected state. Event-driven, no polling.
    /// </summary>
    /// <param name="id">Probe ID of the trigger element.</param>
    /// <param name="action">Semantic action string (e.g., "select:completed", "tap").</param>
    /// <param name="target">Probe ID of the element to wait for.</param>
    /// <param name="expectedState">Target state to wait for (default: "loaded").</param>
    /// <param name="timeoutMs">Timeout in milliseconds (default: 5000).</param>
    /// <returns>Result including action duration, wait duration, and final target state.</returns>
    public async Task<ActAndWaitResult> ActAndWait(
        string id,
        string action,
        string target,
        string expectedState = "loaded",
        int timeoutMs = 5000)
    {
        // TODO: 1. Parse action string (e.g., "select:completed" -> Select + value)
        //       2. Subscribe to target state change events
        //       3. Execute the action on the trigger element
        //       4. Wait for target to reach expectedState or timeout
        //       5. If element has linkage, run verifyLinkage
        //       6. Return structured result
        throw new NotImplementedException();
    }

    /// <summary>
    /// Verifies the full linkage chain triggered by an action on an element.
    /// Returns direct effects, chained effects, and API calls observed.
    /// </summary>
    /// <param name="id">Probe ID of the trigger element.</param>
    /// <param name="action">Semantic action that was performed.</param>
    /// <returns>Structured linkage verification result.</returns>
    public async Task<LinkageResult> VerifyLinkage(string id, string action)
    {
        // TODO: 1. Read linkage declaration from element
        //       2. Execute action
        //       3. Monitor all declared targets for state changes
        //       4. Track API calls via source binding
        //       5. Follow chain paths (A -> B -> C)
        //       6. Compile results
        throw new NotImplementedException();
    }

    /// <summary>
    /// Runs pre-flight checks before any action. Throws ProbeActionException
    /// with a structured error if any check fails.
    /// </summary>
    private void PreFlightCheck(string id, string? requiredType = null)
    {
        // TODO: Check exists, visible, enabled, not busy, type matches if specified.
        throw new NotImplementedException();
    }
}

/// <summary>
/// Result of an actAndWait operation.
/// </summary>
public record ActAndWaitResult
{
    public double ActionDuration { get; init; }
    public double WaitDuration { get; init; }
    public required StateInfo TargetState { get; init; }
    public LinkageResult? LinkageResults { get; init; }
}

/// <summary>
/// Structured result of linkage chain verification.
/// </summary>
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
    public required string Result { get; init; } // "pass" | "fail" | "timeout"
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

/// <summary>
/// Exception thrown when a pre-flight check fails before an action.
/// </summary>
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
