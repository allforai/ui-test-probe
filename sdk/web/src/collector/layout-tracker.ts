/**
 * LayoutTracker — provides layout metrics for probe elements using
 * getBoundingClientRect(), IntersectionObserver, and PerformanceObserver.
 *
 * Tracks position, size, visibility, scroll position, and render timing.
 */

import type { ProbeElement } from '../../../../spec/probe-types.js';
import type { ElementRegistry } from './registry.js';

export interface OverlapEntry {
  a: string;
  b: string;
  overlapArea: number;
}

export class LayoutTracker {
  private readonly registry: ElementRegistry;
  private intersectionObserver: IntersectionObserver | null = null;
  private performanceObserver: PerformanceObserver | null = null;
  private readonly visibilityMap: Map<string, boolean> = new Map();
  private readonly renderTimeMap: Map<string, number> = new Map();

  constructor(registry: ElementRegistry) {
    this.registry = registry;
  }

  /**
   * Get current layout metrics for a probe element.
   * Reads getBoundingClientRect() and merges with cached visibility/render data.
   *
   * @param id - Probe element ID.
   * @returns Layout metrics object.
   * @throws if element not found in registry.
   */
  getLayout(id: string): ProbeElement['layout'] {
    const domEl = this.registry.getDOMElement(id);
    if (!domEl) throw new Error(`Element not found: ${id}`);

    const rect = domEl.getBoundingClientRect();
    const htmlEl = domEl as HTMLElement;
    const visible = this.visibilityMap.get(id) ??
      (rect.width > 0 && rect.height > 0 && (htmlEl.offsetParent !== null || htmlEl.getClientRects().length > 0));

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      visible,
      renderTime: this.renderTimeMap.get(id),
      scrollTop: htmlEl.scrollTop,
      scrollLeft: htmlEl.scrollLeft,
    };
  }

  /**
   * Detect all overlapping probe element pairs in the current viewport.
   * Uses bounding rects to compute overlap area in CSS pixels.
   *
   * @returns Array of overlap entries with area > 0.
   */
  getOverlaps(): OverlapEntry[] {
    const elements = this.registry.queryAll();
    const results: OverlapEntry[] = [];

    for (let i = 0; i < elements.length; i++) {
      const aEl = this.registry.getDOMElement(elements[i]!.id);
      if (!aEl) continue;
      const aRect = aEl.getBoundingClientRect();

      for (let j = i + 1; j < elements.length; j++) {
        const bEl = this.registry.getDOMElement(elements[j]!.id);
        if (!bEl) continue;
        const bRect = bEl.getBoundingClientRect();

        const overlapX = Math.max(0, Math.min(aRect.right, bRect.right) - Math.max(aRect.left, bRect.left));
        const overlapY = Math.max(0, Math.min(aRect.bottom, bRect.bottom) - Math.max(aRect.top, bRect.top));
        const overlapArea = overlapX * overlapY;

        if (overlapArea > 0) {
          results.push({ a: elements[i]!.id, b: elements[j]!.id, overlapArea });
        }
      }
    }
    return results;
  }

  /**
   * Get the scroll position of a scrollable probe element.
   *
   * @param id - Probe element ID.
   * @returns { scrollTop, scrollLeft } in pixels.
   */
  getScrollPosition(id: string): { scrollTop: number; scrollLeft: number } {
    const domEl = this.registry.getDOMElement(id);
    if (!domEl) throw new Error(`Element not found: ${id}`);
    const htmlEl = domEl as HTMLElement;
    return { scrollTop: htmlEl.scrollTop, scrollLeft: htmlEl.scrollLeft };
  }

  /**
   * Start IntersectionObserver to track viewport visibility of all
   * registered probe elements. Updates the internal visibility map.
   */
  startVisibilityTracking(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const id = (entry.target as Element).getAttribute('data-probe-id');
        if (id) {
          this.visibilityMap.set(id, entry.isIntersecting);
        }
      }
    }, { threshold: [0, 0.01, 1] });

    // Observe all currently registered elements
    for (const el of this.registry.queryAll()) {
      const domEl = this.registry.getDOMElement(el.id);
      if (domEl) this.intersectionObserver.observe(domEl);
    }
  }

  /**
   * Start PerformanceObserver to track element render timing.
   * Looks for element timing entries matching probe elements.
   */
  startRenderTracking(): void {
    this.performanceObserver?.disconnect();
    try {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // Element timing entries have an `identifier` that matches elementtiming attribute
          const elementEntry = entry as PerformanceEntry & { identifier?: string; renderTime?: number };
          if (elementEntry.identifier) {
            this.renderTimeMap.set(elementEntry.identifier, elementEntry.renderTime ?? entry.startTime);
          }
        }
      });
      this.performanceObserver.observe({ type: 'element', buffered: true });
    } catch {
      // PerformanceObserver for 'element' type not supported in all browsers
    }
  }

  /**
   * Stop all observers.
   */
  disconnect(): void {
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    this.performanceObserver?.disconnect();
    this.performanceObserver = null;
  }
}
