/**
 * UI Test Probe — Authoritative TypeScript Type Definitions
 *
 * This file is the single source of truth for all probe types.
 * All platform SDKs and integrations import from here.
 */

// ---------------------------------------------------------------------------
// ProbeType — 9 widget categories
// ---------------------------------------------------------------------------

export enum ProbeType {
  DATA_CONTAINER = 'data-container',
  SELECTOR = 'selector',
  ACTION = 'action',
  DISPLAY = 'display',
  MEDIA = 'media',
  FORM = 'form',
  PAGE = 'page',
  MODAL = 'modal',
  NAVIGATION = 'navigation',
}

// ---------------------------------------------------------------------------
// Linkage
// ---------------------------------------------------------------------------

export enum LinkageEffect {
  OPTIONS_UPDATE = 'options_update',
  DATA_RELOAD = 'data_reload',
  VISIBILITY_TOGGLE = 'visibility_toggle',
  ENABLED_TOGGLE = 'enabled_toggle',
  VALUE_UPDATE = 'value_update',
  RESET = 'reset',
  NAVIGATE = 'navigate',
}

export type LinkagePath =
  | { type: 'direct' }
  | { type: 'api'; url: string; method?: string }
  | { type: 'computed'; expression: string }
  | { type: 'store'; storeName: string; action?: string }
  | { type: 'navigation'; route: string }
  | { type: 'chain'; through: string };

export interface LinkageTarget {
  id: string;
  effect: LinkageEffect;
  path: LinkagePath;
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

// ---------------------------------------------------------------------------
// ProbeElement — 15 attributes
// ---------------------------------------------------------------------------

export interface ProbeElement {
  /** Semantic identifier, e.g. "order-list". */
  id: string;

  /** Widget type — determines data field shape. */
  type: ProbeType;

  /** Accessibility metadata. */
  accessibility?: {
    role?: string;
    label?: string;
    tabIndex?: number;
  };

  /** Real-time element state. */
  state: {
    current: string;
    previous?: string;
    timestamp: number;
    isOpen?: boolean;
    validationErrors?: Array<{ field: string; message: string }>;
  };

  /**
   * Data payload — structure varies by type.
   * data-container: sort, filter, selectedRows
   * media: currentTime, duration, readyState, paused, networkState
   */
  data?: {
    value?: unknown;
    options?: string[];
    rows?: number;
    columns?: Array<{ id: string; label: string; visible: boolean }>;

    // data-container extensions
    sort?: { column: string; direction: 'asc' | 'desc' };
    filter?: Array<{ field: string; operator: string; value: unknown }>;
    selectedRows?: string[];

    // media extensions
    currentTime?: number;
    duration?: number;
    readyState?: number;
    paused?: boolean;
    networkState?: number;
  };

  /** Data source binding (API url, status, timing). */
  source?: {
    url: string;
    method: string;
    status?: number;
    responseTime?: number;
    payload?: unknown;
  };

  /** Inter-element linkage declarations. */
  linkage?: {
    targets: LinkageTarget[];
  };

  /** Layout metrics from the rendering engine. */
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    renderTime?: number;
    scrollTop?: number;
    scrollLeft?: number;
  };

  /** Keyboard shortcuts bound to this element. */
  shortcuts?: Array<{
    key: string;
    action: string;
    platform?: string;
  }>;

  /** Animation state. */
  animation?: {
    playing: boolean;
    name?: string;
    duration?: number;
    progress?: number;
  };

  /** Locale / directionality. */
  locale?: {
    language?: string;
    direction?: 'ltr' | 'rtl';
    isRTL?: boolean;
  };

  /** Theme context. */
  theme?: {
    mode?: 'light' | 'dark' | 'high-contrast';
    colorScheme?: string;
  };

  /** DOM event types bound to this element. */
  eventBindings?: string[];

  /** Session/form dirty state. */
  session?: {
    isDirty?: boolean;
    hasUnsavedChanges?: boolean;
  };

  /** Parent element probe ID. */
  parent?: string;

  /** Child element probe IDs. */
  children?: string[];
}

// ---------------------------------------------------------------------------
// Platform Context
// ---------------------------------------------------------------------------

export enum Platform {
  WEB_CHROME = 'web-chrome',
  WEB_SAFARI = 'web-safari',
  WEB_FIREFOX = 'web-firefox',
  IOS = 'ios',
  ANDROID = 'android',
  MACOS = 'macos',
  WINDOWS = 'windows',
  LINUX = 'linux',
}

export type FormFactor = 'phone' | 'tablet' | 'desktop' | 'foldable';

export interface DeviceProfile {
  name: string;
  screenSize: { width: number; height: number };
  pixelRatio: number;
  hasNotch: boolean;
  hasSafeArea: boolean;
  formFactor: FormFactor;
}

export enum InputMode {
  TOUCH = 'touch',
  MOUSE_KEYBOARD = 'mouse_keyboard',
  STYLUS = 'stylus',
  GAMEPAD = 'gamepad',
}

export interface PlatformContext {
  platform: Platform;
  device: DeviceProfile;
  viewport: { width: number; height: number };
  inputMode: InputMode;
}

/** Named device preset key (e.g. "iphone-15-pro"). */
export type ViewportPreset =
  | 'iphone-se'
  | 'iphone-15-pro'
  | 'ipad-air'
  | 'ipad-pro-12'
  | 'pixel-8'
  | 'galaxy-s24'
  | 'galaxy-tab-s9'
  | 'galaxy-fold'
  | 'macbook-air-13'
  | 'desktop-1080p'
  | 'desktop-1440p';

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

export interface ProbeSnapshot {
  timestamp: number;
  elements: Record<string, ProbeElement>;
  platformContext: PlatformContext;
}

export interface SnapshotDiff {
  elementId: string;
  field: string;
  before: unknown;
  after: unknown;
}

// ---------------------------------------------------------------------------
// Network log entry
// ---------------------------------------------------------------------------

export interface NetworkLogEntry {
  url: string;
  method: string;
  status: number;
  elementId?: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Test result (for runAcrossDevices)
// ---------------------------------------------------------------------------

export interface TestResult {
  device: string;
  passed: boolean;
  duration: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Action pre-check error
// ---------------------------------------------------------------------------

export interface ProbeActionError {
  error: 'NOT_FOUND' | 'NOT_VISIBLE' | 'DISABLED' | 'BUSY' | 'OPTION_NOT_FOUND';
  id: string;
  reason?: string;
  available?: string[];
}

// ---------------------------------------------------------------------------
// actAndWait result
// ---------------------------------------------------------------------------

export interface ActAndWaitResult {
  actionDuration: number;
  waitDuration: number;
  targetState: ProbeElement['state'];
  linkageResults?: LinkageResult;
}

// ---------------------------------------------------------------------------
// Page query result
// ---------------------------------------------------------------------------

export interface PageQueryResult {
  id: string;
  state: string;
  elements: ProbeElement[];
  unreadyElements: string[];
}

// ---------------------------------------------------------------------------
// UITestProbe — full interface (all 6 primitives + hierarchy + platform)
// ---------------------------------------------------------------------------

export interface UITestProbe {
  // --- Primitive 1: Element Registry ---
  query(id: string): ProbeElement | null;
  queryAll(type?: ProbeType): ProbeElement[];
  queryPage(): PageQueryResult;

  // --- Primitive 1.5: Platform Context ---
  setPlatformContext(context: PlatformContext): Promise<void>;
  getPlatformContext(): PlatformContext;
  setDevice(preset: ViewportPreset | string): Promise<void>;
  runAcrossDevices(
    devices: Array<ViewportPreset | string>,
    test: (probe: UITestProbe) => Promise<void>,
  ): Promise<Record<string, TestResult>>;

  // --- Primitive 1.6: Hierarchy ---
  queryChildren(id: string): ProbeElement[];
  queryDescendants(id: string): ProbeElement[];
  queryParent(id: string): ProbeElement | null;
  getAncestorChain(id: string): ProbeElement[];
  isEffectivelyVisible(id: string): boolean;

  // --- Primitive 2: State Exposure ---
  getState(id: string): ProbeElement['state'];
  getStates(ids: string[]): Record<string, ProbeElement['state']>;

  // --- Primitive 3: Event Stream ---
  waitForState(id: string, state: string, timeout?: number): Promise<void>;
  waitForPageReady(timeout?: number): Promise<void>;
  onStateChange(id: string, callback: (oldState: string, newState: string) => void): () => void;
  onEvent(id: string, event: string, callback: (detail: unknown) => void): () => void;

  // --- Primitive 4: Source Binding ---
  getSource(id: string): ProbeElement['source'] | null;
  getNetworkLog(): NetworkLogEntry[];
  waitForSource(id: string, timeout?: number): Promise<ProbeElement['source']>;

  // --- Primitive 5: Layout Metrics ---
  getLayout(id: string): ProbeElement['layout'];
  getOverlaps(): Array<{ a: string; b: string; overlapArea: number }>;
  getScrollPosition(id: string): { scrollTop: number; scrollLeft: number };

  // --- Primitive 6: Action Dispatch ---

  // Basic interactions
  click(id: string): Promise<void>;
  doubleClick(id: string): Promise<void>;
  rightClick(id: string): Promise<void>;
  hover(id: string): Promise<void>;
  focus(id: string): Promise<void>;

  // Input
  type(id: string, text: string): Promise<void>;
  fill(id: string, value: string): Promise<void>;
  clear(id: string): Promise<void>;

  // Selection
  select(id: string, value: string): Promise<void>;
  check(id: string, checked: boolean): Promise<void>;

  // Scroll
  scrollTo(id: string, position: { top?: number; left?: number }): Promise<void>;
  scrollToBottom(id: string): Promise<void>;
  scrollIntoView(id: string): Promise<void>;

  // Drag & drop
  drag(sourceId: string, targetId: string): Promise<void>;

  // Keyboard
  pressShortcut(key: string): Promise<void>;

  // Navigation
  navigate(route: string): Promise<void>;

  // Composite
  snapshot(): ProbeSnapshot;
  diff(a: ProbeSnapshot, b: ProbeSnapshot): SnapshotDiff[];
  verifyLinkage(triggerId: string, action: string): Promise<LinkageResult>;
  actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult>;
}
