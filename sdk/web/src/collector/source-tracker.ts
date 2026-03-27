/**
 * SourceTracker — intercepts fetch() and XMLHttpRequest calls to correlate
 * network requests with data-probe-source annotated elements.
 *
 * When a request URL matches a registered element's source.url, the tracker
 * updates that element's source binding with status, timing, and payload info.
 */

import type { ProbeElement, NetworkLogEntry } from '../../../spec/probe-types.js';
import type { ElementRegistry } from './registry.js';
import type { EventStream } from './event-stream.js';

export class SourceTracker {
  private readonly registry: ElementRegistry;
  private readonly eventStream: EventStream;
  private readonly networkLog: NetworkLogEntry[] = [];
  private installed = false;
  private originalFetch: typeof globalThis.fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;

  constructor(registry: ElementRegistry, eventStream: EventStream) {
    this.registry = registry;
    this.eventStream = eventStream;
  }

  /**
   * Install fetch/XHR interceptors. Safe to call multiple times (idempotent).
   * Must be called before any network requests are made that should be tracked.
   */
  install(): void {
    // TODO: implement — monkey-patch globalThis.fetch and XMLHttpRequest.prototype.open
    //   to record request/response info, match against registry elements by source.url,
    //   update element source bindings, push to networkLog, emit events
    throw new Error('Not implemented');
  }

  /**
   * Remove interceptors and restore original fetch/XHR.
   */
  uninstall(): void {
    if (!this.installed) return;
    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      this.originalXHROpen = null;
    }
    this.installed = false;
  }

  /**
   * Return the full network log since installation.
   * Each entry includes the matched elementId if a probe element was correlated.
   */
  getNetworkLog(): NetworkLogEntry[] {
    return [...this.networkLog];
  }

  /**
   * Get the current source binding for a specific probe element.
   *
   * @param id - Probe element ID.
   * @returns The source binding, or null if no source is tracked.
   */
  getSource(id: string): ProbeElement['source'] | null {
    return this.registry.query(id)?.source ?? null;
  }

  /**
   * Wait until a specific element's source binding is populated
   * (i.e., the corresponding network request completes).
   *
   * @param id - Probe element ID.
   * @param timeout - Max wait time in ms. Defaults to 10000.
   * @returns The source binding once available.
   * @throws on timeout.
   */
  waitForSource(id: string, timeout: number = 10000): Promise<NonNullable<ProbeElement['source']>> {
    // TODO: implement — check if source already present, otherwise subscribe
    //   to eventStream for source-update events on this id, race against timeout
    throw new Error('Not implemented');
  }

  /**
   * Clear the network log.
   */
  clearLog(): void {
    this.networkLog.length = 0;
  }
}
