package com.allforai.uitestprobe.collector

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

    /**
     * Scan the current Semantics tree and rebuild the probe registry.
     *
     * Walks all SemanticsNode instances looking for custom probe properties
     * and extracts their metadata into [ProbeElement] objects.
     */
    fun scan() {
        // TODO: access SemanticsOwner from ComposeTestRule, walk nodes,
        //       read ProbeIdKey/ProbeTypeKey/ProbeStateKey/ProbeSourceKey/ProbeLinkageKey
        throw NotImplementedError("ProbeRegistry.scan() not yet implemented")
    }

    /**
     * Query a single probe element by its ID.
     *
     * @param probeId The unique probe identifier.
     * @return The matching [ProbeElement], or `null` if not found.
     */
    fun query(probeId: String): ProbeElement? {
        // TODO: look up element in registry
        throw NotImplementedError("ProbeRegistry.query() not yet implemented")
    }

    /**
     * Query all probe elements matching optional filters.
     *
     * @param type If provided, only return elements of this type.
     * @param screen If provided, only return elements on this screen.
     * @return List of matching [ProbeElement] instances.
     */
    fun queryAll(type: ProbeType? = null, screen: String? = null): List<ProbeElement> {
        // TODO: filter elements by type and/or screen
        throw NotImplementedError("ProbeRegistry.queryAll() not yet implemented")
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
