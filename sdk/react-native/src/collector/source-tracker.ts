/**
 * Source tracker for React Native.
 * Intercepts network requests (fetch / XMLHttpRequest) in the JS runtime
 * and correlates them to probe elements via their source declarations.
 */

export interface NetworkEntry {
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Response status code */
  status: number;
  /** Probe ID of the element bound to this source, if any */
  elementId?: string;
  /** Timestamp of request completion */
  timestamp: number;
  /** Response time in milliseconds */
  responseTime: number;
}

/**
 * Tracks network activity and correlates it to probe source bindings.
 * Patches global fetch and XMLHttpRequest to intercept all requests,
 * then matches URLs against registered probe element sources.
 */
export class SourceTracker {
  private log: NetworkEntry[] = [];
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private isActive = false;
  /** Registered source URLs mapped to element IDs for correlation. */
  private sourceBindings: Map<string, string> = new Map();
  /** Listeners waiting for a matching request to complete. */
  private requestListeners: Array<{
    pattern: string | RegExp;
    resolve: (entry: NetworkEntry) => void;
  }> = [];

  /**
   * Registers a source URL binding for an element so network requests
   * can be correlated to probe elements.
   */
  registerSource(elementId: string, url: string): void {
    this.sourceBindings.set(url, elementId);
  }

  /**
   * Starts intercepting network requests.
   * Patches global.fetch and XMLHttpRequest.prototype.open/send.
   * Safe to call multiple times; only patches once.
   */
  start(): void {
    if (this.isActive) return;
    this.isActive = true;

    // --- Intercept fetch ---
    this.originalFetch = globalThis.fetch;
    const self = this;

    globalThis.fetch = async function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url = typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
      const method = (init?.method ?? 'GET').toUpperCase();
      const startTime = Date.now();

      try {
        const response = await self.originalFetch!.call(globalThis, input, init);
        const entry: NetworkEntry = {
          url,
          method,
          status: response.status,
          elementId: self.matchSource(url),
          timestamp: startTime,
          responseTime: Date.now() - startTime,
        };
        self.recordEntry(entry);
        return response;
      } catch (err) {
        const entry: NetworkEntry = {
          url,
          method,
          status: 0,
          elementId: self.matchSource(url),
          timestamp: startTime,
          responseTime: Date.now() - startTime,
        };
        self.recordEntry(entry);
        throw err;
      }
    };

    // --- Intercept XMLHttpRequest ---
    if (typeof XMLHttpRequest !== 'undefined') {
      this.originalXHROpen = XMLHttpRequest.prototype.open;
      this.originalXHRSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest & { __probeMethod?: string; __probeUrl?: string },
        method: string,
        url: string | URL,
        ...rest: unknown[]
      ) {
        this.__probeMethod = method.toUpperCase();
        this.__probeUrl = typeof url === 'string' ? url : url.toString();
        return self.originalXHROpen!.apply(
          this,
          [method, url, ...rest] as Parameters<typeof XMLHttpRequest.prototype.open>,
        );
      };

      XMLHttpRequest.prototype.send = function (
        this: XMLHttpRequest & { __probeMethod?: string; __probeUrl?: string },
        body?: Document | XMLHttpRequestBodyInit | null,
      ) {
        const startTime = Date.now();
        const xhrMethod = this.__probeMethod ?? 'GET';
        const xhrUrl = this.__probeUrl ?? '';

        this.addEventListener('loadend', () => {
          const entry: NetworkEntry = {
            url: xhrUrl,
            method: xhrMethod,
            status: this.status,
            elementId: self.matchSource(xhrUrl),
            timestamp: startTime,
            responseTime: Date.now() - startTime,
          };
          self.recordEntry(entry);
        });

        return self.originalXHRSend!.call(this, body);
      };
    }
  }

  /**
   * Stops intercepting network requests and restores originals.
   */
  stop(): void {
    if (!this.isActive) return;

    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
      this.originalFetch = null;
    }
    if (typeof XMLHttpRequest !== 'undefined') {
      if (this.originalXHROpen) {
        XMLHttpRequest.prototype.open = this.originalXHROpen;
        this.originalXHROpen = null;
      }
      if (this.originalXHRSend) {
        XMLHttpRequest.prototype.send = this.originalXHRSend;
        this.originalXHRSend = null;
      }
    }
    this.isActive = false;
  }

  /** Match a request URL against registered source bindings. */
  private matchSource(url: string): string | undefined {
    for (const [sourceUrl, elementId] of this.sourceBindings) {
      if (url.includes(sourceUrl) || url.endsWith(sourceUrl)) {
        return elementId;
      }
    }
    return undefined;
  }

  /** Record an entry and notify any waiting listeners. */
  private recordEntry(entry: NetworkEntry): void {
    this.log.push(entry);

    const remaining: typeof this.requestListeners = [];
    for (const listener of this.requestListeners) {
      const matches =
        typeof listener.pattern === 'string'
          ? entry.url.includes(listener.pattern)
          : listener.pattern.test(entry.url);
      if (matches) {
        listener.resolve(entry);
      } else {
        remaining.push(listener);
      }
    }
    this.requestListeners = remaining;
  }

  /**
   * Returns the full network log since tracking started.
   */
  getLog(): NetworkEntry[] {
    return [...this.log];
  }

  /**
   * Returns network entries matching a specific probe element's source URL.
   */
  getEntriesForElement(elementId: string): NetworkEntry[] {
    return this.log.filter((e) => e.elementId === elementId);
  }

  /**
   * Waits for a network request matching the given URL pattern to complete.
   * Event-driven, no polling.
   *
   * @param urlPattern - URL substring or regex to match.
   * @param timeoutMs - Maximum wait time.
   * @returns The matching network entry.
   */
  async waitForRequest(urlPattern: string | RegExp, timeoutMs = 5000): Promise<NetworkEntry> {
    // Check existing log first
    const existing = this.log.find((entry) => {
      if (typeof urlPattern === 'string') return entry.url.includes(urlPattern);
      return urlPattern.test(entry.url);
    });
    if (existing) return existing;

    // Wait for a future matching request
    return new Promise<NetworkEntry>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.requestListeners.findIndex((l) => l.resolve === resolve);
        if (idx !== -1) this.requestListeners.splice(idx, 1);
        reject(new Error(`waitForRequest timed out after ${timeoutMs}ms for pattern: ${urlPattern}`));
      }, timeoutMs);

      this.requestListeners.push({
        pattern: urlPattern,
        resolve: (entry) => {
          clearTimeout(timer);
          resolve(entry);
        },
      });
    });
  }

  /**
   * Clears the network log.
   */
  clear(): void {
    this.log = [];
  }
}
