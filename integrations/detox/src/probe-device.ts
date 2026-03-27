/**
 * Extends Detox device with probe capabilities.
 * Wraps the standard Detox device to add semantic probe queries,
 * state-aware waiting, and linkage verification.
 */

import type {
  ProbeElement,
  ProbeType,
  PlatformContext,
  LinkageResult,
  TestResult,
  StateInfo,
  SourceInfo,
} from '@allforai/ui-test-probe-rn';

/**
 * Options for actAndWait operations.
 */
export interface ActAndWaitOptions {
  /** Probe ID of the target element to wait for */
  target?: string;
  /** Expected state the target should reach */
  state?: string;
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Probe-enhanced Detox device.
 * Provides the UITestProbe interface on top of Detox's device and element APIs.
 *
 * @example
 * ```ts
 * import { createProbeDevice } from '@allforai/ui-test-probe-detox';
 * const probe = createProbeDevice(device);
 *
 * await probe.waitForPageReady('order-page');
 * const table = await probe.query('order-list');
 * expect(table!.state.current).toBe('loaded');
 * ```
 */
export class ProbeDevice {
  private detoxDevice: unknown;

  constructor(detoxDevice: unknown) {
    this.detoxDevice = detoxDevice;
  }

  // ── Element Registry ──

  /**
   * Queries a probe element by semantic ID.
   * Uses Detox's accessibility tree query under the hood,
   * then parses probe metadata from the element's accessibility hint.
   */
  async query(id: string): Promise<ProbeElement | null> {
    // TODO: 1. Use Detox element(by.id(id)) to find the native element
    //       2. Read accessibility hint containing serialized probe metadata
    //       3. Parse into ProbeElement structure
    //       4. Read layout attributes from Detox element
    throw new Error('ProbeDevice.query: not yet implemented');
  }

  /**
   * Returns all probe elements, optionally filtered by type.
   */
  async queryAll(type?: ProbeType): Promise<ProbeElement[]> {
    // TODO: Query all elements with "probe:" accessibility label prefix.
    throw new Error('ProbeDevice.queryAll: not yet implemented');
  }

  // ── Event Stream ──

  /**
   * Waits until the page element and all its children report "loaded" state.
   * Event-driven via Detox's waitFor with custom probe expectations.
   *
   * @param pageId - Probe ID of the page element.
   * @param timeout - Maximum wait time in milliseconds.
   */
  async waitForPageReady(pageId: string, timeout = 10000): Promise<void> {
    // TODO: 1. Wait for page element to exist
    //       2. Read its probe metadata for state
    //       3. Wait until state === "loaded"
    //       4. Query all children, wait until none are "loading"
    throw new Error('ProbeDevice.waitForPageReady: not yet implemented');
  }

  /**
   * Waits for a specific element to reach the target state.
   */
  async waitForState(id: string, state: string, timeout = 5000): Promise<void> {
    // TODO: Poll probe metadata until state matches.
    throw new Error('ProbeDevice.waitForState: not yet implemented');
  }

  // ── Action Dispatch ──

  /**
   * Performs a semantic action on a trigger element and waits for
   * a linked target to reach the expected state.
   *
   * @param triggerId - Probe ID of the element to act on.
   * @param action - Semantic action (e.g., "select:completed", "tap", "type:text").
   * @param options - Target element and expected state to wait for.
   */
  async actAndWait(
    triggerId: string,
    action: string,
    options: ActAndWaitOptions = {},
  ): Promise<void> {
    // TODO: 1. Parse action (tap, select:value, type:text, next-page, etc.)
    //       2. If target specified, subscribe to its state changes
    //       3. Execute action via Detox element interaction
    //       4. Wait for target state
    throw new Error('ProbeDevice.actAndWait: not yet implemented');
  }

  /**
   * Verifies the complete linkage chain after an action.
   */
  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    // TODO: Read linkage metadata, execute action, verify all targets.
    throw new Error('ProbeDevice.verifyLinkage: not yet implemented');
  }

  // ── Hierarchy ──

  /**
   * Checks effective visibility by walking the ancestor chain.
   */
  async isEffectivelyVisible(id: string): Promise<boolean> {
    // TODO: Query element and all ancestors, check visible flags.
    throw new Error('ProbeDevice.isEffectivelyVisible: not yet implemented');
  }

  // ── Platform Context / Device ──

  /**
   * Configures the simulator/emulator to match a built-in device preset.
   */
  async setDevice(preset: string): Promise<void> {
    // TODO: Map preset to Detox device configuration.
    throw new Error('ProbeDevice.setDevice: not yet implemented');
  }

  /**
   * Returns the current platform context.
   */
  getPlatformContext(): PlatformContext {
    // TODO: Read from Detox device info.
    throw new Error('ProbeDevice.getPlatformContext: not yet implemented');
  }

  /**
   * Runs the same test across multiple device presets, collecting results.
   */
  async runAcrossDevices(
    devices: string[],
    test: (probe: ProbeDevice) => Promise<void>,
  ): Promise<Record<string, TestResult>> {
    // TODO: For each device: configure, relaunch app, run test, capture result.
    throw new Error('ProbeDevice.runAcrossDevices: not yet implemented');
  }

  // ── Source Binding ──

  /**
   * Returns the source binding for a probe element.
   */
  async getSource(id: string): Promise<SourceInfo | null> {
    const el = await this.query(id);
    return el?.source ?? null;
  }
}

/**
 * Factory function to create a ProbeDevice from a Detox device instance.
 *
 * @param detoxDevice - The Detox `device` object.
 * @returns A ProbeDevice wrapping the Detox device.
 */
export function createProbeDevice(detoxDevice: unknown): ProbeDevice {
  return new ProbeDevice(detoxDevice);
}
