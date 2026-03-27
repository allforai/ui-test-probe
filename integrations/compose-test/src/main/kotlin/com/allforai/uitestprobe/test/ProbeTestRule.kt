package com.allforai.uitestprobe.test

import androidx.compose.ui.test.junit4.ComposeTestRule
import com.allforai.uitestprobe.collector.ProbeRegistry
import com.allforai.uitestprobe.models.DeviceProfile
import com.allforai.uitestprobe.models.ProbeElement
import com.allforai.uitestprobe.models.ProbeType
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

/**
 * Extension on [ComposeTestRule] providing probe-aware testing capabilities.
 *
 * Usage:
 * ```kotlin
 * @get:Rule
 * val composeRule = createComposeRule()
 *
 * @Test
 * fun loginFlow() {
 *     composeRule.setContent { LoginScreen() }
 *
 *     val probe = composeRule.probeRule
 *     val button = probe.query("login-submit")
 *     probe.actAndWait("login-submit", expectStateKey = "loading", expectStateValue = false)
 * }
 * ```
 */
val ComposeTestRule.probeRule: ProbeTestRule
    get() = ProbeTestRule(this)

/**
 * Probe-aware test helper wrapping a [ComposeTestRule].
 */
class ProbeTestRule(
    private val composeRule: ComposeTestRule,
) {
    private val registry = ProbeRegistry.shared

    /**
     * Query a single probe element by ID.
     *
     * @param probeId The unique probe identifier.
     * @return The matching [ProbeElement].
     * @throws NoSuchElementException if not found.
     */
    fun query(probeId: String): ProbeElement {
        // TODO: trigger registry scan via composeRule's semantics owner, return element
        throw NotImplementedError("ProbeTestRule.query() not yet implemented")
    }

    /**
     * Query all probe elements, optionally filtered.
     *
     * @param type If provided, only return elements of this type.
     * @param screen If provided, only return elements on this screen.
     * @return List of matching [ProbeElement] instances.
     */
    fun queryAll(type: ProbeType? = null, screen: String? = null): List<ProbeElement> {
        // TODO: delegate to registry.queryAll()
        throw NotImplementedError("ProbeTestRule.queryAll() not yet implemented")
    }

    /**
     * Wait for the current page to be fully rendered and idle.
     *
     * Calls [ComposeTestRule.waitForIdle] and then verifies that all
     * probe elements on screen report stable states.
     *
     * @param timeout Maximum wait time.
     */
    fun waitForPageReady(timeout: Duration = 5.seconds) {
        // TODO: composeRule.waitForIdle() + probe state stability check
        throw NotImplementedError("ProbeTestRule.waitForPageReady() not yet implemented")
    }

    /**
     * Perform an action on a probe element and wait for an expected state.
     *
     * Taps the element identified by [probeId], then waits for the target
     * to reach the expected state.
     *
     * @param probeId The probe ID to act on.
     * @param expectStateKey The state key to monitor.
     * @param expectStateValue The expected value.
     * @param timeout Maximum wait time.
     * @return The probe element after the state change.
     */
    fun actAndWait(
        probeId: String,
        expectStateKey: String,
        expectStateValue: Any,
        timeout: Duration = 5.seconds,
    ): ProbeElement {
        // TODO: find SemanticsNode by ProbeIdKey, perform click, poll for state
        throw NotImplementedError("ProbeTestRule.actAndWait() not yet implemented")
    }

    /**
     * Set the simulated device profile for responsive testing.
     *
     * Adjusts the Compose test surface density and size to match [device].
     *
     * @param device The device profile to simulate.
     */
    fun setDevice(device: DeviceProfile) {
        // TODO: configure composeRule density and size
        throw NotImplementedError("ProbeTestRule.setDevice() not yet implemented")
    }

    /**
     * Run a test callback across multiple device profiles.
     *
     * Executes [testBody] once per device in [devices], resetting the
     * surface between runs.
     *
     * @param devices List of device profiles to test against.
     * @param testBody The test function to run for each device.
     */
    fun runAcrossDevices(
        devices: List<DeviceProfile>,
        testBody: (DeviceProfile) -> Unit,
    ) {
        // TODO: iterate devices, setDevice, run testBody, reset
        throw NotImplementedError("ProbeTestRule.runAcrossDevices() not yet implemented")
    }
}
