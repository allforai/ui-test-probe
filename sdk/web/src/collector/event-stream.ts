/**
 * EventStream — central event bus for all probe-related events.
 *
 * Provides typed pub/sub for state changes, source updates, layout changes,
 * and interaction events. Supports both callback subscriptions and
 * promise-based waitFor() for test synchronization.
 */

export type ProbeEventType =
  | 'state-change'
  | 'source-update'
  | 'layout-change'
  | 'element-registered'
  | 'element-unregistered'
  | 'interaction'
  | 'network-request';

export interface ProbeEvent {
  type: ProbeEventType;
  elementId?: string;
  timestamp: number;
  detail: unknown;
}

type EventCallback = (event: ProbeEvent) => void;

export class EventStream {
  private readonly listeners: Map<string, Set<EventCallback>> = new Map();
  private readonly history: ProbeEvent[] = [];
  private readonly maxHistory: number;

  /**
   * @param maxHistory - Maximum number of events to retain in history. Defaults to 1000.
   */
  constructor(maxHistory: number = 1000) {
    this.maxHistory = maxHistory;
  }

  /**
   * Emit an event to all matching subscribers.
   *
   * @param event - The event to emit.
   */
  emit(event: ProbeEvent): void {
    this.history.push(event);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Notify global listeners
    const globalListeners = this.listeners.get('*');
    if (globalListeners) {
      for (const cb of globalListeners) cb(event);
    }

    // Notify type-specific listeners
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      for (const cb of typeListeners) cb(event);
    }

    // Notify element-specific listeners
    if (event.elementId) {
      const elKey = `${event.type}:${event.elementId}`;
      const elListeners = this.listeners.get(elKey);
      if (elListeners) {
        for (const cb of elListeners) cb(event);
      }
    }
  }

  /**
   * Subscribe to events.
   *
   * @param typeOrKey - Event type (e.g. "state-change"), element-scoped key
   *   (e.g. "state-change:order-list"), or "*" for all events.
   * @param callback - Called for each matching event.
   * @returns Unsubscribe function.
   */
  on(typeOrKey: string, callback: EventCallback): () => void {
    if (!this.listeners.has(typeOrKey)) {
      this.listeners.set(typeOrKey, new Set());
    }
    this.listeners.get(typeOrKey)!.add(callback);

    return () => {
      this.listeners.get(typeOrKey)?.delete(callback);
    };
  }

  /**
   * Unsubscribe a specific callback.
   */
  off(typeOrKey: string, callback: EventCallback): void {
    this.listeners.get(typeOrKey)?.delete(callback);
  }

  /**
   * Wait for the next event matching the given criteria.
   *
   * @param typeOrKey - Event type or element-scoped key.
   * @param predicate - Optional filter; resolves only when predicate returns true.
   * @param timeout - Max wait time in ms. Defaults to 10000.
   * @returns The matching event.
   * @throws on timeout.
   */
  waitFor(
    typeOrKey: string,
    predicate?: (event: ProbeEvent) => boolean,
    timeout: number = 10000,
  ): Promise<ProbeEvent> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`EventStream.waitFor('${typeOrKey}') timed out after ${timeout}ms`));
      }, timeout);

      const unsub = this.on(typeOrKey, (event) => {
        if (!predicate || predicate(event)) {
          clearTimeout(timer);
          unsub();
          resolve(event);
        }
      });
    });
  }

  /**
   * Get the event history buffer.
   */
  getHistory(): readonly ProbeEvent[] {
    return this.history;
  }

  /**
   * Clear all listeners and history.
   */
  clear(): void {
    this.listeners.clear();
    this.history.length = 0;
  }
}
