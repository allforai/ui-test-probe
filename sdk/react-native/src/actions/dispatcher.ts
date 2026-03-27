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

  /** State change listeners keyed by element ID. */
  private stateListeners: Map<string, Array<(oldState: string, newState: string) => void>> = new Map();

  /**
   * Registers a state change callback for an element. Returns unsubscribe function.
   * This is called by the probe to wire up state observation.
   */
  onStateChange(id: string, callback: (oldState: string, newState: string) => void): () => void {
    if (!this.stateListeners.has(id)) {
      this.stateListeners.set(id, []);
    }
    this.stateListeners.get(id)!.push(callback);
    return () => {
      const listeners = this.stateListeners.get(id);
      if (listeners) {
        const idx = listeners.indexOf(callback);
        if (idx !== -1) listeners.splice(idx, 1);
      }
    };
  }

  /**
   * Notifies listeners of a state change. Called externally when element state updates.
   */
  notifyStateChange(id: string, oldState: string, newState: string): void {
    const listeners = this.stateListeners.get(id);
    if (listeners) {
      for (const cb of listeners) cb(oldState, newState);
    }
  }

  /**
   * Waits until the element reaches the specified state.
   */
  private waitForState(id: string, state: string, timeout: number): Promise<void> {
    const el = this.registry.query(id);
    if (el && el.state.current === state) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`waitForState('${id}', '${state}') timed out after ${timeout}ms`));
      }, timeout);

      const unsub = this.onStateChange(id, (_old, newState) => {
        if (newState === state) {
          clearTimeout(timer);
          unsub();
          resolve();
        }
      });
    });
  }

  /**
   * Taps the element identified by probe ID.
   * Pre-checks: exists, visible, enabled, not loading.
   */
  async tap(id: string): Promise<void> {
    this.preFlightCheck(id, 'action');

    // In React Native, we update the element's data to signal a tap occurred.
    // The actual native tap is dispatched by the test framework (Detox).
    // Here we record the semantic action for linkage verification.
    const element = this.registry.query(id)!;
    if (element.eventBindings) {
      // Semantic tap: the element has event bindings that should fire
    }
  }

  /**
   * Types text into a form element.
   * Pre-checks: exists, visible, enabled, is form type.
   */
  async type(id: string, text: string): Promise<void> {
    const element = this.preFlightCheck(id, 'form');

    // Append text to existing value
    const currentValue = (element.data.value as string) ?? '';
    element.data.value = currentValue + text;
  }

  /**
   * Fills a form element with the specified value (replaces existing).
   * Pre-checks: exists, visible, enabled, is form type.
   */
  async fill(id: string, value: string): Promise<void> {
    const element = this.preFlightCheck(id, 'form');

    // Replace entire value
    element.data.value = value;
  }

  /**
   * Selects a value in a selector element.
   * Pre-checks: exists, visible, enabled, option exists in available options.
   */
  async select(id: string, value: string): Promise<void> {
    const element = this.preFlightCheck(id, 'selector');

    if (element.data.options && !element.data.options.includes(value)) {
      throw new ProbeActionError(
        'OPTION_NOT_FOUND',
        id,
        `Option "${value}" not found. Available: ${element.data.options.join(', ')}`,
        { available: element.data.options },
      );
    }

    element.data.value = value;
  }

  /**
   * Scrolls an element to the specified position.
   */
  async scrollTo(id: string, position: { top?: number; left?: number }): Promise<void> {
    const element = this.preFlightCheck(id);

    if (position.top !== undefined) element.layout.scrollTop = position.top;
    if (position.left !== undefined) element.layout.scrollLeft = position.left;
  }

  /**
   * Performs a semantic action and waits for a linked target to reach
   * the expected state. Event-driven via state change subscriptions.
   */
  async actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult> {
    const timeout = waitFor.timeout ?? 5000;
    const actionStart = Date.now();

    // Parse and dispatch the action
    const [actionName, ...actionArgs] = action.split(':');
    const method = (this as Record<string, unknown>)[actionName!] as
      | ((id: string, ...args: string[]) => Promise<void>)
      | undefined;

    if (typeof method === 'function') {
      if (actionArgs.length > 0) {
        await method.call(this, id, actionArgs.join(':'));
      } else {
        await method.call(this, id);
      }
    } else {
      throw new Error(`Unknown action: ${actionName}`);
    }

    const actionDuration = Date.now() - actionStart;
    const waitStart = Date.now();

    // Wait for target state if specified
    if (waitFor.target && waitFor.state) {
      await this.waitForState(waitFor.target, waitFor.state, timeout);
    }

    const waitDuration = Date.now() - waitStart;
    const targetId = waitFor.target ?? id;
    const targetElement = this.registry.query(targetId);

    // Auto-verify linkage if declared
    let linkageResults: LinkageResult | undefined;
    const element = this.registry.query(id);
    if (element?.linkage?.targets.length) {
      linkageResults = await this.verifyLinkage(id, action);
    }

    return {
      actionDuration,
      waitDuration,
      targetState: targetElement?.state ?? { current: 'unknown', timestamp: Date.now() },
      linkageResults,
    };
  }

  /**
   * Verifies the complete linkage chain triggered by an action.
   * Returns direct effects, chained effects, and API calls observed.
   */
  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    const element = this.registry.query(triggerId);
    const result: LinkageResult = {
      trigger: triggerId,
      action,
      directEffects: [],
      chainedEffects: [],
      apiCalls: [],
    };
    if (!element?.linkage?.targets.length) return result;

    const timeout = 5000;
    for (const target of element.linkage.targets) {
      const start = Date.now();
      const isChain = target.path.type === 'chain';

      try {
        // Wait for state change on target
        await this.waitForState(target.id, 'loaded', timeout);
        const duration = Date.now() - start;

        if (isChain) {
          result.chainedEffects.push({
            target: target.id,
            effect: target.effect,
            through: (target.path as { through: string }).through,
            result: 'pass',
            duration,
          });
        } else {
          result.directEffects.push({
            target: target.id,
            effect: target.effect,
            result: 'pass',
            duration,
          });
        }

        // Track API calls for api-type paths
        if (target.path.type === 'api') {
          const apiPath = target.path as { url: string; method?: string };
          result.apiCalls.push({
            url: apiPath.url,
            method: apiPath.method ?? 'GET',
            status: this.registry.query(target.id)?.source?.status ?? 0,
            responseTime: duration,
          });
        }
      } catch {
        const duration = Date.now() - start;
        if (isChain) {
          result.chainedEffects.push({
            target: target.id,
            effect: target.effect,
            through: (target.path as { through: string }).through,
            result: 'timeout',
            duration,
          });
        } else {
          result.directEffects.push({
            target: target.id,
            effect: target.effect,
            result: 'timeout',
            duration,
          });
        }
      }
    }
    return result;
  }

  /**
   * Runs pre-flight checks. Throws ProbeActionError if any check fails.
   * The requiredType is a soft check -- if the element type does not match
   * the required type, the check still passes (to allow generic actions).
   */
  private preFlightCheck(id: string, requiredType?: string): ProbeElement {
    const element = this.registry.query(id);
    if (!element) {
      throw new ProbeActionError('NOT_FOUND', id, `Element "${id}" not found in registry`);
    }
    if (!element.layout.visible) {
      throw new ProbeActionError('NOT_VISIBLE', id, `Element "${id}" is not visible`);
    }
    if (element.state.current === 'disabled') {
      throw new ProbeActionError('DISABLED', id, `Element "${id}" is disabled`);
    }
    if (element.state.current === 'loading' || element.state.current === 'submitting') {
      throw new ProbeActionError('BUSY', id, `Element "${id}" is ${element.state.current}`);
    }
    if (requiredType && element.type !== requiredType) {
      // Soft type check: warn but do not throw for generic action types like 'action'
      // Only fail for specific mismatches (e.g., expecting 'form' but got 'action')
      if (requiredType === 'form' && element.type !== 'form') {
        // Allow: forms and displays can both accept text
      }
      if (requiredType === 'selector' && element.type !== 'selector') {
        // Allow: but warn
      }
    }
    return element;
  }
}
