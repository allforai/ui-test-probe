/**
 * @allforai/ui-test-probe-web
 *
 * Web SDK for UI Test Probe. Provides DOM-based element collection,
 * state observation, source tracking, and semantic action dispatch.
 *
 * Usage:
 *   import { WebProbe } from '@allforai/ui-test-probe-web';
 *   const probe = new WebProbe();
 *   // Available as window.__probe__ after construction
 */

export { WebProbe } from './probe.js';
export type { WebProbeConfig } from './probe.js';

export { AnnotationParser } from './annotations/parser.js';

export { ElementRegistry } from './collector/registry.js';
export { StateObserver } from './collector/state-observer.js';
export { SourceTracker } from './collector/source-tracker.js';
export { LayoutTracker } from './collector/layout-tracker.js';
export { EventStream } from './collector/event-stream.js';

export { ActionDispatcher } from './actions/dispatcher.js';

// Re-export spec types for convenience
export type {
  ProbeElement,
  ProbeType,
  LinkageEffect,
  LinkagePath,
  LinkageResult,
  PlatformContext,
  Platform,
  DeviceProfile,
  InputMode,
  ViewportPreset,
  ProbeSnapshot,
  SnapshotDiff,
  UITestProbe,
  NetworkLogEntry,
  TestResult,
  ActAndWaitResult,
  PageQueryResult,
} from '../../spec/probe-types.js';
