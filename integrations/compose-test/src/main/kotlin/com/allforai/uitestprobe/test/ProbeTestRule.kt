package com.allforai.uitestprobe.test

import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.junit4.ComposeTestRule
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextClearance
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.unit.dp
import com.allforai.uitestprobe.actions.ActionPerformer
import com.allforai.uitestprobe.actions.ActionDispatcher
import com.allforai.uitestprobe.annotations.ProbeIdKey
import com.allforai.uitestprobe.collector.ProbeRegistry
import com.allforai.uitestprobe.models.DeviceProfile
import com.allforai.uitestprobe.models.ProbeElement
import com.allforai.uitestprobe.models.ProbeType
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

/**
 * Custom [SemanticsMatcher] that matches nodes with a specific ProbeId value.
 */
fun hasProbeId(probeId: String): SemanticsMatcher =
    SemanticsMatcher("ProbeId = '$probeId'") { node ->
        node.config.getOrNull(ProbeIdKey) == probeId
    }

/**
 * Extension on [ComposeTestRule] providing probe-aware testing capabilities.
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
    private val dispatcher = ActionDispatcher(registry)
    private var currentDevice: DeviceProfile? = null

    init {
        setupRootNodeProvider()
        setupActionPerformer()
    }

    private fun setupRootNodeProvider() {
        registry.rootNodeProvider = {
            composeRule.waitForIdle()
            val nodes = composeRule.onAllNodes(SemanticsMatcher("any") { true })
                .fetchSemanticsNodes(atLeastOneRootRequired = true)
            var root = nodes.first()
            while (root.parent != null) {
                root = root.parent!!
            }
            root
        }
    }

    private fun setupActionPerformer() {
        dispatcher.performer = object : ActionPerformer {
            override fun performTap(probeId: String) {
                composeRule.onNode(hasProbeId(probeId)).performClick()
            }
            override fun performTextInput(probeId: String, text: String) {
                val node = composeRule.onNode(hasProbeId(probeId))
                node.performTextClearance()
                node.performTextInput(text)
            }
            override fun waitForIdle() {
                composeRule.waitForIdle()
            }
        }
    }

    private fun ensureScanned() {
        setupRootNodeProvider()
        registry.scan()
    }

    /**
     * Query a single probe element by ID.
     *
     * @param probeId The unique probe identifier.
     * @return The matching [ProbeElement].
     * @throws NoSuchElementException if not found.
     */
    fun query(probeId: String): ProbeElement {
        ensureScanned()
        return registry.query(probeId)
            ?: throw NoSuchElementException(
                "Probe element '$probeId' not found. " +
                "Available: ${registry.queryAll().map { it.id }}"
            )
    }

    /**
     * Query all probe elements, optionally filtered.
     */
    fun queryAll(type: ProbeType? = null, screen: String? = null): List<ProbeElement> {
        ensureScanned()
        return registry.queryAll(type = type, screen = screen)
    }

    /**
     * Wait for the current page to be fully rendered and idle.
     */
    fun waitForPageReady(timeout: Duration = 5.seconds) {
        composeRule.waitForIdle()
        val deadlineMs = System.currentTimeMillis() + timeout.inWholeMilliseconds
        while (System.currentTimeMillis() < deadlineMs) {
            ensureScanned()
            val statesBefore = registry.queryAll().associate { it.id to it.state }
            composeRule.waitForIdle()
            ensureScanned()
            val statesAfter = registry.queryAll().associate { it.id to it.state }
            val isStable = statesAfter.all { (_, state) ->
                state["loading"] != true && state["submitting"] != true
            }
            if (isStable && statesBefore == statesAfter) return
            Thread.sleep(50)
        }
        throw AssertionError("Page did not reach ready state within $timeout.")
    }

    /**
     * Perform an action on a probe element and wait for an expected state.
     */
    fun actAndWait(
        probeId: String,
        expectStateKey: String,
        expectStateValue: Any,
        timeout: Duration = 5.seconds,
    ): ProbeElement {
        composeRule.onNode(hasProbeId(probeId)).performClick()
        composeRule.waitForIdle()
        val deadlineMs = System.currentTimeMillis() + timeout.inWholeMilliseconds
        while (System.currentTimeMillis() < deadlineMs) {
            ensureScanned()
            val element = registry.query(probeId)
            if (element != null && element.state[expectStateKey] == expectStateValue) {
                return element
            }
            composeRule.waitForIdle()
            Thread.sleep(50)
        }
        ensureScanned()
        val finalElement = registry.query(probeId)
        if (finalElement != null && finalElement.state[expectStateKey] == expectStateValue) {
            return finalElement
        }
        throw AssertionError(
            "Element '$probeId' did not reach state '$expectStateKey' == " +
            "'$expectStateValue' within $timeout. Current state: ${finalElement?.state}"
        )
    }

    /**
     * Set the simulated device profile for responsive testing.
     */
    fun setDevice(device: DeviceProfile) {
        currentDevice = device
        registry.reset()
    }

    /**
     * Run a test callback across multiple device profiles.
     */
    fun runAcrossDevices(
        devices: List<DeviceProfile>,
        testBody: (DeviceProfile) -> Unit,
    ) {
        for (device in devices) {
            setDevice(device)
            try {
                testBody(device)
            } finally {
                registry.reset()
                currentDevice = null
            }
        }
    }
}
