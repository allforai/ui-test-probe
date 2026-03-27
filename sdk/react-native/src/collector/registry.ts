/**
 * Element registry for React Native.
 * Uses a NativeModule bridge to query the platform accessibility tree
 * and discover probe-annotated elements at test time.
 */

import type { ProbeElement, ProbeType } from '../probe';

/**
 * Registry of probe-annotated UI elements in the React Native tree.
 * At test time, the collector scans the native accessibility tree
 * (via UIAccessibility on iOS, AccessibilityNodeInfo on Android)
 * to find elements with probe metadata in their accessibility hints.
 */
export class ElementRegistry {
  private elements: Map<string, ProbeElement> = new Map();

  /**
   * Scans the accessibility tree for probe-annotated elements.
   * On iOS, reads accessibilityLabel/accessibilityHint.
   * On Android, reads contentDescription and extras.
   *
   * @returns Number of probe elements discovered.
   */
  async scan(): Promise<number> {
    // TODO: 1. Call NativeModule to traverse accessibility tree
    //       2. For each node with accessibilityLabel starting with "probe:":
    //          a. Parse probe ID from label
    //          b. Deserialize metadata from accessibilityHint
    //          c. Read layout bounds from native node
    //          d. Construct ProbeElement
    //       3. Register in this.elements map
    throw new Error('ElementRegistry.scan: not yet implemented');
  }

  /**
   * Returns a single probe element by ID, or null if not found.
   * Refreshes the element's runtime state before returning.
   */
  query(id: string): ProbeElement | null {
    // TODO: Look up in registry, refresh runtime state (layout, data values).
    throw new Error('ElementRegistry.query: not yet implemented');
  }

  /**
   * Returns all registered elements, optionally filtered by type.
   */
  queryAll(type?: ProbeType): ProbeElement[] {
    // TODO: Filter elements map by type, refresh state.
    throw new Error('ElementRegistry.queryAll: not yet implemented');
  }

  /**
   * Returns the page-level summary: page element, all children,
   * and elements not yet in "loaded" state.
   */
  queryPage(): {
    id: string;
    state: string;
    elements: ProbeElement[];
    unreadyElements: string[];
  } {
    // TODO: Find page-type element, collect all, identify unready.
    throw new Error('ElementRegistry.queryPage: not yet implemented');
  }

  /**
   * Returns direct children of the specified element.
   */
  queryChildren(id: string): ProbeElement[] {
    // TODO: Use parent/children hierarchy.
    throw new Error('ElementRegistry.queryChildren: not yet implemented');
  }

  /**
   * Returns all descendant elements recursively.
   */
  queryDescendants(id: string): ProbeElement[] {
    // TODO: Recursive walk through children.
    throw new Error('ElementRegistry.queryDescendants: not yet implemented');
  }

  /**
   * Checks if an element is effectively visible by walking ancestor chain.
   * Returns false if any ancestor has visible=false.
   */
  isEffectivelyVisible(id: string): boolean {
    // TODO: Walk parent chain via registry, check visible flag at each level.
    throw new Error('ElementRegistry.isEffectivelyVisible: not yet implemented');
  }
}
