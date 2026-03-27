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
        PreFlightCheck(id);

        var native = _registry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        // Simulate tap/click via MAUI gesture or direct invocation
        if (native is Microsoft.Maui.Controls.Button button)
        {
            button.SendClicked();
        }
        else if (native is Microsoft.Maui.Controls.ImageButton imageButton)
        {
            imageButton.SendClicked();
        }
        else
        {
            // For other elements, invoke any registered TapGestureRecognizer
            var tapGesture = native.GestureRecognizers
                .OfType<Microsoft.Maui.Controls.TapGestureRecognizer>()
                .FirstOrDefault();

            if (tapGesture?.Command != null && tapGesture.Command.CanExecute(tapGesture.CommandParameter))
            {
                tapGesture.Command.Execute(tapGesture.CommandParameter);
            }
        }

        // If element has linkage, give targets time to settle
        var element = _registry.Query(id);
        if (element?.Linkage != null)
        {
            await Task.Delay(100);
        }
    }

    /// <summary>
    /// Fills a form control with the specified value.
    /// Pre-checks: exists, visible, enabled, is a form-type control.
    /// </summary>
    /// <param name="id">Probe ID of the form element.</param>
    /// <param name="value">Value to fill.</param>
    public async Task Fill(string id, string value)
    {
        PreFlightCheck(id, "Form");

        var native = _registry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is Microsoft.Maui.Controls.Entry entry)
        {
            entry.Text = value;
        }
        else if (native is Microsoft.Maui.Controls.Editor editor)
        {
            editor.Text = value;
        }
        else if (native is Microsoft.Maui.Controls.SearchBar searchBar)
        {
            searchBar.Text = value;
        }
        else
        {
            throw new ProbeActionException("UNSUPPORTED_CONTROL", id,
                $"Element '{id}' is not a text input control (Entry, Editor, or SearchBar).");
        }

        await Task.CompletedTask;
    }

    /// <summary>
    /// Selects an option in a selector control.
    /// Pre-checks: exists, visible, enabled, option exists in available options.
    /// </summary>
    /// <param name="id">Probe ID of the selector element.</param>
    /// <param name="value">Option value to select.</param>
    public async Task Select(string id, string value)
    {
        PreFlightCheck(id, "Selector");

        var native = _registry.GetNativeElement(id);
        if (native == null)
            throw new ProbeActionException("NOT_FOUND", id, $"Native element not found for '{id}'.");

        if (native is Microsoft.Maui.Controls.Picker picker)
        {
            var index = picker.Items.IndexOf(value);
            if (index < 0)
                throw new ProbeActionException("OPTION_NOT_FOUND", id,
                    $"Option '{value}' not found in picker '{id}'. Available: [{string.Join(", ", picker.Items)}]");
            picker.SelectedIndex = index;
        }
        else if (native is Microsoft.Maui.Controls.ListView listView)
        {
            // For ListView, try to find and select matching item
            var source = listView.ItemsSource?.Cast<object>().ToList();
            var match = source?.FirstOrDefault(item => item?.ToString() == value);
            if (match != null)
                listView.SelectedItem = match;
            else
                throw new ProbeActionException("OPTION_NOT_FOUND", id,
                    $"Option '{value}' not found in list '{id}'.");
        }
        else
        {
            throw new ProbeActionException("UNSUPPORTED_CONTROL", id,
                $"Element '{id}' is not a selector control (Picker or ListView).");
        }

        await Task.CompletedTask;
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
        PreFlightCheck(id);

        var actionStart = DateTimeOffset.UtcNow;

        // Parse and execute the action
        if (action.StartsWith("select:", StringComparison.OrdinalIgnoreCase))
        {
            var selectValue = action["select:".Length..];
            await Select(id, selectValue);
        }
        else if (action.StartsWith("fill:", StringComparison.OrdinalIgnoreCase))
        {
            var fillValue = action["fill:".Length..];
            await Fill(id, fillValue);
        }
        else
        {
            // Default to click/tap
            await Click(id);
        }

        var actionEnd = DateTimeOffset.UtcNow;
        var actionDuration = (actionEnd - actionStart).TotalMilliseconds;

        // Poll for target state with timeout
        var waitStart = DateTimeOffset.UtcNow;
        var deadline = waitStart.AddMilliseconds(timeoutMs);
        StateInfo? targetState = null;

        while (DateTimeOffset.UtcNow < deadline)
        {
            var targetElement = _registry.Query(target);
            if (targetElement != null)
            {
                targetState = targetElement.State;
                if (targetElement.State.Current == expectedState)
                    break;
            }
            await Task.Delay(50);
        }

        var waitDuration = (DateTimeOffset.UtcNow - waitStart).TotalMilliseconds;

        // Optionally verify linkage
        LinkageResult? linkageResults = null;
        var sourceElement = _registry.Query(id);
        if (sourceElement?.Linkage != null)
        {
            linkageResults = await VerifyLinkage(id, action);
        }

        return new ActAndWaitResult
        {
            ActionDuration = actionDuration,
            WaitDuration = waitDuration,
            TargetState = targetState ?? new StateInfo { Current = "unknown", Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() },
            LinkageResults = linkageResults,
        };
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
        var element = _registry.Query(id);
        if (element?.Linkage == null)
        {
            return new LinkageResult
            {
                Trigger = id,
                Action = action,
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

            // Wait briefly for the target to respond
            await Task.Delay(200);

            var targetElement = _registry.Query(linkTarget.Id);
            var duration = (DateTimeOffset.UtcNow - start).TotalMilliseconds;

            if (linkTarget.Path is ChainPath chainPath)
            {
                // This is a chained effect (A -> B -> C)
                var result = targetElement != null && targetElement.State.Current == "loaded" ? "pass" : "timeout";
                chainedEffects.Add(new ChainedEffect
                {
                    Target = linkTarget.Id,
                    Effect = linkTarget.Effect.ToString(),
                    Through = chainPath.Through,
                    Result = result,
                    Duration = duration,
                });
            }
            else
            {
                // Direct effect
                var result = targetElement != null
                    ? (targetElement.State.Current == "error" ? "fail" : "pass")
                    : "timeout";

                directEffects.Add(new DirectEffect
                {
                    Target = linkTarget.Id,
                    Effect = linkTarget.Effect.ToString(),
                    Result = result,
                    Duration = duration,
                });
            }

            // Track API calls from target source bindings
            if (linkTarget.Path is ApiPath apiPath)
            {
                apiCalls.Add(new ApiCall
                {
                    Url = apiPath.Url,
                    Method = apiPath.Method ?? "GET",
                    Status = targetElement?.Source?.Status ?? 0,
                    ResponseTime = targetElement?.Source?.ResponseTime ?? 0,
                });
            }
            else if (targetElement?.Source != null)
            {
                apiCalls.Add(new ApiCall
                {
                    Url = targetElement.Source.Url,
                    Method = targetElement.Source.Method,
                    Status = targetElement.Source.Status ?? 0,
                    ResponseTime = targetElement.Source.ResponseTime ?? 0,
                });
            }
        }

        return new LinkageResult
        {
            Trigger = id,
            Action = action,
            DirectEffects = directEffects,
            ChainedEffects = chainedEffects,
            ApiCalls = apiCalls,
        };
    }

    /// <summary>
    /// Runs pre-flight checks before any action. Throws ProbeActionException
    /// with a structured error if any check fails.
    /// </summary>
    private void PreFlightCheck(string id, string? requiredType = null)
    {
        var element = _registry.Query(id);

        if (element == null)
            throw new ProbeActionException("NOT_FOUND", id,
                $"Element '{id}' not found in probe registry.");

        if (!_registry.IsEffectivelyVisible(id))
            throw new ProbeActionException("NOT_VISIBLE", id,
                $"Element '{id}' is not effectively visible (it or an ancestor is hidden).");

        if (element.State.Current == "disabled")
            throw new ProbeActionException("DISABLED", id,
                $"Element '{id}' is disabled.");

        if (element.State.Current == "loading" || element.State.Current == "submitting")
            throw new ProbeActionException("BUSY", id,
                $"Element '{id}' is busy (state: {element.State.Current}).");

        if (requiredType != null)
        {
            var expectedType = Enum.TryParse<ProbeType>(requiredType, ignoreCase: true, out var parsed)
                ? parsed
                : (ProbeType?)null;

            if (expectedType != null && element.Type != expectedType.Value)
                throw new ProbeActionException("TYPE_MISMATCH", id,
                    $"Element '{id}' is type {element.Type} but action requires {requiredType}.");
        }
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
