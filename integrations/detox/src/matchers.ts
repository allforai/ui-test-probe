/**
 * Custom Detox matchers for probe-annotated elements.
 * Provides semantic matching by probe ID, type, and state
 * instead of raw testID or accessibility label strings.
 *
 * Uses Detox's `by` global matcher API. These functions return
 * Detox matcher objects that can be passed to `element()`.
 */

// Detox provides `by` as a global. We declare a minimal type here
// to avoid a hard dependency on @types/detox at compile time.
declare const by: {
  id(id: string): unknown;
  label(label: string): unknown;
  traits(traits: string[]): unknown;
  text(text: string): unknown;
};

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
  return by.id(id);
}

/**
 * Matches all elements of a specific probe type.
 * Searches accessibility labels for the "probe:" prefix and accessibility
 * hints containing serialized probe metadata with the target type.
 *
 * Since Detox does not support regex matching on accessibilityHint directly,
 * we use by.label() with the "probe:" prefix convention, then rely on
 * the test code to filter by type from the returned attributes.
 *
 * @example
 * ```ts
 * const buttons = await element(byProbeType('action')).getAttributes();
 * ```
 */
export function byProbeType(type: string): unknown {
  // Detox does not natively support hint-based matching with regex.
  // We use by.label() matching the probe label prefix. The probe framework
  // encodes the type in accessibilityHint as JSON, so we match by the
  // label pattern and let the caller filter by type from metadata.
  // For a more precise match, we use by.id() with a traits-based approach.
  // The best available approach: match by label prefix and use the type
  // as a secondary filter in the test code.
  return by.label(`probe-type:${type}`);
}

/**
 * Matches elements in a specific probe state.
 * Combines by.id(id) to locate the element. State is stored
 * in the accessibility hint JSON -- the caller should verify
 * the state from the element's attributes after matching.
 *
 * @example
 * ```ts
 * await waitFor(element(withProbeState('order-table', 'loaded')))
 *   .toBeVisible()
 *   .withTimeout(5000);
 * ```
 */
export function withProbeState(id: string, _state: string): unknown {
  // Detox matchers are native-level and cannot parse JSON in hints.
  // We match by ID and rely on the ProbeDevice layer to verify state
  // from the accessibility hint metadata after the element is found.
  return by.id(id);
}

/**
 * Matches elements that have any probe annotation.
 * Probed elements have accessibilityLabel starting with "probe:".
 *
 * @example
 * ```ts
 * const probed = await element(anyProbeElement()).getAttributes();
 * ```
 */
export function anyProbeElement(): unknown {
  // Match any element whose accessibilityLabel starts with "probe:"
  return by.label(/^probe:/ as unknown as string);
}
