/**
 * @allforai/ui-test-probe-detox
 *
 * Detox integration for UI Test Probe.
 * Extends Detox device and element APIs with probe-driven
 * semantic queries, state-aware waiting, and linkage verification.
 */

export { ProbeDevice, createProbeDevice } from './probe-device';
export { byProbeId, byProbeType, withProbeState } from './matchers';
