/**
 * Semantic action dispatcher for React Native.
 * Executes UI actions via probe IDs with pre-flight validation
 * and post-action linkage verification.
 */

import type { ElementRegistry } from '../collector/registry';
import type { ProbeElement, LinkageResult, StateInfo } from '../probe';

/**
 * Result of an actAndWait operation.
 */
export interface ActAndWaitResult {
  /** Time spent executing the action (ms) */
  actionDuration: number;
  /** Time spent waiting for target state (ms) */
  waitDuration: number;
  /** Final state of the target element */
  targetState: StateInfo;
  /** Linkage verification results, if element has linkage declarations */
  linkageResults?: LinkageResult;
}

/**
 * Error thrown when pre-flight checks fail before an action.
 */
export class ProbeActionError extends Error {
  constructor(
    public readonly code: 'NOT_FOUND' | 'NOT_VISIBLE' | 'DISABLED' | 'BUSY' | 'OPTION_NOT_FOUND',
    public readonly probeId: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ProbeActionError';
  }
}

/**
 * Dispatches semantic UI actions on React Native elements via probe IDs.
 * Each action runs pre-flight checks (exists, visible, enabled, not busy)
 * and post-action linkage verification when applicable.
 */
export class ActionDispatcher {
  constructor(private readonly registry: ElementRegistry) {}

  /**
   * Taps the element identified by probe ID.
   * Pre-checks: exists, visible, enabled, not loading.
   */
  async tap(id: string): Promise<void> {
    // TODO: 1. Pre-flight check
    //       2. Dispatch native tap via NativeModule bridge
    //       3. If element has linkage, verify targets
    throw new Error('ActionDispatcher.tap: not yet implemented');
  }

  /**
   * Types text into a form element.
   * Pre-checks: exists, visible, enabled, is form type.
   */
  async type(id: string, text: string): Promise<void> {
    // TODO: Validate form type, focus element, type characters.
    throw new Error('ActionDispatcher.type: not yet implemented');
  }

  /**
   * Fills a form element with the specified value (replaces existing).
   * Pre-checks: exists, visible, enabled, is form type.
   */
  async fill(id: string, value: string): Promise<void> {
    // TODO: Clear existing value, then type new value.
    throw new Error('ActionDispatcher.fill: not yet implemented');
  }

  /**
   * Selects a value in a selector element.
   * Pre-checks: exists, visible, enabled, option exists in available options.
   */
  async select(id: string, value: string): Promise<void> {
    // TODO: Validate selector type, check option exists in data.options,
    //       dispatch native selection.
    throw new Error('ActionDispatcher.select: not yet implemented');
  }

  /**
   * Scrolls an element to the specified position.
   */
  async scrollTo(id: string, position: { top?: number; left?: number }): Promise<void> {
    // TODO: Dispatch native scroll command.
    throw new Error('ActionDispatcher.scrollTo: not yet implemented');
  }

  /**
   * Performs a semantic action and waits for a linked target to reach
   * the expected state. Event-driven via state change subscriptions.
   *
   * @param id - Probe ID of the trigger element.
   * @param action - Semantic action (e.g., "select:completed", "tap", "type:text").
   * @param waitFor - Target element and expected state to wait for.
   * @returns Structured result with durations and final state.
   */
  async actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult> {
    // TODO: 1. Parse action string
    //       2. Subscribe to target state changes
    //       3. Execute action
    //       4. Wait for target state or timeout
    //       5. Compile result
    throw new Error('ActionDispatcher.actAndWait: not yet implemented');
  }

  /**
   * Verifies the complete linkage chain triggered by an action.
   * Returns direct effects, chained effects, and API calls observed.
   */
  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    // TODO: 1. Read linkage from element
    //       2. Execute action
    //       3. Monitor targets and API calls
    //       4. Follow chain paths
    //       5. Return structured result
    throw new Error('ActionDispatcher.verifyLinkage: not yet implemented');
  }

  /**
   * Runs pre-flight checks. Throws ProbeActionError if any check fails.
   */
  private preFlightCheck(id: string, requiredType?: string): ProbeElement {
    // TODO: exists, visible, enabled, not busy, type matches.
    throw new Error('ActionDispatcher.preFlightCheck: not yet implemented');
  }
}
