package com.allforai.uitestprobe.actions

import com.allforai.uitestprobe.collector.ProbeRegistry
import com.allforai.uitestprobe.models.ProbeElement
import com.allforai.uitestprobe.models.ProbeType
import kotlin.time.Duration
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
 * Dispatches semantic actions against probe elements by their IDs.
 *
 * All actions perform pre-checks (visibility, enabled state) before
 * executing and return an [ActionResult] with the post-action state.
 */
class ActionDispatcher(
    private val registry: ProbeRegistry = ProbeRegistry.shared,
) {

    /**
     * Tap a probe element.
     *
     * Pre-checks: element must be visible and enabled.
     *
     * @param probeId The probe ID to tap.
     * @return The action result with post-tap state.
     */
    suspend fun tap(probeId: String): ActionResult {
        // TODO: validate element state, perform tap via semantics action, return result
        throw NotImplementedError("ActionDispatcher.tap() not yet implemented")
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
        // TODO: validate input type, clear existing text, enter new text
        throw NotImplementedError("ActionDispatcher.fill() not yet implemented")
    }

    /**
     * Select a value from a probe element (dropdown, spinner).
     *
     * Pre-checks: element must be visible and enabled.
     *
     * @param probeId The probe ID of the selectable element.
     * @param value The value to select.
     * @return The action result with post-selection state.
     */
    suspend fun select(probeId: String, value: Any): ActionResult {
        // TODO: validate element, perform selection
        throw NotImplementedError("ActionDispatcher.select() not yet implemented")
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
        // TODO: execute tap, poll for state change with timeout
        throw NotImplementedError("ActionDispatcher.actAndWait() not yet implemented")
    }

    /**
     * Verify that a probe element's linkage produces the expected effect.
     *
     * @param probeId The probe ID whose linkage to verify.
     * @return `true` if all linkage effects were observed.
     */
    suspend fun verifyLinkage(probeId: String): Boolean {
        // TODO: resolve linkage paths, trigger element, verify effects on targets
        throw NotImplementedError("ActionDispatcher.verifyLinkage() not yet implemented")
    }
}
