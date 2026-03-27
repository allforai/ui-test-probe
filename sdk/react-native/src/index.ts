/**
 * @allforai/ui-test-probe-rn
 *
 * UI Test Probe SDK for React Native — observable UI testing infrastructure.
 * Provides probe annotations, element registry, source tracking,
 * and semantic action dispatch for React Native applications.
 */

// Annotations
export { ProbeProps, useProbe, withProbe } from './annotations/probe-props';

// Collector
export { ElementRegistry } from './collector/registry';
export { SourceTracker } from './collector/source-tracker';

// Actions
export { ActionDispatcher } from './actions/dispatcher';

// Main probe class
export { RNProbe } from './probe';

// Re-export types used in the public API
export type {
  ProbeElement,
  ProbeType,
  LinkageEffect,
  LinkagePath,
  PlatformContext,
  DeviceProfile,
  SourceInfo,
  StateInfo,
  LayoutInfo,
  LinkageResult,
} from './probe';
