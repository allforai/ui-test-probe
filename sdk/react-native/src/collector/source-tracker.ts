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
  private isActive = false;

  /**
   * Starts intercepting network requests.
   * Patches global.fetch and XMLHttpRequest.prototype.open/send.
   * Safe to call multiple times; only patches once.
   */
  start(): void {
    // TODO: 1. Save reference to original fetch
    //       2. Replace global.fetch with wrapper that:
    //          a. Records start time
    //          b. Calls original fetch
    //          c. On response, records URL, method, status, responseTime
    //          d. Matches URL against registered sources to set elementId
    //          e. Pushes to this.log
    //       3. Similarly patch XMLHttpRequest.prototype.open/send
    //       4. Set this.isActive = true
    throw new Error('SourceTracker.start: not yet implemented');
  }

  /**
   * Stops intercepting network requests and restores originals.
   */
  stop(): void {
    // TODO: Restore original fetch and XHR, set isActive = false.
    throw new Error('SourceTracker.stop: not yet implemented');
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
    // TODO: Subscribe to request completions, resolve when pattern matches.
    throw new Error('SourceTracker.waitForRequest: not yet implemented');
  }

  /**
   * Clears the network log.
   */
  clear(): void {
    this.log = [];
  }
}
