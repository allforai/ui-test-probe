/**
 * SourceTracker — intercepts fetch() and XMLHttpRequest calls to correlate
 * network requests with data-probe-source annotated elements.
 *
 * When a request URL matches a registered element's source.url, the tracker
 * updates that element's source binding with status, timing, and payload info.
 */

import type { ProbeElement, NetworkLogEntry } from '../../../../spec/probe-types.js';
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
    if (this.installed) return;
    this.installed = true;

    // --- Intercept fetch ---
    this.originalFetch = globalThis.fetch;
    const self = this;
    globalThis.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const method = init?.method?.toUpperCase() ?? 'GET';
      const startTime = Date.now();

      try {
        const response = await self.originalFetch!.call(globalThis, input, init);
        const entry: NetworkLogEntry = {
          url,
          method,
          status: response.status,
          timestamp: startTime,
        };
        self.recordRequest(entry, Date.now() - startTime);
        return response;
      } catch (err) {
        const entry: NetworkLogEntry = { url, method, status: 0, timestamp: startTime };
        self.recordRequest(entry, Date.now() - startTime);
        throw err;
      }
    };

    // --- Intercept XMLHttpRequest ---
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...args: unknown[]) {
      (this as XMLHttpRequest & { __probeMethod: string; __probeUrl: string }).__probeMethod = method.toUpperCase();
      (this as XMLHttpRequest & { __probeUrl: string }).__probeUrl = typeof url === 'string' ? url : url.toString();
      return self.originalXHROpen!.apply(this, [method, url, ...args] as Parameters<typeof XMLHttpRequest.prototype.open>);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { __probeMethod?: string; __probeUrl?: string }, body?: Document | XMLHttpRequestBodyInit | null) {
      const startTime = Date.now();
      const xhrMethod = this.__probeMethod ?? 'GET';
      const xhrUrl = this.__probeUrl ?? '';

      this.addEventListener('loadend', () => {
        const entry: NetworkLogEntry = {
          url: xhrUrl,
          method: xhrMethod,
          status: this.status,
          timestamp: startTime,
        };
        self.recordRequest(entry, Date.now() - startTime);
      });

      return origSend.call(this, body);
    };
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
    const existing = this.getSource(id);
    if (existing?.status) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`waitForSource('${id}') timed out after ${timeout}ms`));
      }, timeout);

      const unsub = this.eventStream.on(`source-update:${id}`, (event) => {
        const source = event.detail as NonNullable<ProbeElement['source']>;
        clearTimeout(timer);
        unsub();
        resolve(source);
      });
    });
  }

  /**
   * Match a network request against registered elements and update source bindings.
   */
  private recordRequest(entry: NetworkLogEntry, responseTime: number): void {
    // Find matching element by source URL
    const allElements = this.registry.queryAll();
    for (const el of allElements) {
      if (!el.source?.url) continue;
      // Match if request URL ends with or contains the source URL pattern
      if (entry.url.includes(el.source.url) || entry.url.endsWith(el.source.url)) {
        entry.elementId = el.id;
        el.source = {
          ...el.source,
          status: entry.status,
          responseTime,
        };
        this.eventStream.emit({
          type: 'source-update',
          elementId: el.id,
          timestamp: entry.timestamp,
          detail: el.source,
        });
        break;
      }
    }
    this.networkLog.push(entry);
    this.eventStream.emit({
      type: 'network-request',
      elementId: entry.elementId,
      timestamp: entry.timestamp,
      detail: entry,
    });
  }

  /**
   * Clear the network log.
   */
  clearLog(): void {
    this.networkLog.length = 0;
  }
}
