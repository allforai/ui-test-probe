/**
 * AnnotationParser — parses data-probe-* HTML attributes into ProbeElement structure.
 *
 * HTML annotation format:
 *   <div data-probe-id="order-list"
 *        data-probe-type="data-container"
 *        data-probe-state="loaded"
 *        data-probe-source="/api/orders"
 *        data-probe-linkage='[{"id":"detail-panel","effect":"data_reload","path":{"type":"api","url":"/api/orders/:id"}}]'>
 *
 * All data-probe-* attributes are optional except data-probe-id.
 */

import type { ProbeElement, ProbeType } from '../../../spec/probe-types.js';

/** Map of data-probe-* attribute names (without prefix) to their parser. */
interface ParsedAnnotations {
  id: string;
  type?: ProbeType;
  state?: string;
  source?: string;
  linkage?: string;
  shortcuts?: string;
  locale?: string;
  theme?: string;
  events?: string;
  parent?: string;
  children?: string;
}

export class AnnotationParser {
  /** The HTML attribute prefix to scan for. */
  static readonly PREFIX = 'data-probe-';

  /**
   * Parse all data-probe-* attributes from a DOM element into a ProbeElement.
   *
   * @param element - The DOM element to parse.
   * @returns A partial ProbeElement populated from HTML annotations,
   *          or null if the element has no data-probe-id.
   */
  parse(element: Element): Partial<ProbeElement> | null {
    const id = element.getAttribute(`${AnnotationParser.PREFIX}id`);
    if (!id) {
      return null;
    }

    const result: Partial<ProbeElement> = { id };

    // Type
    const typeAttr = element.getAttribute(`${AnnotationParser.PREFIX}type`);
    if (typeAttr) {
      result.type = typeAttr as ProbeType;
    }

    // State (shorthand — sets state.current)
    const stateAttr = element.getAttribute(`${AnnotationParser.PREFIX}state`);
    if (stateAttr) {
      result.state = {
        current: stateAttr,
        timestamp: Date.now(),
      };
    }

    // Source (shorthand — sets source.url with GET default)
    const sourceAttr = element.getAttribute(`${AnnotationParser.PREFIX}source`);
    if (sourceAttr) {
      result.source = this.parseSource(sourceAttr);
    }

    // Linkage (JSON array)
    const linkageAttr = element.getAttribute(`${AnnotationParser.PREFIX}linkage`);
    if (linkageAttr) {
      result.linkage = this.parseLinkage(linkageAttr);
    }

    // Shortcuts (JSON array)
    const shortcutsAttr = element.getAttribute(`${AnnotationParser.PREFIX}shortcuts`);
    if (shortcutsAttr) {
      result.shortcuts = this.parseJSON(shortcutsAttr);
    }

    // Locale
    const localeAttr = element.getAttribute(`${AnnotationParser.PREFIX}locale`);
    if (localeAttr) {
      result.locale = this.parseJSON(localeAttr);
    }

    // Theme
    const themeAttr = element.getAttribute(`${AnnotationParser.PREFIX}theme`);
    if (themeAttr) {
      result.theme = this.parseJSON(themeAttr);
    }

    // Event bindings
    const eventsAttr = element.getAttribute(`${AnnotationParser.PREFIX}events`);
    if (eventsAttr) {
      result.eventBindings = eventsAttr.split(',').map(s => s.trim());
    }

    // Parent
    const parentAttr = element.getAttribute(`${AnnotationParser.PREFIX}parent`);
    if (parentAttr) {
      result.parent = parentAttr;
    }

    // Accessibility from standard ARIA
    result.accessibility = this.parseAccessibility(element);

    return result;
  }

  /**
   * Scan all data-probe-* attributes on an element and return raw key-value pairs.
   */
  getRawAnnotations(element: Element): ParsedAnnotations | null {
    // TODO: implement — iterate element.attributes, filter by prefix
    throw new Error('Not implemented');
  }

  /**
   * Parse a source attribute value into a source binding object.
   * Supports shorthand "GET /api/orders" or just "/api/orders".
   */
  private parseSource(value: string): ProbeElement['source'] {
    const parts = value.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { method: parts[0]!, url: parts.slice(1).join(' ') };
    }
    return { method: 'GET', url: value.trim() };
  }

  /**
   * Parse a linkage JSON attribute into the linkage structure.
   */
  private parseLinkage(value: string): ProbeElement['linkage'] {
    // TODO: implement — JSON.parse with error handling, validate target shape
    throw new Error('Not implemented');
  }

  /**
   * Extract accessibility info from standard ARIA attributes.
   */
  private parseAccessibility(element: Element): ProbeElement['accessibility'] {
    // TODO: implement — read role, aria-label, tabindex
    throw new Error('Not implemented');
  }

  /**
   * Safely parse a JSON attribute value.
   */
  private parseJSON<T>(value: string): T | undefined {
    try {
      return JSON.parse(value) as T;
    } catch {
      return undefined;
    }
  }
}
