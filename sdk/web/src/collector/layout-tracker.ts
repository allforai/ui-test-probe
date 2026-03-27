/**
 * LayoutTracker — provides layout metrics for probe elements using
 * getBoundingClientRect(), IntersectionObserver, and PerformanceObserver.
 *
 * Tracks position, size, visibility, scroll position, and render timing.
 */

import type { ProbeElement } from '../../../spec/probe-types.js';
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
    // TODO: implement — get DOM element from registry, call getBoundingClientRect(),
    //   merge with intersectionObserver visibility data and cached renderTime
    throw new Error('Not implemented');
  }

  /**
   * Detect all overlapping probe element pairs in the current viewport.
   * Uses bounding rects to compute overlap area in CSS pixels.
   *
   * @returns Array of overlap entries with area > 0.
   */
  getOverlaps(): OverlapEntry[] {
    // TODO: implement — iterate all registered elements, compute pairwise
    //   bounding rect intersection area, filter non-zero
    throw new Error('Not implemented');
  }

  /**
   * Get the scroll position of a scrollable probe element.
   *
   * @param id - Probe element ID.
   * @returns { scrollTop, scrollLeft } in pixels.
   */
  getScrollPosition(id: string): { scrollTop: number; scrollLeft: number } {
    // TODO: implement — get DOM element, read scrollTop/scrollLeft
    throw new Error('Not implemented');
  }

  /**
   * Start IntersectionObserver to track viewport visibility of all
   * registered probe elements. Updates the internal visibility map.
   */
  startVisibilityTracking(): void {
    // TODO: implement — IntersectionObserver on all DOM elements in registry
    throw new Error('Not implemented');
  }

  /**
   * Start PerformanceObserver to track element render timing.
   * Looks for element timing entries matching probe elements.
   */
  startRenderTracking(): void {
    // TODO: implement — PerformanceObserver for 'element' entry type
    throw new Error('Not implemented');
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
