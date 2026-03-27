/**
 * ElementRegistry — scans DOM for data-probe-* annotated elements and maintains
 * a live registry of ProbeElement instances keyed by probe ID.
 *
 * The registry is the backbone of the Web SDK. It connects the AnnotationParser
 * (which reads HTML attributes) with the runtime collectors (state, source, layout).
 */

import { type ProbeElement, ProbeType } from '../../../../spec/probe-types.js';
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
    const nodes = root.querySelectorAll('[data-probe-id]');
    let count = 0;
    for (const node of Array.from(nodes)) {
      if (this.register(node)) count++;
    }
    // Also check root itself
    if (root.hasAttribute?.('data-probe-id') && this.register(root)) count++;
    return count;
  }

  /**
   * Register a single element by its DOM node. Parses annotations and adds
   * to the registry. If an element with the same ID exists, it is replaced.
   *
   * @param element - The DOM element with data-probe-id.
   * @returns The registered ProbeElement, or null if no data-probe-id.
   */
  register(element: Element): ProbeElement | null {
    const parsed = this.parser.parse(element);
    if (!parsed?.id) return null;

    // Build full ProbeElement with defaults for required fields
    const rect = (element as HTMLElement).getBoundingClientRect?.() ?? { x: 0, y: 0, width: 0, height: 0 };
    const probeElement: ProbeElement = {
      id: parsed.id,
      type: parsed.type ?? ProbeType.DISPLAY,
      accessibility: parsed.accessibility,
      state: parsed.state ?? { current: 'idle', timestamp: Date.now() },
      data: parsed.data,
      source: parsed.source,
      linkage: parsed.linkage,
      layout: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        visible: (element as HTMLElement).offsetParent !== null || (element as HTMLElement).getClientRects?.().length > 0,
      },
      shortcuts: parsed.shortcuts,
      locale: parsed.locale,
      theme: parsed.theme,
      eventBindings: parsed.eventBindings,
      parent: parsed.parent,
      children: parsed.children,
    };

    this.elements.set(parsed.id, probeElement);
    this.domMap.set(parsed.id, element);
    return probeElement;
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
    this.stopObserving();
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Handle added nodes
        for (const node of Array.from(mutation.addedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as Element;
          if (el.hasAttribute('data-probe-id')) {
            this.register(el);
          }
          // Scan subtree of added node
          const children = el.querySelectorAll?.('[data-probe-id]');
          if (children) {
            for (const child of Array.from(children)) {
              this.register(child);
            }
          }
        }
        // Handle removed nodes
        for (const node of Array.from(mutation.removedNodes)) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const el = node as Element;
          const id = el.getAttribute?.('data-probe-id');
          if (id) this.unregister(id);
          const children = el.querySelectorAll?.('[data-probe-id]');
          if (children) {
            for (const child of Array.from(children)) {
              const childId = child.getAttribute('data-probe-id');
              if (childId) this.unregister(childId);
            }
          }
        }
      }
    });
    this.observer.observe(root, { childList: true, subtree: true });
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
