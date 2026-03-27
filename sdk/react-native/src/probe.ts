/**
 * Main probe class for React Native.
 * Implements the UITestProbe interface from DESIGN.md,
 * adapted for the React Native runtime.
 */

import { ElementRegistry } from './collector/registry';
import { SourceTracker, type NetworkEntry } from './collector/source-tracker';
import { ActionDispatcher, type ActAndWaitResult } from './actions/dispatcher';

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
    // TODO: Apply context to native runtime (resize window, etc.).
    this.platformContext = context;
    throw new Error('RNProbe.setPlatformContext: not yet implemented');
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
    // TODO: Look up device preset, build PlatformContext, apply to runtime.
    throw new Error('RNProbe.setDevice: not yet implemented');
  }

  /** Runs the same test across multiple device presets. */
  async runAcrossDevices(
    devices: string[],
    test: (probe: RNProbe) => Promise<void>,
  ): Promise<Record<string, TestResult>> {
    // TODO: For each device: setDevice, re-scan registry, run test, capture result.
    throw new Error('RNProbe.runAcrossDevices: not yet implemented');
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
  async waitForState(id: string, state: string, timeout?: number): Promise<void> {
    // TODO: Subscribe to state changes, resolve when matched.
    throw new Error('RNProbe.waitForState: not yet implemented');
  }

  /** Waits until the page and all elements are in "loaded" state. */
  async waitForPageReady(timeout?: number): Promise<void> {
    // TODO: Find page element, wait for all elements loaded.
    throw new Error('RNProbe.waitForPageReady: not yet implemented');
  }

  /** Subscribes to state changes on an element. Returns unsubscribe function. */
  onStateChange(id: string, callback: (oldState: string, newState: string) => void): () => void {
    // TODO: Register callback, return cleanup function.
    throw new Error('RNProbe.onStateChange: not yet implemented');
  }

  // ── Source Binding ──

  getSource(id: string): SourceInfo | null {
    const el = this.query(id);
    return el?.source ?? null;
  }

  getNetworkLog(): NetworkEntry[] {
    return this.sourceTracker.getLog();
  }

  async waitForSource(id: string, timeout?: number): Promise<SourceInfo> {
    // TODO: Wait for source status to be populated.
    throw new Error('RNProbe.waitForSource: not yet implemented');
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
