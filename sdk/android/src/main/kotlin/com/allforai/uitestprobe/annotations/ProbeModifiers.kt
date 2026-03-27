package com.allforai.uitestprobe.annotations

import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.SemanticsPropertyKey
import androidx.compose.ui.semantics.SemanticsPropertyReceiver
import androidx.compose.ui.semantics.semantics
import com.allforai.uitestprobe.models.LinkagePath
import com.allforai.uitestprobe.models.ProbeType

// -- Custom Semantics Properties --

/** Semantics property key for probe ID. */
val ProbeIdKey = SemanticsPropertyKey<String>("ProbeId")
var SemanticsPropertyReceiver.probeId by ProbeIdKey

/** Semantics property key for probe type. */
val ProbeTypeKey = SemanticsPropertyKey<ProbeType>("ProbeType")
var SemanticsPropertyReceiver.probeType by ProbeTypeKey

/** Semantics property key for probe state map. */
val ProbeStateKey = SemanticsPropertyKey<Map<String, Any>>("ProbeState")
var SemanticsPropertyReceiver.probeState by ProbeStateKey

/** Semantics property key for probe data source. */
val ProbeSourceKey = SemanticsPropertyKey<String>("ProbeSource")
var SemanticsPropertyReceiver.probeSource by ProbeSourceKey

/** Semantics property key for probe linkage paths. */
val ProbeLinkageKey = SemanticsPropertyKey<List<LinkagePath>>("ProbeLinkage")
var SemanticsPropertyReceiver.probeLinkage by ProbeLinkageKey

// -- Modifier Extensions --

/**
 * Annotate this composable with a probe identifier for test discovery.
 *
 * ```kotlin
 * Button(
 *     onClick = { /* ... */ },
 *     modifier = Modifier.probeId("login-submit")
 * ) { Text("Login") }
 * ```
 *
 * @param id Unique probe ID within the current screen.
 */
fun Modifier.probeId(id: String): Modifier = this.semantics {
    probeId = id
}

/**
 * Annotate this composable with a semantic probe type.
 *
 * @param type The probe type classification.
 */
fun Modifier.probeType(type: ProbeType): Modifier = this.semantics {
    probeType = type
}

/**
 * Annotate this composable with semantic state for test assertions.
 *
 * @param state Key-value pairs representing the element's state.
 */
fun Modifier.probeState(state: Map<String, Any>): Modifier = this.semantics {
    probeState = state
}

/**
 * Annotate this composable with a data source identifier.
 *
 * @param source URI or identifier for the data source (e.g., "api:/users").
 */
fun Modifier.probeSource(source: String): Modifier = this.semantics {
    probeSource = source
}

/**
 * Annotate this composable with linkage paths to other probe elements.
 *
 * @param linkage List of linkage paths describing connections to other elements.
 */
fun Modifier.probeLinkage(linkage: List<LinkagePath>): Modifier = this.semantics {
    probeLinkage = linkage
}
