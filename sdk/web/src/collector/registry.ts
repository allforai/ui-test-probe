/**
 * ElementRegistry — scans DOM for data-probe-* annotated elements and maintains
 * a live registry of ProbeElement instances keyed by probe ID.
 *
 * The registry is the backbone of the Web SDK. It connects the AnnotationParser
 * (which reads HTML attributes) with the runtime collectors (state, source, layout).
 */

import type { ProbeElement, ProbeType } from '../../../spec/probe-types.js';
import { AnnotationParser } from '../annotations/parser.js';

export class ElementRegistry {
  private readonly elements: Map<string, ProbeElement> = new Map();
  private readonly domMap: Map<string, Element> = new Map();
  private readonly parser: AnnotationParser;
  private observer: MutationObserver | null = null;

  constructor(parser?: AnnotationParser) {
    this.parser = parser ?? new AnnotationParser();
  }

  /**
   * Scan the entire document (or a subtree) for data-probe-id elements
   * and register them in the internal map.
   *
   * @param root - The root element to scan. Defaults to document.body.
   * @returns Number of elements registered.
   */
  scan(root: Element = document.body): number {
    // TODO: implement — querySelectorAll('[data-probe-id]'), parse each, register
    throw new Error('Not implemented');
  }

  /**
   * Register a single element by its DOM node. Parses annotations and adds
   * to the registry. If an element with the same ID exists, it is replaced.
   *
   * @param element - The DOM element with data-probe-id.
   * @returns The registered ProbeElement, or null if no data-probe-id.
   */
  register(element: Element): ProbeElement | null {
    // TODO: implement — parse, merge with layout/state, store in maps
    throw new Error('Not implemented');
  }

  /**
   * Remove an element from the registry by probe ID.
   *
   * @param id - The probe ID to unregister.
   * @returns true if the element was found and removed.
   */
  unregister(id: string): boolean {
    const existed = this.elements.has(id);
    this.elements.delete(id);
    this.domMap.delete(id);
    return existed;
  }

  /**
   * Query a single element by probe ID.
   *
   * @param id - The probe ID.
   * @returns The ProbeElement, or null if not found.
   */
  query(id: string): ProbeElement | null {
    return this.elements.get(id) ?? null;
  }

  /**
   * Query all registered elements, optionally filtered by ProbeType.
   *
   * @param type - Optional type filter.
   * @returns Array of matching ProbeElement instances.
   */
  queryAll(type?: ProbeType): ProbeElement[] {
    const all = Array.from(this.elements.values());
    if (type === undefined) return all;
    return all.filter(el => el.type === type);
  }

  /**
   * Get the underlying DOM element for a probe ID.
   */
  getDOMElement(id: string): Element | null {
    return this.domMap.get(id) ?? null;
  }

  /**
   * Start watching the DOM for additions/removals of data-probe-id elements.
   * Uses MutationObserver to keep the registry in sync.
   */
  startObserving(root: Element = document.body): void {
    // TODO: implement — MutationObserver on childList + subtree
    throw new Error('Not implemented');
  }

  /**
   * Stop the DOM MutationObserver.
   */
  stopObserving(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  /**
   * Update a registered element's state. Called by StateObserver when
   * data-probe-state changes.
   */
  updateState(id: string, state: ProbeElement['state']): void {
    const el = this.elements.get(id);
    if (el) {
      el.state = state;
    }
  }

  /**
   * Return count of registered elements.
   */
  get size(): number {
    return this.elements.size;
  }

  /**
   * Clear the entire registry.
   */
  clear(): void {
    this.elements.clear();
    this.domMap.clear();
  }
}
