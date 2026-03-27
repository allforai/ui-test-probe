/**
 * WebProbe — main entry point for the Web SDK.
 *
 * Implements the full UITestProbe interface by composing:
 *   - AnnotationParser (reads data-probe-* attributes)
 *   - ElementRegistry (maintains element map)
 *   - StateObserver (watches state attribute changes)
 *   - SourceTracker (intercepts fetch/XHR)
 *   - LayoutTracker (position/visibility/render timing)
 *   - EventStream (central event bus)
 *   - ActionDispatcher (semantic actions with pre-checks)
 *
 * On construction, installs itself as `window.__probe__` for access
 * from Playwright's page.evaluate().
 */

import {
  ProbeType,
  Platform,
  InputMode,
  type UITestProbe,
  type ProbeElement,
  type PlatformContext,
  type ViewportPreset,
  type DeviceProfile,
  type ProbeSnapshot,
  type SnapshotDiff,
  type LinkageResult,
  type NetworkLogEntry,
  type TestResult,
  type ActAndWaitResult,
  type PageQueryResult,
} from '../../../spec/probe-types.js';

import { AnnotationParser } from './annotations/parser.js';
import { ElementRegistry } from './collector/registry.js';
import { StateObserver } from './collector/state-observer.js';
import { SourceTracker } from './collector/source-tracker.js';
import { LayoutTracker } from './collector/layout-tracker.js';
import { EventStream } from './collector/event-stream.js';
import { ActionDispatcher } from './actions/dispatcher.js';

import devices from '../../../spec/devices.json';

export interface WebProbeConfig {
  /** Automatically scan the DOM on construction. Defaults to true. */
  autoScan?: boolean;
  /** Install fetch/XHR interceptors on construction. Defaults to true. */
  interceptNetwork?: boolean;
  /** Expose as window.__probe__. Defaults to true. */
  exposeGlobal?: boolean;
  /** Maximum events in the event stream history. Defaults to 1000. */
  maxEventHistory?: number;
}

// Extend Window to declare __probe__
declare global {
  interface Window {
    __probe__?: WebProbe;
  }
}

export class WebProbe implements UITestProbe {
  readonly parser: AnnotationParser;
  readonly registry: ElementRegistry;
  readonly stateObserver: StateObserver;
  readonly sourceTracker: SourceTracker;
  readonly layoutTracker: LayoutTracker;
  readonly eventStream: EventStream;
  readonly dispatcher: ActionDispatcher;

  private platformContext: PlatformContext | null = null;

  constructor(config: WebProbeConfig = {}) {
    const {
      autoScan = true,
      interceptNetwork = true,
      exposeGlobal = true,
      maxEventHistory = 1000,
    } = config;

    this.eventStream = new EventStream(maxEventHistory);
    this.parser = new AnnotationParser();
    this.registry = new ElementRegistry(this.parser);
    this.stateObserver = new StateObserver(this.registry, this.eventStream);
    this.sourceTracker = new SourceTracker(this.registry, this.eventStream);
    this.layoutTracker = new LayoutTracker(this.registry);
    this.dispatcher = new ActionDispatcher(this.registry, this.eventStream);
    this.dispatcher.setStateObserver(this.stateObserver);

    if (autoScan && typeof document !== 'undefined') {
      this.registry.scan();
      this.registry.startObserving();
      this.stateObserver.observe();
      this.layoutTracker.startVisibilityTracking();
    }

    if (interceptNetwork) {
      this.sourceTracker.install();
    }

    if (exposeGlobal && typeof window !== 'undefined') {
      window.__probe__ = this;
    }
  }

  // =========================================================================
  // Primitive 1: Element Registry
  // =========================================================================

  query(id: string): ProbeElement | null {
    return this.registry.query(id);
  }

  queryAll(type?: ProbeType): ProbeElement[] {
    return this.registry.queryAll(type);
  }

  queryPage(): PageQueryResult {
    const pages = this.registry.queryAll(ProbeType.PAGE);
    const page = pages[0];
    const allElements = this.registry.queryAll();
    const unreadyElements = allElements
      .filter(el => el.state.current === 'loading' || el.state.current === 'submitting')
      .map(el => el.id);

    return {
      id: page?.id ?? 'unknown',
      state: page?.state.current ?? (unreadyElements.length === 0 ? 'loaded' : 'loading'),
      elements: allElements,
      unreadyElements,
    };
  }

  // =========================================================================
  // Primitive 1.5: Platform Context
  // =========================================================================

  async setPlatformContext(context: PlatformContext): Promise<void> {
    this.platformContext = context;
    if (typeof window !== 'undefined' && context.viewport) {
      // In a real browser context, resizing is handled by the test framework (Playwright)
      // This stores the context for query purposes
    }
  }

  getPlatformContext(): PlatformContext {
    if (this.platformContext) return this.platformContext;

    // Auto-detect from browser environment
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    let platform = Platform.WEB_CHROME;
    if (ua.includes('Firefox')) platform = Platform.WEB_FIREFOX;
    else if (ua.includes('Safari') && !ua.includes('Chrome')) platform = Platform.WEB_SAFARI;

    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const pixelRatio = typeof window !== 'undefined' ? window.devicePixelRatio : 1;

    return {
      platform,
      device: {
        name: 'current-browser',
        screenSize: { width, height },
        pixelRatio,
        hasNotch: false,
        hasSafeArea: false,
        formFactor: width < 768 ? 'phone' : width < 1024 ? 'tablet' : 'desktop',
      },
      viewport: { width, height },
      inputMode: InputMode.MOUSE_KEYBOARD,
    };
  }

  async setDevice(preset: ViewportPreset | string): Promise<void> {
    const deviceMap = (devices as { devices: Record<string, DeviceProfile> }).devices;
    const device = deviceMap[preset];
    if (!device) {
      throw new Error(`Unknown device preset: ${preset}. Available: ${Object.keys(deviceMap).join(', ')}`);
    }

    const formFactor = device.formFactor;
    const context: PlatformContext = {
      platform: Platform.WEB_CHROME,
      device,
      viewport: { width: device.screenSize.width, height: device.screenSize.height },
      inputMode: formFactor === 'phone' || formFactor === 'tablet' ? InputMode.TOUCH : InputMode.MOUSE_KEYBOARD,
    };
    await this.setPlatformContext(context);
  }

  async runAcrossDevices(
    deviceList: Array<ViewportPreset | string>,
    test: (probe: UITestProbe) => Promise<void>,
  ): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    for (const deviceName of deviceList) {
      const start = Date.now();
      try {
        await this.setDevice(deviceName);
        await test(this);
        results[deviceName] = { device: deviceName, passed: true, duration: Date.now() - start };
      } catch (err) {
        results[deviceName] = {
          device: deviceName,
          passed: false,
          duration: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    return results;
  }

  // =========================================================================
  // Primitive 1.6: Hierarchy
  // =========================================================================

  queryChildren(id: string): ProbeElement[] {
    const el = this.registry.query(id);
    if (!el?.children) return [];
    return el.children
      .map(childId => this.registry.query(childId))
      .filter((e): e is ProbeElement => e !== null);
  }

  queryDescendants(id: string): ProbeElement[] {
    const result: ProbeElement[] = [];
    const collect = (parentId: string) => {
      const children = this.queryChildren(parentId);
      for (const child of children) {
        result.push(child);
        collect(child.id);
      }
    };
    collect(id);
    return result;
  }

  queryParent(id: string): ProbeElement | null {
    const el = this.registry.query(id);
    if (!el?.parent) return null;
    return this.registry.query(el.parent);
  }

  getAncestorChain(id: string): ProbeElement[] {
    const chain: ProbeElement[] = [];
    let current = this.registry.query(id);
    while (current) {
      chain.unshift(current);
      current = current.parent ? this.registry.query(current.parent) : null;
    }
    return chain;
  }

  isEffectivelyVisible(id: string): boolean {
    const chain = this.getAncestorChain(id);
    return chain.every(el => el.layout.visible);
  }

  // =========================================================================
  // Primitive 2: State Exposure
  // =========================================================================

  getState(id: string): ProbeElement['state'] {
    const el = this.registry.query(id);
    if (!el) throw new Error(`Element not found: ${id}`);
    return el.state;
  }

  getStates(ids: string[]): Record<string, ProbeElement['state']> {
    const result: Record<string, ProbeElement['state']> = {};
    for (const id of ids) {
      const el = this.registry.query(id);
      if (el) result[id] = el.state;
    }
    return result;
  }

  // =========================================================================
  // Primitive 3: Event Stream
  // =========================================================================

  async waitForState(id: string, state: string, timeout?: number): Promise<void> {
    return this.stateObserver.waitForState(id, state, timeout);
  }

  async waitForPageReady(timeout: number = 30000): Promise<void> {
    const deadline = Date.now() + timeout;

    // First, wait for any PAGE element to reach 'loaded'
    const pages = this.registry.queryAll(ProbeType.PAGE);
    if (pages.length > 0) {
      const page = pages[0]!;
      if (page.state.current !== 'loaded') {
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error('waitForPageReady timed out');
        await this.stateObserver.waitForState(page.id, 'loaded', remaining);
      }
      return;
    }

    // No PAGE element — wait for all elements to leave loading/submitting state
    const poll = (): Promise<void> => {
      const unready = this.registry.queryAll().filter(
        el => el.state.current === 'loading' || el.state.current === 'submitting'
      );
      if (unready.length === 0) return Promise.resolve();

      if (Date.now() >= deadline) {
        throw new Error(`waitForPageReady timed out. Still loading: ${unready.map(e => e.id).join(', ')}`);
      }

      // Wait for any state change, then re-check
      return new Promise((resolve, reject) => {
        const remaining = deadline - Date.now();
        const timer = setTimeout(() => {
          unsub();
          reject(new Error(`waitForPageReady timed out. Still loading: ${unready.map(e => e.id).join(', ')}`));
        }, remaining);

        const unsub = this.eventStream.on('state-change', () => {
          clearTimeout(timer);
          unsub();
          resolve(poll());
        });
      });
    };

    return poll();
  }

  onStateChange(
    id: string,
    callback: (oldState: string, newState: string) => void,
  ): () => void {
    return this.stateObserver.onStateChange(id, callback);
  }

  onEvent(id: string, event: string, callback: (detail: unknown) => void): () => void {
    return this.eventStream.on(`${event}:${id}`, (e) => callback(e.detail));
  }

  // =========================================================================
  // Primitive 4: Source Binding
  // =========================================================================

  getSource(id: string): ProbeElement['source'] | null {
    return this.sourceTracker.getSource(id);
  }

  getNetworkLog(): NetworkLogEntry[] {
    return this.sourceTracker.getNetworkLog();
  }

  async waitForSource(id: string, timeout?: number): Promise<NonNullable<ProbeElement['source']>> {
    return this.sourceTracker.waitForSource(id, timeout);
  }

  // =========================================================================
  // Primitive 5: Layout Metrics
  // =========================================================================

  getLayout(id: string): ProbeElement['layout'] {
    return this.layoutTracker.getLayout(id);
  }

  getOverlaps(): Array<{ a: string; b: string; overlapArea: number }> {
    return this.layoutTracker.getOverlaps();
  }

  getScrollPosition(id: string): { scrollTop: number; scrollLeft: number } {
    return this.layoutTracker.getScrollPosition(id);
  }

  // =========================================================================
  // Primitive 6: Action Dispatch
  // =========================================================================

  async click(id: string): Promise<void> { return this.dispatcher.click(id); }
  async doubleClick(id: string): Promise<void> { return this.dispatcher.doubleClick(id); }
  async rightClick(id: string): Promise<void> { return this.dispatcher.rightClick(id); }
  async hover(id: string): Promise<void> { return this.dispatcher.hover(id); }
  async focus(id: string): Promise<void> { return this.dispatcher.focus(id); }
  async type(id: string, text: string): Promise<void> { return this.dispatcher.type(id, text); }
  async fill(id: string, value: string): Promise<void> { return this.dispatcher.fill(id, value); }
  async clear(id: string): Promise<void> { return this.dispatcher.clear(id); }
  async select(id: string, value: string): Promise<void> { return this.dispatcher.select(id, value); }
  async check(id: string, checked: boolean): Promise<void> { return this.dispatcher.check(id, checked); }

  async scrollTo(id: string, position: { top?: number; left?: number }): Promise<void> {
    return this.dispatcher.scrollTo(id, position);
  }
  async scrollToBottom(id: string): Promise<void> { return this.dispatcher.scrollToBottom(id); }
  async scrollIntoView(id: string): Promise<void> { return this.dispatcher.scrollIntoView(id); }
  async drag(sourceId: string, targetId: string): Promise<void> { return this.dispatcher.drag(sourceId, targetId); }
  async pressShortcut(key: string): Promise<void> { return this.dispatcher.pressShortcut(key); }
  async navigate(route: string): Promise<void> { return this.dispatcher.navigate(route); }

  // =========================================================================
  // Composite operations
  // =========================================================================

  snapshot(): ProbeSnapshot {
    const elements: Record<string, ProbeElement> = {};
    for (const el of this.registry.queryAll()) {
      elements[el.id] = structuredClone ? structuredClone(el) : JSON.parse(JSON.stringify(el));
    }
    return {
      timestamp: Date.now(),
      elements,
      platformContext: this.getPlatformContext(),
    };
  }

  diff(a: ProbeSnapshot, b: ProbeSnapshot): SnapshotDiff[] {
    const diffs: SnapshotDiff[] = [];
    const allIds = new Set([...Object.keys(a.elements), ...Object.keys(b.elements)]);

    for (const id of allIds) {
      const elA = a.elements[id];
      const elB = b.elements[id];

      if (!elA) {
        diffs.push({ elementId: id, field: '_existence', before: undefined, after: 'added' });
        continue;
      }
      if (!elB) {
        diffs.push({ elementId: id, field: '_existence', before: 'present', after: undefined });
        continue;
      }

      // Compare key fields
      const fields: (keyof ProbeElement)[] = ['state', 'data', 'source', 'layout', 'linkage'];
      for (const field of fields) {
        const valA = JSON.stringify(elA[field]);
        const valB = JSON.stringify(elB[field]);
        if (valA !== valB) {
          diffs.push({ elementId: id, field, before: elA[field], after: elB[field] });
        }
      }
    }
    return diffs;
  }

  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    return this.dispatcher.verifyLinkage(triggerId, action);
  }

  async actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult> {
    return this.dispatcher.actAndWait(id, action, waitFor);
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  /**
   * Tear down all observers, interceptors, and listeners.
   */
  destroy(): void {
    this.stateObserver.disconnect();
    this.sourceTracker.uninstall();
    this.layoutTracker.disconnect();
    this.registry.stopObserving();
    this.registry.clear();
    this.eventStream.clear();
    if (typeof window !== 'undefined' && window.__probe__ === this) {
      delete window.__probe__;
    }
  }
}
