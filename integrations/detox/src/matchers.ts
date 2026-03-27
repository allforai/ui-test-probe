/**
 * Custom Detox matchers for probe-annotated elements.
 * Provides semantic matching by probe ID, type, and state
 * instead of raw testID or accessibility label strings.
 */

/**
 * Matches an element by its probe ID.
 * Under the hood, this maps to Detox's by.id() since probe IDs
 * are stored as testID on React Native elements.
 *
 * @example
 * ```ts
 * await expect(element(byProbeId('order-table'))).toBeVisible();
 * ```
 */
export function byProbeId(id: string): unknown {
  // TODO: Return Detox matcher: by.id(id)
  // The probe ID is stored as the element's testID.
  throw new Error('byProbeId: not yet implemented');
}

/**
 * Matches all elements of a specific probe type.
 * Searches accessibility hints for serialized probe metadata
 * containing the target type.
 *
 * @example
 * ```ts
 * const buttons = await element(byProbeType('action')).getAttributes();
 * ```
 */
export function byProbeType(type: string): unknown {
  // TODO: Return Detox matcher that filters by probe type in accessibility hint.
  // May need to use by.label() with a regex or a custom native matcher.
  throw new Error('byProbeType: not yet implemented');
}

/**
 * Matches elements in a specific probe state.
 * Filters by the state field in serialized probe metadata.
 *
 * @example
 * ```ts
 * await waitFor(element(withProbeState('order-table', 'loaded')))
 *   .toBeVisible()
 *   .withTimeout(5000);
 * ```
 */
export function withProbeState(id: string, state: string): unknown {
  // TODO: Return Detox matcher combining by.id(id) with state check.
  // State is stored in the accessibility hint JSON.
  throw new Error('withProbeState: not yet implemented');
}

/**
 * Matches elements that have any probe annotation.
 * Useful for discovering all instrumented elements on a page.
 *
 * @example
 * ```ts
 * const probed = await element(anyProbeElement()).getAttributes();
 * ```
 */
export function anyProbeElement(): unknown {
  // TODO: Return Detox matcher for accessibilityLabel starting with "probe:".
  throw new Error('anyProbeElement: not yet implemented');
}
