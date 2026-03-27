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
} from '../../../../spec/probe-types.js';
import type { ElementRegistry } from '../collector/registry.js';
import type { EventStream } from '../collector/event-stream.js';
import type { StateObserver } from '../collector/state-observer.js';

export class ActionDispatcher {
  private readonly registry: ElementRegistry;
  private readonly eventStream: EventStream;
  private stateObserver: StateObserver | null = null;

  constructor(registry: ElementRegistry, eventStream: EventStream) {
    this.registry = registry;
    this.eventStream = eventStream;
  }

  /** Connect a StateObserver for waitForState in actAndWait. */
  setStateObserver(observer: StateObserver): void {
    this.stateObserver = observer;
  }

  /** Get DOM element from registry, throw if not found. */
  private getDOMElement(id: string): HTMLElement {
    const el = this.registry.getDOMElement(id);
    if (!el) throw { error: 'NOT_FOUND', id } satisfies ProbeActionError;
    return el as HTMLElement;
  }

  /**
   * Click a probe element by ID.
   * Pre-checks: exists, visible, not disabled, not loading.
   */
  async click(id: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.click();
    this.emitInteraction(id, 'click');
  }

  async doubleClick(id: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }));
    this.emitInteraction(id, 'dblclick');
  }

  async rightClick(id: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, button: 2 }));
    this.emitInteraction(id, 'contextmenu');
  }

  async hover(id: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    dom.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    this.emitInteraction(id, 'hover');
  }

  async focus(id: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.focus();
    this.emitInteraction(id, 'focus');
  }

  async type(id: string, text: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id) as HTMLInputElement;
    for (const char of text) {
      dom.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      dom.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      dom.value += char;
      dom.dispatchEvent(new Event('input', { bubbles: true }));
      dom.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    }
    this.emitInteraction(id, 'type');
  }

  async fill(id: string, value: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id) as HTMLInputElement;
    // Use native setter to work with React controlled components
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype, 'value'
    )?.set ?? Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(dom, value);
    } else {
      dom.value = value;
    }
    dom.dispatchEvent(new Event('input', { bubbles: true }));
    dom.dispatchEvent(new Event('change', { bubbles: true }));
    this.emitInteraction(id, 'fill');
  }

  async clear(id: string): Promise<void> {
    await this.fill(id, '');
  }

  async select(id: string, value: string): Promise<void> {
    const element = this.preCheck(id);
    if (element.data?.options && !element.data.options.includes(value)) {
      throw {
        error: 'OPTION_NOT_FOUND',
        id,
        available: element.data.options,
      } satisfies ProbeActionError;
    }

    const dom = this.getDOMElement(id) as HTMLSelectElement;
    dom.value = value;
    dom.dispatchEvent(new Event('change', { bubbles: true }));
    dom.dispatchEvent(new Event('input', { bubbles: true }));
    this.emitInteraction(id, 'select');
  }

  async check(id: string, checked: boolean): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id) as HTMLInputElement;
    dom.checked = checked;
    dom.dispatchEvent(new Event('change', { bubbles: true }));
    dom.dispatchEvent(new Event('input', { bubbles: true }));
    this.emitInteraction(id, 'check');
  }

  async scrollTo(id: string, position: { top?: number; left?: number }): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.scrollTo({ top: position.top, left: position.left, behavior: 'instant' });
    this.emitInteraction(id, 'scrollTo');
  }

  async scrollToBottom(id: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.scrollTop = dom.scrollHeight;
    this.emitInteraction(id, 'scrollToBottom');
  }

  async scrollIntoView(id: string): Promise<void> {
    this.preCheck(id);
    const dom = this.getDOMElement(id);
    dom.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.emitInteraction(id, 'scrollIntoView');
  }

  async drag(sourceId: string, targetId: string): Promise<void> {
    this.preCheck(sourceId);
    this.preCheck(targetId);
    const sourceDom = this.getDOMElement(sourceId);
    const targetDom = this.getDOMElement(targetId);

    const sourceRect = sourceDom.getBoundingClientRect();
    const targetRect = targetDom.getBoundingClientRect();

    sourceDom.dispatchEvent(new DragEvent('dragstart', {
      bubbles: true,
      clientX: sourceRect.x + sourceRect.width / 2,
      clientY: sourceRect.y + sourceRect.height / 2,
    }));
    targetDom.dispatchEvent(new DragEvent('dragover', {
      bubbles: true,
      clientX: targetRect.x + targetRect.width / 2,
      clientY: targetRect.y + targetRect.height / 2,
    }));
    targetDom.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      clientX: targetRect.x + targetRect.width / 2,
      clientY: targetRect.y + targetRect.height / 2,
    }));
    sourceDom.dispatchEvent(new DragEvent('dragend', { bubbles: true }));
    this.emitInteraction(sourceId, 'drag');
  }

  async pressShortcut(key: string): Promise<void> {
    const parts = key.split('+').map(p => p.trim());
    const keyName = parts.pop()!;
    const ctrlKey = parts.some(p => p.toLowerCase() === 'ctrl' || p.toLowerCase() === 'control');
    const shiftKey = parts.some(p => p.toLowerCase() === 'shift');
    const altKey = parts.some(p => p.toLowerCase() === 'alt');
    const metaKey = parts.some(p => p.toLowerCase() === 'meta' || p.toLowerCase() === 'cmd');

    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: keyName, ctrlKey, shiftKey, altKey, metaKey, bubbles: true,
    }));
    document.dispatchEvent(new KeyboardEvent('keyup', {
      key: keyName, ctrlKey, shiftKey, altKey, metaKey, bubbles: true,
    }));
  }

  async navigate(route: string): Promise<void> {
    window.history.pushState({}, '', route);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  /**
   * Verify all linkage targets respond correctly after triggering an action.
   *
   * @param triggerId - The probe element that was acted upon.
   * @param action - The action that was performed (e.g. "click", "select:value").
   * @returns Full linkage verification result including direct, chained, and API effects.
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
        await this.eventStream.waitFor(
          `state-change:${target.id}`,
          undefined,
          timeout,
        );
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

  async actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult> {
    const timeout = waitFor.timeout ?? 10000;
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
    if (waitFor.target && waitFor.state && this.stateObserver) {
      await this.stateObserver.waitForState(waitFor.target, waitFor.state, timeout);
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

  private emitInteraction(id: string, action: string): void {
    this.eventStream.emit({
      type: 'interaction',
      elementId: id,
      timestamp: Date.now(),
      detail: { action },
    });
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
