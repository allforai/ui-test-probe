/**
 * ActionDispatcher — semantic actions using probe IDs with smart pre-checks.
 *
 * Every action method validates element state before performing the action:
 *   1. Element exists (NOT_FOUND)
 *   2. Element is visible (NOT_VISIBLE)
 *   3. Element is not disabled (DISABLED)
 *   4. Element is not busy/loading (BUSY)
 *   5. For select: option exists (OPTION_NOT_FOUND)
 *
 * After action, if the element has linkage declarations, the dispatcher
 * automatically verifies all linked targets responded correctly.
 */

import type {
  ProbeElement,
  LinkageResult,
  ActAndWaitResult,
  ProbeActionError,
} from '../../../spec/probe-types.js';
import type { ElementRegistry } from '../collector/registry.js';
import type { EventStream } from '../collector/event-stream.js';

export class ActionDispatcher {
  private readonly registry: ElementRegistry;
  private readonly eventStream: EventStream;

  constructor(registry: ElementRegistry, eventStream: EventStream) {
    this.registry = registry;
    this.eventStream = eventStream;
  }

  /**
   * Click a probe element by ID.
   * Pre-checks: exists, visible, not disabled, not loading.
   */
  async click(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement — get DOM element, dispatch click event,
    //   check linkage, wait for linked targets if declared
    throw new Error('Not implemented');
  }

  /**
   * Double-click a probe element.
   */
  async doubleClick(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Right-click (context menu) a probe element.
   */
  async rightClick(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Hover over a probe element.
   */
  async hover(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Focus a probe element.
   */
  async focus(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Type text into a form element character by character.
   * Pre-checks: exists, visible, not disabled.
   */
  async type(id: string, text: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement — dispatch keydown/keypress/keyup for each char
    throw new Error('Not implemented');
  }

  /**
   * Fill a form element with a value (replaces existing content).
   * Pre-checks: exists, visible, not disabled.
   */
  async fill(id: string, value: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement — set value property, dispatch input + change events
    throw new Error('Not implemented');
  }

  /**
   * Clear a form element's value.
   */
  async clear(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Select an option from a selector element.
   * Additional pre-check: value must exist in data.options.
   */
  async select(id: string, value: string): Promise<void> {
    const element = this.preCheck(id);

    // Verify option exists
    if (element.data?.options && !element.data.options.includes(value)) {
      const err: ProbeActionError = {
        error: 'OPTION_NOT_FOUND',
        id,
        available: element.data.options,
      };
      throw err;
    }

    // TODO: implement — set select value, dispatch change event,
    //   check linkage targets
    throw new Error('Not implemented');
  }

  /**
   * Check or uncheck a checkbox/radio element.
   */
  async check(id: string, checked: boolean): Promise<void> {
    this.preCheck(id);
    // TODO: implement
    throw new Error('Not implemented');
  }

  /**
   * Scroll a scrollable element to a specific position.
   */
  async scrollTo(id: string, position: { top?: number; left?: number }): Promise<void> {
    this.preCheck(id);
    // TODO: implement — element.scrollTo()
    throw new Error('Not implemented');
  }

  /**
   * Scroll a scrollable element to its bottom.
   */
  async scrollToBottom(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement — element.scrollTop = element.scrollHeight
    throw new Error('Not implemented');
  }

  /**
   * Scroll the page so that the element is visible in the viewport.
   */
  async scrollIntoView(id: string): Promise<void> {
    this.preCheck(id);
    // TODO: implement — element.scrollIntoView({ behavior: 'smooth' })
    throw new Error('Not implemented');
  }

  /**
   * Drag an element to another element's position.
   */
  async drag(sourceId: string, targetId: string): Promise<void> {
    this.preCheck(sourceId);
    this.preCheck(targetId);
    // TODO: implement — dispatch dragstart, dragover, drop sequence
    throw new Error('Not implemented');
  }

  /**
   * Press a keyboard shortcut.
   */
  async pressShortcut(key: string): Promise<void> {
    // TODO: implement — parse key combo (e.g. "Ctrl+S"), dispatch keydown on document
    throw new Error('Not implemented');
  }

  /**
   * Navigate to a route.
   */
  async navigate(route: string): Promise<void> {
    // TODO: implement — window.history.pushState or location change
    throw new Error('Not implemented');
  }

  /**
   * Verify all linkage targets respond correctly after triggering an action.
   *
   * @param triggerId - The probe element that was acted upon.
   * @param action - The action that was performed (e.g. "click", "select:value").
   * @returns Full linkage verification result including direct, chained, and API effects.
   */
  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    // TODO: implement — read linkage from element, wait for each target's expected
    //   state change, track API calls, follow chain paths
    throw new Error('Not implemented');
  }

  /**
   * Perform an action, wait for a target to reach a state, and optionally verify linkage.
   * Combines action dispatch + wait + linkage verification in one call.
   */
  async actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult> {
    // TODO: implement — dispatch action, start timer, waitForState on target,
    //   verify linkage if declared, measure durations
    throw new Error('Not implemented');
  }

  /**
   * Smart pre-check: verifies element exists, is visible, enabled, and not busy.
   * Throws a ProbeActionError if any check fails.
   *
   * @returns The validated ProbeElement (for further checks like option validation).
   */
  private preCheck(id: string): ProbeElement {
    const element = this.registry.query(id);
    if (!element) {
      throw { error: 'NOT_FOUND', id } satisfies ProbeActionError;
    }
    if (!element.layout.visible) {
      throw { error: 'NOT_VISIBLE', id } satisfies ProbeActionError;
    }
    if (element.state.current === 'disabled') {
      const reason = element.state.validationErrors
        ?.map(e => `${e.field}: ${e.message}`)
        .join('; ');
      throw { error: 'DISABLED', id, reason } satisfies ProbeActionError;
    }
    if (element.state.current === 'loading' || element.state.current === 'submitting') {
      throw { error: 'BUSY', id, reason: `Element is ${element.state.current}` } satisfies ProbeActionError;
    }
    return element;
  }
}
