/**
 * Main probe class for React Native.
 * Implements the UITestProbe interface from DESIGN.md,
 * adapted for the React Native runtime.
 */

import { ElementRegistry } from './collector/registry';
import { SourceTracker, type NetworkEntry } from './collector/source-tracker';
import { ActionDispatcher, type ActAndWaitResult } from './actions/dispatcher';

/** Built-in device presets for platform matrix testing. */
const DEVICE_PRESETS: Record<string, DeviceProfile> = {
  'iphone-se': { name: 'iPhone SE', screenSize: { width: 375, height: 667 }, pixelRatio: 2, hasNotch: false, hasSafeArea: false, formFactor: 'phone' },
  'iphone-15-pro': { name: 'iPhone 15 Pro', screenSize: { width: 393, height: 852 }, pixelRatio: 3, hasNotch: true, hasSafeArea: true, formFactor: 'phone' },
  'ipad-air': { name: 'iPad Air', screenSize: { width: 820, height: 1180 }, pixelRatio: 2, hasNotch: false, hasSafeArea: false, formFactor: 'tablet' },
  'pixel-8': { name: 'Pixel 8', screenSize: { width: 412, height: 915 }, pixelRatio: 2.625, hasNotch: false, hasSafeArea: false, formFactor: 'phone' },
  'galaxy-s24': { name: 'Galaxy S24', screenSize: { width: 360, height: 780 }, pixelRatio: 3, hasNotch: false, hasSafeArea: false, formFactor: 'phone' },
};

// ── Type definitions (shared model) ──

export type ProbeType =
  | 'data-container'
  | 'selector'
  | 'action'
  | 'display'
  | 'media'
  | 'form'
  | 'page'
  | 'modal'
  | 'navigation';

export type LinkageEffect =
  | 'options_update'
  | 'data_reload'
  | 'visibility_toggle'
  | 'enabled_toggle'
  | 'value_update'
  | 'reset'
  | 'navigate';

export interface StateInfo {
  current: string;
  previous?: string;
  timestamp: number;
  isOpen?: boolean;
  validationErrors?: Array<{ field: string; message: string }>;
}

export interface SourceInfo {
  url: string;
  method: string;
  status?: number;
  responseTime?: number;
  payload?: unknown;
}

export interface LayoutInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  renderTime?: number;
  scrollTop?: number;
  scrollLeft?: number;
}

export type LinkagePath =
  | { type: 'direct' }
  | { type: 'api'; url: string; method?: string }
  | { type: 'computed'; expression: string }
  | { type: 'store'; storeName: string; action?: string }
  | { type: 'navigation'; route: string }
  | { type: 'chain'; through: string };

export interface ProbeElement {
  id: string;
  type: ProbeType;
  accessibility: { role?: string; label?: string; tabIndex?: number };
  state: StateInfo;
  data: {
    value?: unknown;
    options?: string[];
    rows?: number;
    columns?: Array<{ id: string; label: string; visible: boolean }>;
    sort?: { column: string; direction: 'asc' | 'desc' };
    filter?: Array<{ field: string; operator: string; value: unknown }>;
    selectedRows?: string[];
    currentTime?: number;
    duration?: number;
    readyState?: number;
    paused?: boolean;
    networkState?: number;
  };
  source?: SourceInfo;
  linkage?: {
    targets: Array<{ id: string; effect: LinkageEffect; path: LinkagePath }>;
  };
  layout: LayoutInfo;
  shortcuts?: Array<{ key: string; action: string; platform?: string }>;
  animation?: { playing: boolean; name?: string; duration?: number; progress?: number };
  locale?: { language?: string; direction?: 'ltr' | 'rtl'; isRTL?: boolean };
  theme?: { mode?: 'light' | 'dark' | 'high-contrast'; colorScheme?: string };
  eventBindings?: string[];
  session?: { isDirty?: boolean; hasUnsavedChanges?: boolean };
  parent?: string;
  children?: string[];
}

export interface PlatformContext {
  platform: string;
  device: DeviceProfile;
  viewport: { width: number; height: number };
  inputMode: 'touch' | 'mouse_keyboard' | 'stylus' | 'gamepad';
}

export interface DeviceProfile {
  name: string;
  screenSize: { width: number; height: number };
  pixelRatio: number;
  hasNotch: boolean;
  hasSafeArea: boolean;
  formFactor: 'phone' | 'tablet' | 'desktop' | 'foldable';
}

export interface LinkageResult {
  trigger: string;
  action: string;
  directEffects: Array<{
    target: string;
    effect: string;
    result: 'pass' | 'fail' | 'timeout';
    duration: number;
  }>;
  chainedEffects: Array<{
    target: string;
    effect: string;
    through: string;
    result: 'pass' | 'fail' | 'timeout';
    duration: number;
  }>;
  apiCalls: Array<{
    url: string;
    method: string;
    status: number;
    responseTime: number;
  }>;
}

export interface TestResult {
  passed: boolean;
  error?: string;
  durationMs: number;
}

/**
 * Main probe implementation for React Native.
 * Provides the full UITestProbe interface: element registry, state exposure,
 * event stream, source binding, layout metrics, and action dispatch.
 */
export class RNProbe {
  private readonly registry: ElementRegistry;
  private readonly sourceTracker: SourceTracker;
  private readonly dispatcher: ActionDispatcher;
  private platformContext: PlatformContext | null = null;

  constructor() {
    this.registry = new ElementRegistry();
    this.sourceTracker = new SourceTracker();
    this.dispatcher = new ActionDispatcher(this.registry);
  }

  // ── Element Registry ──

  /** Queries a single probe element by semantic ID. */
  query(id: string): ProbeElement | null {
    return this.registry.query(id);
  }

  /** Returns all probe elements, optionally filtered by type. */
  queryAll(type?: ProbeType): ProbeElement[] {
    return this.registry.queryAll(type);
  }

  /** Returns page-level summary with element list and unready IDs. */
  queryPage(): { id: string; state: string; elements: ProbeElement[]; unreadyElements: string[] } {
    return this.registry.queryPage();
  }

  // ── Hierarchy ──

  queryChildren(id: string): ProbeElement[] {
    return this.registry.queryChildren(id);
  }

  queryDescendants(id: string): ProbeElement[] {
    return this.registry.queryDescendants(id);
  }

  isEffectivelyVisible(id: string): boolean {
    return this.registry.isEffectivelyVisible(id);
  }

  // ── Platform Context ──

  /** Sets the platform context (device profile, viewport, input mode). */
  async setPlatformContext(context: PlatformContext): Promise<void> {
    this.platformContext = context;
  }

  /** Returns the current platform context. */
  getPlatformContext(): PlatformContext {
    if (!this.platformContext) {
      throw new Error('Platform context not set. Call setPlatformContext() or setDevice() first.');
    }
    return this.platformContext;
  }

  /** Configures the device using a built-in preset name. */
  async setDevice(preset: string): Promise<void> {
    const device = DEVICE_PRESETS[preset];
    if (!device) {
      throw new Error(
        `Unknown device preset: ${preset}. Available: ${Object.keys(DEVICE_PRESETS).join(', ')}`,
      );
    }

    const formFactor = device.formFactor;
    const context: PlatformContext = {
      platform: 'react-native',
      device,
      viewport: { width: device.screenSize.width, height: device.screenSize.height },
      inputMode: formFactor === 'phone' || formFactor === 'tablet' ? 'touch' : 'mouse_keyboard',
    };
    await this.setPlatformContext(context);
  }

  /** Runs the same test across multiple device presets. */
  async runAcrossDevices(
    devices: string[],
    test: (probe: RNProbe) => Promise<void>,
  ): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    for (const deviceName of devices) {
      const start = Date.now();
      try {
        await this.setDevice(deviceName);
        await this.registry.scan();
        await test(this);
        results[deviceName] = { passed: true, durationMs: Date.now() - start };
      } catch (err) {
        results[deviceName] = {
          passed: false,
          durationMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    return results;
  }

  // ── State Exposure ──

  getState(id: string): StateInfo | null {
    const el = this.query(id);
    return el?.state ?? null;
  }

  getStates(ids: string[]): Record<string, StateInfo> {
    const result: Record<string, StateInfo> = {};
    for (const id of ids) {
      const state = this.getState(id);
      if (state) result[id] = state;
    }
    return result;
  }

  // ── Event Stream ──

  /** Waits until the element reaches the specified state. */
  async waitForState(id: string, state: string, timeout = 5000): Promise<void> {
    const el = this.query(id);
    if (el && el.state.current === state) return;

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`waitForState('${id}', '${state}') timed out after ${timeout}ms`));
      }, timeout);

      const unsub = this.onStateChange(id, (_old, newState) => {
        if (newState === state) {
          clearTimeout(timer);
          unsub();
          resolve();
        }
      });
    });
  }

  /** Waits until the page and all elements are in "loaded" state. */
  async waitForPageReady(timeout = 10000): Promise<void> {
    const deadline = Date.now() + timeout;

    // Wait for page element if present
    const pageResult = this.queryPage();
    if (pageResult.id !== 'unknown' && pageResult.state !== 'loaded') {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error('waitForPageReady timed out');
      await this.waitForState(pageResult.id, 'loaded', remaining);
    }

    // Wait for all elements to leave loading/submitting
    const poll = async (): Promise<void> => {
      const { unreadyElements } = this.queryPage();
      if (unreadyElements.length === 0) return;

      if (Date.now() >= deadline) {
        throw new Error(
          `waitForPageReady timed out. Still loading: ${unreadyElements.join(', ')}`,
        );
      }

      // Wait a short interval, then re-check
      await new Promise((r) => setTimeout(r, 50));
      return poll();
    };

    return poll();
  }

  /** Subscribes to state changes on an element. Returns unsubscribe function. */
  onStateChange(id: string, callback: (oldState: string, newState: string) => void): () => void {
    return this.dispatcher.onStateChange(id, callback);
  }

  // ── Source Binding ──

  getSource(id: string): SourceInfo | null {
    const el = this.query(id);
    return el?.source ?? null;
  }

  getNetworkLog(): NetworkEntry[] {
    return this.sourceTracker.getLog();
  }

  async waitForSource(id: string, timeout = 10000): Promise<SourceInfo> {
    const existing = this.getSource(id);
    if (existing?.status) return existing;

    const deadline = Date.now() + timeout;
    const poll = async (): Promise<SourceInfo> => {
      const source = this.getSource(id);
      if (source?.status) return source;
      if (Date.now() >= deadline) {
        throw new Error(`waitForSource('${id}') timed out after ${timeout}ms`);
      }
      await new Promise((r) => setTimeout(r, 50));
      return poll();
    };
    return poll();
  }

  // ── Layout Metrics ──

  getLayout(id: string): LayoutInfo | null {
    const el = this.query(id);
    return el?.layout ?? null;
  }

  // ── Action Dispatch ──

  async tap(id: string): Promise<void> {
    return this.dispatcher.tap(id);
  }

  async fill(id: string, value: string): Promise<void> {
    return this.dispatcher.fill(id, value);
  }

  async select(id: string, value: string): Promise<void> {
    return this.dispatcher.select(id, value);
  }

  async actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult> {
    return this.dispatcher.actAndWait(id, action, waitFor);
  }

  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    return this.dispatcher.verifyLinkage(triggerId, action);
  }
}
