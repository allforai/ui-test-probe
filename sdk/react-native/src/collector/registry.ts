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
   * Registers a probe element directly (called by useProbe hook at mount time).
   * This is the primary registration path in React Native since there is no
   * DOM to scan -- components self-register via the useProbe hook side-effect.
   */
  register(element: ProbeElement): void {
    this.elements.set(element.id, element);
  }

  /**
   * Removes a probe element from the registry (called on unmount).
   */
  unregister(id: string): void {
    this.elements.delete(id);
  }

  /**
   * Scans the accessibility tree for probe-annotated elements.
   * In React Native, components self-register via useProbe, so scan()
   * returns the count of currently registered elements. If a NativeModule
   * bridge is available, it can additionally traverse the native tree.
   *
   * @returns Number of probe elements discovered.
   */
  async scan(): Promise<number> {
    // In React Native, elements self-register via the useProbe hook.
    // scan() acts as a checkpoint returning the current count.
    // A native module bridge could augment this in the future.
    return this.elements.size;
  }

  /**
   * Returns a single probe element by ID, or null if not found.
   */
  query(id: string): ProbeElement | null {
    return this.elements.get(id) ?? null;
  }

  /**
   * Returns all registered elements, optionally filtered by type.
   */
  queryAll(type?: ProbeType): ProbeElement[] {
    const all = Array.from(this.elements.values());
    if (!type) return all;
    return all.filter((el) => el.type === type);
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
    const all = this.queryAll();
    const page = all.find((el) => el.type === 'page');
    const unreadyElements = all
      .filter((el) => el.state.current === 'loading' || el.state.current === 'submitting')
      .map((el) => el.id);

    return {
      id: page?.id ?? 'unknown',
      state: page?.state.current ?? (unreadyElements.length === 0 ? 'loaded' : 'loading'),
      elements: all,
      unreadyElements,
    };
  }

  /**
   * Returns direct children of the specified element.
   */
  queryChildren(id: string): ProbeElement[] {
    const el = this.elements.get(id);
    if (!el?.children) return [];
    return el.children
      .map((childId) => this.elements.get(childId))
      .filter((child): child is ProbeElement => child !== undefined);
  }

  /**
   * Returns all descendant elements recursively.
   */
  queryDescendants(id: string): ProbeElement[] {
    const result: ProbeElement[] = [];
    const collect = (parentId: string) => {
      const children = this.queryChildren(parentId);
      for (const child of children) {
        result.push(child);
        collect(child.id);
      }
    };
    collect(id);
    return result;
  }

  /**
   * Checks if an element is effectively visible by walking ancestor chain.
   * Returns false if any ancestor has visible=false.
   */
  isEffectivelyVisible(id: string): boolean {
    let current = this.elements.get(id);
    while (current) {
      if (!current.layout.visible) return false;
      if (!current.parent) break;
      current = this.elements.get(current.parent);
    }
    return current !== undefined;
  }
}
