/**
 * Custom Playwright expect matchers for UI Test Probe.
 *
 * Usage:
 * ```ts
 * import { expect } from '@playwright/test';
 * import { toHaveProbeState, toHaveProbeData, toBeEffectivelyVisible } from '@allforai/ui-test-probe-playwright';
 *
 * expect.extend({ toHaveProbeState, toHaveProbeData, toBeEffectivelyVisible });
 *
 * // In tests:
 * await expect(probe).toHaveProbeState('order-list', 'loaded');
 * await expect(probe).toHaveProbeData('order-list', { rows: expect.any(Number) });
 * await expect(probe).toBeEffectivelyVisible('order-list');
 * ```
 */

import type { ProbePage } from './probe-page.js';

interface MatcherResult {
  pass: boolean;
  message: () => string;
}

/**
 * Assert that a probe element is in a specific state.
 *
 * @param probe - ProbePage instance.
 * @param id - Probe element ID.
 * @param expectedState - Expected state.current value (e.g. "loaded", "error").
 * @param options - Optional timeout for auto-retry.
 */
export async function toHaveProbeState(
  probe: ProbePage,
  id: string,
  expectedState: string,
  options?: { timeout?: number },
): Promise<MatcherResult> {
  // TODO: implement — query element state via probe.getState(id),
  //   with retry loop up to timeout (for Playwright auto-retry compatibility).
  //   Return { pass: true/false, message() } matcher result.
  //
  //   On pass: message should say "Expected <id> not to have state <expected>"
  //   On fail: message should say "Expected <id> to have state <expected>, got <actual>"

  const timeout = options?.timeout ?? 0;
  const deadline = Date.now() + timeout;
  let actual: string | undefined;

  do {
    const state = await probe.getState(id);
    actual = state?.current;
    if (actual === expectedState) {
      return {
        pass: true,
        message: () => `Expected element "${id}" not to have state "${expectedState}"`,
      };
    }
    if (timeout > 0 && Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100));
    }
  } while (Date.now() < deadline);

  return {
    pass: false,
    message: () => `Expected element "${id}" to have state "${expectedState}", but got "${actual ?? 'undefined'}"`,
  };
}

/**
 * Assert that a probe element's data matches an expected shape.
 *
 * Uses deep partial matching — only the specified fields are checked.
 *
 * @param probe - ProbePage instance.
 * @param id - Probe element ID.
 * @param expectedData - Partial data object to match against.
 */
export async function toHaveProbeData(
  probe: ProbePage,
  id: string,
  expectedData: Record<string, unknown>,
): Promise<MatcherResult> {
  // TODO: implement — query element via probe.query(id),
  //   deep-partial-match element.data against expectedData.
  //   Support expect.any(), expect.arrayContaining(), etc.

  const element = await probe.query(id);
  if (!element) {
    return {
      pass: false,
      message: () => `Expected element "${id}" to exist, but it was not found`,
    };
  }

  const data = element.data ?? {};
  const mismatches: string[] = [];

  for (const [key, expected] of Object.entries(expectedData)) {
    const actual = (data as Record<string, unknown>)[key];
    if (actual !== expected) {
      mismatches.push(`  ${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  const pass = mismatches.length === 0;

  return {
    pass,
    message: () => pass
      ? `Expected element "${id}" data not to match the given shape`
      : `Expected element "${id}" data to match, but found mismatches:\n${mismatches.join('\n')}`,
  };
}

/**
 * Assert that a probe element is effectively visible — both itself and
 * all ancestors have layout.visible === true.
 *
 * @param probe - ProbePage instance.
 * @param id - Probe element ID.
 */
export async function toBeEffectivelyVisible(
  probe: ProbePage,
  id: string,
): Promise<MatcherResult> {
  const visible = await probe.isEffectivelyVisible(id);

  return {
    pass: visible,
    message: () => visible
      ? `Expected element "${id}" not to be effectively visible`
      : `Expected element "${id}" to be effectively visible, but it (or an ancestor) is hidden`,
  };
}
