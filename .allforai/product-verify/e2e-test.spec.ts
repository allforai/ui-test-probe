/**
 * UI Test Probe — E2E Verification Suite
 *
 * Verifies all 6 primitives of the Web SDK work end-to-end
 * by running Playwright against the web-react example app.
 *
 * The probe SDK bundle is injected via addInitScript before page load.
 */
import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const probeBundlePath = resolve(__dirname, '../../../sdk/web/dist/probe-bundle.js');
const probeScript = readFileSync(probeBundlePath, 'utf-8');

/** Helper: inject probe and navigate */
async function setupProbe(page: Page) {
  await page.addInitScript(`window.__probeConfig__ = { autoScan: true, interceptNetwork: true };`);
  await page.addInitScript(probeScript);
  await page.goto('http://localhost:3199');
  await page.waitForFunction(() => !!(window as any).__probe__);
}

test.describe('UI Test Probe — E2E Verification', () => {

  // V1: App launches without error
  test('V1 - App launches without error', async ({ page }) => {
    await setupProbe(page);
    await expect(page).toHaveTitle(/Order Management/);
    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v1-app-launch.png') });
  });

  // V2: Probe injects and window.__probe__ exists
  test('V2 - Probe injects and window.__probe__ exists', async ({ page }) => {
    await setupProbe(page);
    const hasProbe = await page.evaluate(() => typeof (window as any).__probe__ !== 'undefined');
    expect(hasProbe).toBe(true);

    const methods = await page.evaluate(() => {
      const p = (window as any).__probe__;
      return {
        query: typeof p?.query,
        queryAll: typeof p?.queryAll,
        getState: typeof p?.getState,
        getLayout: typeof p?.getLayout,
        click: typeof p?.click,
        snapshot: typeof p?.snapshot,
      };
    });
    expect(methods.query).toBe('function');
    expect(methods.queryAll).toBe('function');
    expect(methods.getState).toBe('function');
    expect(methods.getLayout).toBe('function');
    expect(methods.click).toBe('function');
    expect(methods.snapshot).toBe('function');
    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v2-probe-injected.png') });
  });

  // V3: Element Registry — query returns ProbeElements
  test('V3 - Element Registry: scan finds annotated elements', async ({ page }) => {
    await setupProbe(page);

    const elements = await page.evaluate(() => (window as any).__probe__?.queryAll() ?? []);
    expect(Array.isArray(elements)).toBe(true);
    expect(elements.length).toBeGreaterThanOrEqual(4); // order-page, status-filter, order-table, order-paginator, create-order-btn

    const orderPage = await page.evaluate(() => (window as any).__probe__?.query('order-page'));
    expect(orderPage).not.toBeNull();
    expect(orderPage.id).toBe('order-page');
    expect(orderPage.type).toBe('page');

    const table = await page.evaluate(() => (window as any).__probe__?.query('order-table'));
    expect(table).not.toBeNull();
    expect(table.type).toBe('data-container');

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v3-element-registry.png') });
  });

  // V4: State Exposure — real-time state queries
  test('V4 - State Exposure: read element states', async ({ page }) => {
    await setupProbe(page);

    const states = await page.evaluate(() =>
      (window as any).__probe__?.getStates(['order-page', 'status-filter', 'order-table'])
    );
    expect(states['order-page']).toBeDefined();
    expect(states['order-page'].current).toBe('loaded');
    expect(states['status-filter'].current).toBe('idle');
    expect(states['order-table'].current).toBe('empty'); // no data loaded

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v4-state-exposure.png') });
  });

  // V5: Event Stream + Snapshot Diff — detect state changes
  test('V5 - Event Stream: snapshot diff detects state changes', async ({ page }) => {
    await setupProbe(page);

    const before = await page.evaluate(() => (window as any).__probe__?.snapshot());
    expect(before).toBeDefined();
    expect(before.timestamp).toBeGreaterThan(0);

    // Mutate a state attribute
    await page.evaluate(() => {
      document.querySelector('[data-probe-id="status-filter"]')
        ?.setAttribute('data-probe-state', 'active');
    });
    await page.waitForTimeout(150); // MutationObserver propagation

    const after = await page.evaluate(() => (window as any).__probe__?.snapshot());
    const diffs = await page.evaluate(({ a, b }) =>
      (window as any).__probe__?.diff(a, b) ?? [], { a: before, b: after }
    );

    expect(diffs.length).toBeGreaterThan(0);
    const stateChange = diffs.find((d: any) => d.elementId === 'status-filter' && d.field === 'state');
    expect(stateChange).toBeDefined();

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v5-event-stream-diff.png') });
  });

  // V6: Source Binding — source annotation read
  test('V6 - Source Binding: order-table has source annotation', async ({ page }) => {
    await setupProbe(page);

    const source = await page.evaluate(() => (window as any).__probe__?.getSource('order-table'));
    expect(source).toBeDefined();
    expect(source.url).toBe('/api/orders');
    expect(source.method).toBe('GET');

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v6-source-binding.png') });
  });

  // V7: Layout Metrics — position/size queries
  test('V7 - Layout Metrics: table has dimensions', async ({ page }) => {
    await setupProbe(page);

    const layout = await page.evaluate(() => (window as any).__probe__?.getLayout('order-table'));
    expect(layout).toBeDefined();
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(typeof layout.x).toBe('number');
    expect(typeof layout.y).toBe('number');

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v7-layout-metrics.png') });
  });

  // V8: Action Dispatch — click + fill via probe
  test('V8 - Action Dispatch: click button and fill form', async ({ page }) => {
    await setupProbe(page);

    // Click the create order button
    await page.evaluate(() => (window as any).__probe__?.click('create-order-btn'));
    await page.waitForSelector('[data-probe-id="create-order-modal"]');

    // Re-scan for new elements
    await page.evaluate(() => (window as any).__probe__?.registry?.scan());

    // Fill customer input
    await page.evaluate(({ id, val }) =>
      (window as any).__probe__?.fill(id, val), { id: 'customer-input', val: 'Acme Corp' }
    );

    const value = await page.evaluate(() =>
      (document.querySelector('[data-probe-id="customer-input"]') as HTMLInputElement)?.value
    );
    expect(value).toBe('Acme Corp');

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v8-action-dispatch.png') });
  });

  // V9: Hierarchy — parent/children traversal
  test('V9 - Hierarchy: order-page children + effective visibility', async ({ page }) => {
    await setupProbe(page);

    const children = await page.evaluate(() =>
      (window as any).__probe__?.queryChildren('order-page') ?? []
    );
    const childIds = children.map((c: any) => c.id);
    expect(childIds).toContain('status-filter');
    expect(childIds).toContain('order-table');
    expect(childIds).toContain('order-paginator');
    expect(childIds).toContain('create-order-btn');

    // Open modal, check visibility chain
    await page.evaluate(() => (window as any).__probe__?.click('create-order-btn'));
    await page.waitForSelector('[data-probe-id="create-order-modal"]');
    await page.evaluate(() => (window as any).__probe__?.registry?.scan());

    const visible = await page.evaluate(() =>
      (window as any).__probe__?.isEffectivelyVisible('tax-input')
    );
    expect(visible).toBe(true);

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v9-hierarchy.png') });
  });

  // V10: Page Query — queryPage summary
  test('V10 - Page Query: returns page summary', async ({ page }) => {
    await setupProbe(page);

    const result = await page.evaluate(() => (window as any).__probe__?.queryPage());
    expect(result).toBeDefined();
    expect(result.id).toBe('order-page');
    expect(result.state).toBe('loaded');
    expect(result.elements.length).toBeGreaterThan(0);

    await page.screenshot({ path: resolve(__dirname, '../../../.allforai/product-verify/screenshots/v10-page-query.png') });
  });
});
