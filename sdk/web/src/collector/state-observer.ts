/**
 * StateObserver — watches for data-probe-state attribute changes on
 * registered probe elements using MutationObserver.
 *
 * Provides event-driven state change notifications (no polling) and
 * promise-based waitForState() for test synchronization.
 */

import type { ElementRegistry } from './registry.js';
import type { EventStream } from './event-stream.js';

export interface StateChangeEvent {
  id: string;
  oldState: string;
  newState: string;
  timestamp: number;
}

export class StateObserver {
  private observer: MutationObserver | null = null;
  private readonly registry: ElementRegistry;
  private readonly eventStream: EventStream;

  constructor(registry: ElementRegistry, eventStream: EventStream) {
    this.registry = registry;
    this.eventStream = eventStream;
  }

  /**
   * Start observing attribute mutations on probe elements within the given root.
   * Watches for changes to data-probe-state and updates the registry + event stream.
   *
   * @param root - The DOM subtree root to observe. Defaults to document.body.
   */
  observe(root: Element = document.body): void {
    this.disconnect();
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'data-probe-state') continue;
        const el = mutation.target as Element;
        const id = el.getAttribute('data-probe-id');
        if (!id) continue;

        const newState = el.getAttribute('data-probe-state') ?? 'idle';
        const oldState = mutation.oldValue ?? 'unknown';

        if (oldState === newState) continue;

        const timestamp = Date.now();
        this.registry.updateState(id, {
          current: newState,
          previous: oldState,
          timestamp,
        });

        this.eventStream.emit({
          type: 'state-change',
          elementId: id,
          timestamp,
          detail: { oldState, newState } satisfies Omit<StateChangeEvent, 'id' | 'timestamp'>,
        });
      }
    });
    this.observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-probe-state'],
      attributeOldValue: true,
      subtree: true,
    });
  }

  /**
   * Stop the MutationObserver.
   */
  disconnect(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * Wait until a specific element reaches the desired state.
   * Resolves immediately if the element is already in that state.
   *
   * @param id - Probe element ID.
   * @param state - Target state string (e.g. "loaded", "error").
   * @param timeout - Max wait time in ms. Defaults to 10000.
   * @throws on timeout.
   */
  waitForState(id: string, state: string, timeout: number = 10000): Promise<void> {
    // Check current state first
    const current = this.registry.query(id);
    if (current?.state.current === state) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`waitForState('${id}', '${state}') timed out after ${timeout}ms`));
      }, timeout);

      const unsub = this.eventStream.on(`state-change:${id}`, (event) => {
        const detail = event.detail as { newState: string };
        if (detail.newState === state) {
          clearTimeout(timer);
          unsub();
          resolve();
        }
      });
    });
  }

  /**
   * Register a callback for state changes on a specific element.
   *
   * @param id - Probe element ID.
   * @param callback - Called with (oldState, newState) on each change.
   * @returns Unsubscribe function.
   */
  onStateChange(
    id: string,
    callback: (oldState: string, newState: string) => void,
  ): () => void {
    return this.eventStream.on(`state-change:${id}`, (event) => {
      const detail = event.detail as { oldState: string; newState: string };
      callback(detail.oldState, detail.newState);
    });
  }
}
