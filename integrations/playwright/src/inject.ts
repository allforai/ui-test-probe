/**
 * injectProbe — adds the UI Test Probe web collector to a Playwright page.
 *
 * Uses page.addInitScript() to ensure the probe is available before any
 * application code runs. The probe is accessible as window.__probe__.
 */

import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let _bundleCache: string | null = null;

function loadBundle(): string {
  if (_bundleCache) return _bundleCache;

  // Resolve the pre-built IIFE bundle from the web SDK
  // Try multiple resolution strategies
  const candidates = [
    // Relative from this file's compiled location (dist/)
    resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'sdk', 'web', 'dist', 'probe-bundle.js'),
    // From node_modules (when installed as packages)
    resolve(dirname(fileURLToPath(import.meta.url)), '..', 'node_modules', '@allforai', 'ui-test-probe-web', 'dist', 'probe-bundle.js'),
  ];

  for (const path of candidates) {
    try {
      _bundleCache = readFileSync(path, 'utf-8');
      return _bundleCache;
    } catch {
      // Try next candidate
    }
  }

  throw new Error(
    `Could not find probe-bundle.js. Run 'npm run build' in sdk/web/ first.\nSearched:\n${candidates.join('\n')}`
  );
}

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

  const bundleScript = loadBundle();

  // Inject config first, then the bundle which reads it on initialization
  await page.addInitScript(`
    window.__probeConfig__ = ${JSON.stringify(config)};
  `);
  await page.addInitScript(bundleScript);

  return page;
}
