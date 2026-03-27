/**
 * ProbePage — extends a Playwright Page with typed probe API methods.
 *
 * Wraps page.evaluate() calls to window.__probe__ into properly-typed
 * async methods that mirror the UITestProbe interface.
 *
 * @example
 * ```ts
 * const probe = new ProbePage(page);
 * await probe.waitForPageReady();
 * const el = await probe.query('order-list');
 * expect(el?.data?.rows).toBeGreaterThan(0);
 * await probe.select('status-filter', 'completed');
 * const result = await probe.actAndWait('status-filter', 'select:completed', {
 *   target: 'order-table', state: 'loaded'
 * });
 * ```
 */

import type { Page } from '@playwright/test';
import type {
  ProbeElement,
  ProbeType,
  PlatformContext,
  ViewportPreset,
  ProbeSnapshot,
  SnapshotDiff,
  LinkageResult,
  NetworkLogEntry,
  TestResult,
  ActAndWaitResult,
  PageQueryResult,
} from '../../../spec/probe-types.js';

export class ProbePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // =========================================================================
  // Primitive 1: Element Registry
  // =========================================================================

  /** Query a single element by probe ID. */
  async query(id: string): Promise<ProbeElement | null> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.query(probeId) ?? null,
      id,
    ) as Promise<ProbeElement | null>;
  }

  /** Query all elements, optionally filtered by type. */
  async queryAll(type?: ProbeType): Promise<ProbeElement[]> {
    return this.page.evaluate(
      (t) => window.__probe__?.queryAll(t) ?? [],
      type,
    ) as Promise<ProbeElement[]>;
  }

  /** Get page-level summary including unready elements. */
  async queryPage(): Promise<PageQueryResult> {
    return this.page.evaluate(
      () => window.__probe__?.queryPage(),
    ) as Promise<PageQueryResult>;
  }

  // =========================================================================
  // Primitive 1.5: Platform Context
  // =========================================================================

  /** Set platform context (device, viewport, input mode). */
  async setPlatformContext(context: PlatformContext): Promise<void> {
    await this.page.evaluate(
      (ctx) => window.__probe__?.setPlatformContext(ctx),
      context,
    );
  }

  /** Get current platform context. */
  async getPlatformContext(): Promise<PlatformContext> {
    return this.page.evaluate(
      () => window.__probe__?.getPlatformContext(),
    ) as Promise<PlatformContext>;
  }

  /** Set device by preset name (e.g. "iphone-15-pro"). */
  async setDevice(preset: ViewportPreset | string): Promise<void> {
    await this.page.evaluate(
      (p) => window.__probe__?.setDevice(p),
      preset,
    );
  }

  // =========================================================================
  // Primitive 1.6: Hierarchy
  // =========================================================================

  /** Get direct children of an element. */
  async queryChildren(id: string): Promise<ProbeElement[]> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.queryChildren(probeId) ?? [],
      id,
    ) as Promise<ProbeElement[]>;
  }

  /** Get all descendants of an element. */
  async queryDescendants(id: string): Promise<ProbeElement[]> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.queryDescendants(probeId) ?? [],
      id,
    ) as Promise<ProbeElement[]>;
  }

  /** Get the parent element. */
  async queryParent(id: string): Promise<ProbeElement | null> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.queryParent(probeId) ?? null,
      id,
    ) as Promise<ProbeElement | null>;
  }

  /** Get ancestor chain from root to element. */
  async getAncestorChain(id: string): Promise<ProbeElement[]> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.getAncestorChain(probeId) ?? [],
      id,
    ) as Promise<ProbeElement[]>;
  }

  /** Check if element is truly visible (all ancestors visible too). */
  async isEffectivelyVisible(id: string): Promise<boolean> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.isEffectivelyVisible(probeId) ?? false,
      id,
    ) as Promise<boolean>;
  }

  // =========================================================================
  // Primitive 2: State Exposure
  // =========================================================================

  /** Get the current state of an element. */
  async getState(id: string): Promise<ProbeElement['state']> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.getState(probeId),
      id,
    ) as Promise<ProbeElement['state']>;
  }

  /** Get states of multiple elements at once. */
  async getStates(ids: string[]): Promise<Record<string, ProbeElement['state']>> {
    return this.page.evaluate(
      (probeIds) => window.__probe__?.getStates(probeIds) ?? {},
      ids,
    ) as Promise<Record<string, ProbeElement['state']>>;
  }

  // =========================================================================
  // Primitive 3: Event Stream
  // =========================================================================

  /** Wait until an element reaches a specific state. */
  async waitForState(id: string, state: string, timeout?: number): Promise<void> {
    await this.page.evaluate(
      ({ probeId, s, t }) => window.__probe__?.waitForState(probeId, s, t),
      { probeId: id, s: state, t: timeout },
    );
  }

  /** Wait until all page elements are ready. */
  async waitForPageReady(timeout?: number): Promise<void> {
    await this.page.evaluate(
      (t) => window.__probe__?.waitForPageReady(t),
      timeout,
    );
  }

  // =========================================================================
  // Primitive 4: Source Binding
  // =========================================================================

  /** Get the data source binding for an element. */
  async getSource(id: string): Promise<ProbeElement['source'] | null> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.getSource(probeId) ?? null,
      id,
    ) as Promise<ProbeElement['source'] | null>;
  }

  /** Get the full network log. */
  async getNetworkLog(): Promise<NetworkLogEntry[]> {
    return this.page.evaluate(
      () => window.__probe__?.getNetworkLog() ?? [],
    ) as Promise<NetworkLogEntry[]>;
  }

  /** Wait for an element's source to be populated. */
  async waitForSource(id: string, timeout?: number): Promise<NonNullable<ProbeElement['source']>> {
    return this.page.evaluate(
      ({ probeId, t }) => window.__probe__?.waitForSource(probeId, t),
      { probeId: id, t: timeout },
    ) as Promise<NonNullable<ProbeElement['source']>>;
  }

  // =========================================================================
  // Primitive 5: Layout Metrics
  // =========================================================================

  /** Get layout metrics for an element. */
  async getLayout(id: string): Promise<ProbeElement['layout']> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.getLayout(probeId),
      id,
    ) as Promise<ProbeElement['layout']>;
  }

  /** Find all overlapping element pairs. */
  async getOverlaps(): Promise<Array<{ a: string; b: string; overlapArea: number }>> {
    return this.page.evaluate(
      () => window.__probe__?.getOverlaps() ?? [],
    ) as Promise<Array<{ a: string; b: string; overlapArea: number }>>;
  }

  /** Get scroll position of an element. */
  async getScrollPosition(id: string): Promise<{ scrollTop: number; scrollLeft: number }> {
    return this.page.evaluate(
      (probeId) => window.__probe__?.getScrollPosition(probeId) ?? { scrollTop: 0, scrollLeft: 0 },
      id,
    ) as Promise<{ scrollTop: number; scrollLeft: number }>;
  }

  // =========================================================================
  // Primitive 6: Action Dispatch
  // =========================================================================

  async click(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.click(i), id);
  }

  async doubleClick(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.doubleClick(i), id);
  }

  async rightClick(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.rightClick(i), id);
  }

  async hover(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.hover(i), id);
  }

  async focus(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.focus(i), id);
  }

  async type(id: string, text: string): Promise<void> {
    await this.page.evaluate(({ i, t }) => window.__probe__?.type(i, t), { i: id, t: text });
  }

  async fill(id: string, value: string): Promise<void> {
    await this.page.evaluate(({ i, v }) => window.__probe__?.fill(i, v), { i: id, v: value });
  }

  async clear(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.clear(i), id);
  }

  async select(id: string, value: string): Promise<void> {
    await this.page.evaluate(({ i, v }) => window.__probe__?.select(i, v), { i: id, v: value });
  }

  async check(id: string, checked: boolean): Promise<void> {
    await this.page.evaluate(({ i, c }) => window.__probe__?.check(i, c), { i: id, c: checked });
  }

  async scrollTo(id: string, position: { top?: number; left?: number }): Promise<void> {
    await this.page.evaluate(({ i, p }) => window.__probe__?.scrollTo(i, p), { i: id, p: position });
  }

  async scrollToBottom(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.scrollToBottom(i), id);
  }

  async scrollIntoView(id: string): Promise<void> {
    await this.page.evaluate((i) => window.__probe__?.scrollIntoView(i), id);
  }

  async drag(sourceId: string, targetId: string): Promise<void> {
    await this.page.evaluate(({ s, t }) => window.__probe__?.drag(s, t), { s: sourceId, t: targetId });
  }

  async pressShortcut(key: string): Promise<void> {
    await this.page.evaluate((k) => window.__probe__?.pressShortcut(k), key);
  }

  async navigate(route: string): Promise<void> {
    await this.page.evaluate((r) => window.__probe__?.navigate(r), route);
  }

  // =========================================================================
  // Composite
  // =========================================================================

  /** Take a snapshot of all probe elements. */
  async snapshot(): Promise<ProbeSnapshot> {
    return this.page.evaluate(
      () => window.__probe__?.snapshot(),
    ) as Promise<ProbeSnapshot>;
  }

  /** Diff two snapshots. */
  async diff(a: ProbeSnapshot, b: ProbeSnapshot): Promise<SnapshotDiff[]> {
    return this.page.evaluate(
      ({ sa, sb }) => window.__probe__?.diff(sa, sb) ?? [],
      { sa: a, sb: b },
    ) as Promise<SnapshotDiff[]>;
  }

  /** Verify all linkage targets after an action. */
  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    return this.page.evaluate(
      ({ t, a }) => window.__probe__?.verifyLinkage(t, a),
      { t: triggerId, a: action },
    ) as Promise<LinkageResult>;
  }

  /** Action + wait + linkage verification in one call. */
  async actAndWait(
    id: string,
    action: string,
    waitFor: { target?: string; state?: string; timeout?: number },
  ): Promise<ActAndWaitResult> {
    return this.page.evaluate(
      ({ i, a, w }) => window.__probe__?.actAndWait(i, a, w),
      { i: id, a: action, w: waitFor },
    ) as Promise<ActAndWaitResult>;
  }
}

// Augment Window type for page.evaluate() calls
declare global {
  interface Window {
    __probe__?: import('../../../spec/probe-types.js').UITestProbe & {
      _injected?: boolean;
      _config?: Record<string, unknown>;
    };
  }
}
