/**
 * injectProbe — adds the UI Test Probe web collector to a Playwright page.
 *
 * Uses page.addInitScript() to ensure the probe is available before any
 * application code runs. The probe is accessible as window.__probe__.
 */

import type { Page } from '@playwright/test';

/**
 * Inject the UI Test Probe collector into a Playwright page.
 *
 * This must be called before page.goto() for the probe to capture
 * all network requests and DOM mutations from the start.
 *
 * @param page - Playwright Page instance.
 * @param options - Optional configuration for the injected probe.
 * @returns The page (for chaining).
 *
 * @example
 * ```ts
 * import { injectProbe, ProbePage } from '@allforai/ui-test-probe-playwright';
 *
 * test('order list loads', async ({ page }) => {
 *   await injectProbe(page);
 *   await page.goto('/orders');
 *   const probe = new ProbePage(page);
 *   await probe.waitForPageReady();
 *   const list = await probe.query('order-list');
 *   expect(list?.state.current).toBe('loaded');
 * });
 * ```
 */
export async function injectProbe(
  page: Page,
  options?: {
    /** Automatically scan DOM on load. Defaults to true. */
    autoScan?: boolean;
    /** Intercept fetch/XHR. Defaults to true. */
    interceptNetwork?: boolean;
  },
): Promise<Page> {
  const config = {
    autoScan: options?.autoScan ?? true,
    interceptNetwork: options?.interceptNetwork ?? true,
  };

  // TODO: implement — bundle the WebProbe class into a self-contained script string,
  //   then call page.addInitScript() with that script + config.
  //   The script should:
  //   1. Define all probe classes inline (no module imports at runtime)
  //   2. Instantiate new WebProbe(config)
  //   3. Store as window.__probe__
  //
  //   For now, use a placeholder that creates a minimal stub:
  await page.addInitScript(`
    // UI Test Probe — injected collector (stub)
    // Full implementation will bundle the WebProbe class here.
    window.__probe__ = {
      _injected: true,
      _config: ${JSON.stringify(config)},
    };
  `);

  return page;
}
