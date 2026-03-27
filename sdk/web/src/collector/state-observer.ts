/**
 * StateObserver — watches for data-probe-state attribute changes on
 * registered probe elements using MutationObserver.
 *
 * Provides event-driven state change notifications (no polling) and
 * promise-based waitForState() for test synchronization.
 */

import type { ProbeElement } from '../../../spec/probe-types.js';
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
    // TODO: implement — MutationObserver on attributes, filter data-probe-state,
    //   read old/new value, call registry.updateState(), emit to eventStream
    throw new Error('Not implemented');
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
    // TODO: implement — check current state, if match resolve immediately,
    //   otherwise subscribe to eventStream and race against timeout
    throw new Error('Not implemented');
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
    // TODO: implement — subscribe to eventStream filtered by id
    throw new Error('Not implemented');
  }
}
