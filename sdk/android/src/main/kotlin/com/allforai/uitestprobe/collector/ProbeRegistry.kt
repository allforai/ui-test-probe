package com.allforai.uitestprobe.collector

import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.semantics.SemanticsNode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import com.allforai.uitestprobe.annotations.ProbeIdKey
import com.allforai.uitestprobe.annotations.ProbeLinkageKey
import com.allforai.uitestprobe.annotations.ProbeSourceKey
import com.allforai.uitestprobe.annotations.ProbeStateKey
import com.allforai.uitestprobe.annotations.ProbeTypeKey
import com.allforai.uitestprobe.models.ProbeElement
import com.allforai.uitestprobe.models.ProbeType

/**
 * Discovers and indexes annotated composables via the Semantics tree.
 *
 * At test time, [ProbeRegistry] scans the Compose Semantics tree for
 * nodes with probe annotations and builds a queryable index of
 * [ProbeElement] instances.
 */
class ProbeRegistry {

    /** Internal storage of discovered probe elements keyed by ID. */
    private val elements = mutableMapOf<String, ProbeElement>()

    /** Root semantics node supplier, set by the test integration layer. */
    var rootNodeProvider: (() -> SemanticsNode)? = null

    /**
     * Scan the current Semantics tree and rebuild the probe registry.
     *
     * Walks all SemanticsNode instances looking for custom probe properties
     * and extracts their metadata into [ProbeElement] objects.
     */
    fun scan() {
        val rootNode = rootNodeProvider?.invoke()
            ?: throw IllegalStateException(
                "ProbeRegistry.rootNodeProvider not set. " +
                "Attach a ComposeTestRule via ProbeTestRule before scanning."
            )
        elements.clear()
        walkNode(rootNode, parentProbeId = null)
    }

    /**
     * Recursively walk a semantics node and its children, extracting
     * probe-annotated elements into the registry.
     */
    private fun walkNode(node: SemanticsNode, parentProbeId: String?) {
        val config = node.config
        val probeId = config.getOrNull(ProbeIdKey)

        var currentParentId = parentProbeId

        if (probeId != null) {
            val probeType = config.getOrNull(ProbeTypeKey) ?: ProbeType.DISPLAY
            val probeState = config.getOrNull(ProbeStateKey) ?: emptyMap()
            val probeSource = config.getOrNull(ProbeSourceKey)
            val probeLinkage = config.getOrNull(ProbeLinkageKey) ?: emptyList()

            // Extract bounds from the node's bounding rectangle in window coordinates
            val boundsRect: Rect = node.boundsInWindow
            val bounds = listOf(
                boundsRect.left,
                boundsRect.top,
                boundsRect.width,
                boundsRect.height,
            )

            // Extract accessibility info from standard semantics properties
            val contentDescription = config.getOrNull(SemanticsProperties.ContentDescription)
                ?.firstOrNull()
            val role = config.getOrNull(SemanticsProperties.Role)?.toString()
            val isEnabled = !config.contains(SemanticsProperties.Disabled)
            val text = config.getOrNull(SemanticsProperties.Text)
                ?.firstOrNull()?.text

            val element = ProbeElement(
                id = probeId,
                type = probeType,
                label = contentDescription ?: text,
                state = probeState,
                source = probeSource,
                linkage = probeLinkage,
                bounds = bounds,
                isVisible = node.isPlaced,
                isEnabled = isEnabled,
                a11yLabel = contentDescription,
                a11yRole = role,
                parentId = parentProbeId,
            )
            elements[probeId] = element
            currentParentId = probeId
        }

        // Recurse into children
        for (child in node.children) {
            walkNode(child, parentProbeId = currentParentId)
        }
    }

    /**
     * Query a single probe element by its ID.
     *
     * @param probeId The unique probe identifier.
     * @return The matching [ProbeElement], or `null` if not found.
     */
    fun query(probeId: String): ProbeElement? {
        return elements[probeId]
    }

    /**
     * Query all probe elements matching optional filters.
     *
     * @param type If provided, only return elements of this type.
     * @param screen If provided, only return elements on this screen.
     * @return List of matching [ProbeElement] instances.
     */
    fun queryAll(type: ProbeType? = null, screen: String? = null): List<ProbeElement> {
        return elements.values.filter { element ->
            (type == null || element.type == type) &&
            (screen == null || element.screen == screen)
        }
    }

    /**
     * Reset the registry, clearing all discovered elements.
     */
    fun reset() {
        elements.clear()
    }

    companion object {
        /** Singleton shared instance. */
        val shared = ProbeRegistry()
    }
}
