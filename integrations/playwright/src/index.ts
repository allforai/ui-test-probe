/**
 * @allforai/ui-test-probe-playwright
 *
 * Playwright integration for UI Test Probe:
 *   - injectProbe() — adds the web collector to a page via addInitScript
 *   - ProbePage — typed wrapper around page.evaluate() calls to window.__probe__
 *   - Custom matchers — toHaveProbeState(), toHaveProbeData(), toBeEffectivelyVisible()
 */

export { injectProbe } from './inject.js';
export { ProbePage } from './probe-page.js';
export { toHaveProbeState, toHaveProbeData, toBeEffectivelyVisible } from './matchers.js';

// Re-export spec types used in test code
export type {
  ProbeElement,
  ProbeType,
  ProbeSnapshot,
  SnapshotDiff,
  LinkageResult,
  PlatformContext,
  ViewportPreset,
  ActAndWaitResult,
  PageQueryResult,
  NetworkLogEntry,
} from '../../../spec/probe-types.js';
