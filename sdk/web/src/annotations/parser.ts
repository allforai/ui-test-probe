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

import type { ProbeElement, ProbeType } from '../../../../spec/probe-types.js';

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

    // Children (JSON array of probe IDs)
    const childrenAttr = element.getAttribute(`${AnnotationParser.PREFIX}children`);
    if (childrenAttr) {
      result.children = this.parseJSON<string[]>(childrenAttr);
    }

    // Data fields — build data object from various attributes
    const data: Record<string, unknown> = {};
    const valueAttr = element.getAttribute(`${AnnotationParser.PREFIX}value`);
    if (valueAttr != null) data.value = valueAttr;
    const optionsAttr = element.getAttribute(`${AnnotationParser.PREFIX}options`);
    if (optionsAttr) data.options = this.parseJSON(optionsAttr);
    const rowsAttr = element.getAttribute(`${AnnotationParser.PREFIX}rows`);
    if (rowsAttr != null) data.rows = parseInt(rowsAttr, 10);
    const columnsAttr = element.getAttribute(`${AnnotationParser.PREFIX}columns`);
    if (columnsAttr) data.columns = this.parseJSON(columnsAttr);
    const sortAttr = element.getAttribute(`${AnnotationParser.PREFIX}sort`);
    if (sortAttr) data.sort = this.parseJSON(sortAttr);
    const filterAttr = element.getAttribute(`${AnnotationParser.PREFIX}filter`);
    if (filterAttr) data.filter = this.parseJSON(filterAttr);
    if (Object.keys(data).length > 0) {
      result.data = data as ProbeElement['data'];
    }

    // Session
    const sessionAttr = element.getAttribute(`${AnnotationParser.PREFIX}session`);
    if (sessionAttr) {
      result.session = this.parseJSON(sessionAttr);
    }

    // Animation
    const animationAttr = element.getAttribute(`${AnnotationParser.PREFIX}animation`);
    if (animationAttr) {
      result.animation = this.parseJSON(animationAttr);
    }

    // Accessibility from standard ARIA
    result.accessibility = this.parseAccessibility(element);

    return result;
  }

  /**
   * Scan all data-probe-* attributes on an element and return raw key-value pairs.
   */
  getRawAnnotations(element: Element): ParsedAnnotations | null {
    const id = element.getAttribute(`${AnnotationParser.PREFIX}id`);
    if (!id) return null;

    const result: ParsedAnnotations = { id };
    for (const attr of Array.from(element.attributes)) {
      if (attr.name.startsWith(AnnotationParser.PREFIX)) {
        const key = attr.name.slice(AnnotationParser.PREFIX.length) as keyof ParsedAnnotations;
        if (key !== 'id') {
          (result as unknown as Record<string, string>)[key] = attr.value;
        }
      }
    }
    return result;
  }

  /**
   * Parse a source attribute value into a source binding object.
   * Supports shorthand "GET /api/orders" or just "/api/orders".
   */
  private parseSource(value: string): ProbeElement['source'] {
    // Try JSON first (e.g. '{"url":"/api/orders","method":"GET","status":200}')
    const trimmed = value.trim();
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as ProbeElement['source'];
      } catch {
        // Fall through to shorthand parsing
      }
    }
    // Shorthand: "GET /api/orders" or just "/api/orders"
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      return { method: parts[0]!, url: parts.slice(1).join(' ') };
    }
    return { method: 'GET', url: trimmed };
  }

  /**
   * Parse a linkage JSON attribute into the linkage structure.
   */
  private parseLinkage(value: string): ProbeElement['linkage'] {
    try {
      const parsed = JSON.parse(value);
      const targets = Array.isArray(parsed) ? parsed : [parsed];
      return { targets };
    } catch {
      return undefined;
    }
  }

  /**
   * Extract accessibility info from standard ARIA attributes.
   */
  private parseAccessibility(element: Element): ProbeElement['accessibility'] {
    const role = element.getAttribute('role') ?? (element as HTMLElement).tagName?.toLowerCase();
    const label = element.getAttribute('aria-label') ?? element.getAttribute('title') ?? undefined;
    const tabIndexAttr = element.getAttribute('tabindex');
    const tabIndex = tabIndexAttr !== null ? parseInt(tabIndexAttr, 10) : undefined;

    if (!role && !label && tabIndex === undefined) return undefined;
    return {
      role: role || undefined,
      label,
      tabIndex: tabIndex !== undefined && !isNaN(tabIndex) ? tabIndex : undefined,
    };
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
