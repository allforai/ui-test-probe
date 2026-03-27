package com.allforai.uitestprobe.actions

import com.allforai.uitestprobe.collector.ProbeRegistry
import com.allforai.uitestprobe.models.LinkageEffect
import com.allforai.uitestprobe.models.ProbeElement
import com.allforai.uitestprobe.models.ProbeType
import kotlinx.coroutines.delay
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.time.Duration
import kotlin.time.Duration.Companion.milliseconds
import kotlin.time.Duration.Companion.seconds

/**
 * Result of a dispatched action.
 */
data class ActionResult(
    /** Whether the action completed successfully. */
    val success: Boolean,
    /** The probe element after the action was performed. */
    val element: ProbeElement,
    /** Error message if the action failed. */
    val error: String? = null,
)

/**
 * Callback interface for performing actual UI interactions.
 *
 * The test integration layer (e.g., ProbeTestRule) provides an implementation
 * that bridges to ComposeTestRule's interaction APIs.
 */
interface ActionPerformer {
    /** Perform a tap/click on the element with the given probe ID. */
    fun performTap(probeId: String)

    /** Clear and set text on the input element with the given probe ID. */
    fun performTextInput(probeId: String, text: String)

    /** Trigger idle synchronization so the UI settles after an action. */
    fun waitForIdle()
}

/**
 * Dispatches semantic actions against probe elements by their IDs.
 *
 * All actions perform pre-checks (visibility, enabled state) before
 * executing and return an [ActionResult] with the post-action state.
 */
class ActionDispatcher(
    private val registry: ProbeRegistry = ProbeRegistry.shared,
) {

    /** Action performer supplied by the test integration layer. */
    var performer: ActionPerformer? = null

    /**
     * Validate that the element exists, is visible, and is enabled.
     * Returns either a failure [ActionResult] or `null` if pre-checks pass.
     */
    private fun preCheck(probeId: String, requiredType: ProbeType? = null): Pair<ProbeElement?, ActionResult?> {
        val element = registry.query(probeId)
            ?: return null to ActionResult(
                success = false,
                element = ProbeElement(id = probeId, type = ProbeType.DISPLAY),
                error = "Element '$probeId' not found in registry",
            )

        if (!element.isVisible) {
            return element to ActionResult(
                success = false,
                element = element,
                error = "Element '$probeId' is not visible",
            )
        }

        if (!element.isEnabled) {
            return element to ActionResult(
                success = false,
                element = element,
                error = "Element '$probeId' is not enabled",
            )
        }

        if (requiredType != null && element.type != requiredType) {
            return element to ActionResult(
                success = false,
                element = element,
                error = "Element '$probeId' is type ${element.type}, expected $requiredType",
            )
        }

        return element to null
    }

    private fun requirePerformer(): ActionPerformer {
        return performer
            ?: throw IllegalStateException(
                "ActionDispatcher.performer not set. " +
                "Attach a ComposeTestRule via ProbeTestRule before dispatching actions."
            )
    }

    /**
     * Re-scan the registry and return the refreshed element.
     */
    private fun refreshElement(probeId: String): ProbeElement {
        registry.scan()
        return registry.query(probeId)
            ?: ProbeElement(id = probeId, type = ProbeType.DISPLAY)
    }

    /**
     * Tap a probe element.
     *
     * Pre-checks: element must be visible and enabled.
     *
     * @param probeId The probe ID to tap.
     * @return The action result with post-tap state.
     */
    suspend fun tap(probeId: String): ActionResult {
        registry.scan()
        val (element, failure) = preCheck(probeId)
        if (failure != null) return failure

        val perf = requirePerformer()
        perf.performTap(probeId)
        perf.waitForIdle()

        val updated = refreshElement(probeId)
        return ActionResult(success = true, element = updated)
    }

    /**
     * Fill a text input probe element with the given text.
     *
     * Pre-checks: element must be of type [ProbeType.INPUT], visible, and enabled.
     *
     * @param probeId The probe ID of the input element.
     * @param text The text to enter.
     * @return The action result with post-fill state.
     */
    suspend fun fill(probeId: String, text: String): ActionResult {
        registry.scan()
        val (element, failure) = preCheck(probeId, requiredType = ProbeType.INPUT)
        if (failure != null) return failure

        val perf = requirePerformer()
        perf.performTextInput(probeId, text)
        perf.waitForIdle()

        val updated = refreshElement(probeId)
        return ActionResult(success = true, element = updated)
    }

    /**
     * Select a value from a probe element (dropdown, spinner).
     *
     * Pre-checks: element must be visible and enabled.
     *
     * Selects by first tapping the element to open it, then searching
     * for the value. For simple cases, this is equivalent to a tap action
     * that updates the element's state with the selected value.
     *
     * @param probeId The probe ID of the selectable element.
     * @param value The value to select.
     * @return The action result with post-selection state.
     */
    suspend fun select(probeId: String, value: Any): ActionResult {
        registry.scan()
        val (element, failure) = preCheck(probeId)
        if (failure != null) return failure

        val perf = requirePerformer()
        // Open the selector by tapping it
        perf.performTap(probeId)
        perf.waitForIdle()

        // After the selector opens, attempt to find and tap the option.
        // The option is expected to be a probe element with id "${probeId}-option-${value}"
        // or we fall back to text input if it's a combo-box style selector.
        val optionId = "${probeId}-option-$value"
        registry.scan()
        val option = registry.query(optionId)
        if (option != null) {
            perf.performTap(optionId)
        } else {
            // Fallback: treat as a text-based selector, input the value directly
            perf.performTextInput(probeId, value.toString())
        }
        perf.waitForIdle()

        val updated = refreshElement(probeId)
        return ActionResult(success = true, element = updated)
    }

    /**
     * Perform an action and wait for a state change.
     *
     * @param probeId The probe ID to act on.
     * @param expectStateKey The state key to monitor.
     * @param expectStateValue The expected state value.
     * @param timeout Maximum time to wait for the state change.
     * @return The action result after the state change.
     */
    suspend fun actAndWait(
        probeId: String,
        expectStateKey: String,
        expectStateValue: Any,
        timeout: Duration = 5.seconds,
    ): ActionResult {
        // Execute the tap first
        val tapResult = tap(probeId)
        if (!tapResult.success) return tapResult

        // Poll for the expected state change
        val pollInterval = 50.milliseconds
        val result = withTimeoutOrNull(timeout) {
            while (true) {
                registry.scan()
                val current = registry.query(probeId)
                if (current != null && current.state[expectStateKey] == expectStateValue) {
                    return@withTimeoutOrNull ActionResult(success = true, element = current)
                }
                delay(pollInterval)
            }
            @Suppress("UNREACHABLE_CODE")
            null // unreachable but satisfies the type system
        }

        if (result != null) return result

        // Timeout: return current state with error
        val finalElement = registry.query(probeId)
            ?: ProbeElement(id = probeId, type = ProbeType.DISPLAY)
        return ActionResult(
            success = false,
            element = finalElement,
            error = "Timed out waiting for state '$expectStateKey' == '$expectStateValue' " +
                "on element '$probeId' (current: ${finalElement.state[expectStateKey]})",
        )
    }

    /**
     * Verify that a probe element's linkage produces the expected effect.
     *
     * Captures the state of all linkage targets before the action,
     * performs a tap on the source element, then verifies that each
     * target was affected according to its linkage effect type.
     *
     * @param probeId The probe ID whose linkage to verify.
     * @return `true` if all linkage effects were observed.
     */
    suspend fun verifyLinkage(probeId: String): Boolean {
        registry.scan()
        val element = registry.query(probeId) ?: return false

        if (element.linkage.isEmpty()) return true

        // Snapshot target states before the action
        val targetsBefore = element.linkage.associate { linkagePath ->
            linkagePath.targetId to registry.query(linkagePath.targetId)
        }

        // Perform the action
        val tapResult = tap(probeId)
        if (!tapResult.success) return false

        // Allow UI to settle
        delay(200.milliseconds)
        registry.scan()

        // Verify each linkage target was affected
        return element.linkage.all { linkagePath ->
            val targetId = linkagePath.targetId
            val before = targetsBefore[targetId]
            val after = registry.query(targetId)

            when (linkagePath.effect) {
                LinkageEffect.NAVIGATE -> {
                    // Target should now exist (navigated to new screen) or screen changed
                    after != null
                }
                LinkageEffect.TOGGLE -> {
                    // Visibility should have changed
                    val wasBefore = before?.isVisible ?: false
                    val isAfter = after?.isVisible ?: false
                    wasBefore != isAfter
                }
                LinkageEffect.REFRESH -> {
                    // State should have changed (any change counts)
                    after != null && (before == null || after.state != before.state)
                }
                LinkageEffect.SUBMIT -> {
                    // State should indicate submission occurred (e.g., loading or submitted state)
                    after != null && (
                        after.state["loading"] == true ||
                        after.state["submitted"] == true ||
                        after.state != before?.state
                    )
                }
                LinkageEffect.FILTER -> {
                    // State should have changed (filter applied)
                    after != null && after.state != before?.state
                }
                LinkageEffect.OVERLAY -> {
                    // Target should now be visible
                    after != null && after.isVisible
                }
            }
        }
    }
}
