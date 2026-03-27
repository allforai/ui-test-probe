import { expect } from '@playwright/test';
import { test } from './fixtures.js';

// UI Test Probe — Playwright integration reference
// The probe is injected via fixture, accessed as `probe` in each test.

// --- Element Registry: semantic query ---
test('table loads with correct state and source', async ({ probe }) => {
  const table = await probe.query('order-table');

  expect(table).not.toBeNull();
  // Table is 'empty' since we don't have a real API feeding data
  expect(table!.state.current).toBe('empty');
  expect(table!.source).toBeDefined();
  expect(table!.source!.url).toBe('/api/orders');
});

// --- Hierarchy: effective visibility ---
test('tax-input is visible when modal is open', async ({ probe, page }) => {
  await probe.click('create-order-btn');

  // Wait for modal to appear in DOM (conditionally rendered)
  await page.waitForSelector('[data-probe-id="create-order-modal"]');
  // Re-scan to pick up newly rendered elements
  await page.evaluate(() => (window as any).__probe__?.registry?.scan());

  const visible = await probe.isEffectivelyVisible('tax-input');
  expect(visible).toBe(true);
});

// --- Registry: query all by type ---
test('can query all form elements', async ({ probe, page }) => {
  await probe.click('create-order-btn');
  await page.waitForSelector('[data-probe-id="create-order-modal"]');
  await page.evaluate(() => (window as any).__probe__?.registry?.scan());

  const forms = await probe.queryAll('form');
  expect(forms.length).toBeGreaterThan(0);
});

// --- Layout: element metrics ---
test('table has correct layout metrics', async ({ probe }) => {
  const layout = await probe.getLayout('order-table');

  expect(layout).toBeDefined();
  expect(layout.width).toBeGreaterThan(0);
  expect(layout.height).toBeGreaterThan(0);
  expect(typeof layout.x).toBe('number');
  expect(typeof layout.y).toBe('number');
});

// --- State: get element states ---
test('can read multiple element states', async ({ probe }) => {
  const states = await probe.getStates(['order-page', 'status-filter', 'order-table']);

  expect(states['order-page']).toBeDefined();
  expect(states['order-page'].current).toBe('loaded');
  expect(states['status-filter']).toBeDefined();
  expect(states['status-filter'].current).toBe('idle');
});

// --- Hierarchy: query children ---
test('order-page has expected children', async ({ probe }) => {
  const children = await probe.queryChildren('order-page');

  const childIds = children.map((c: any) => c.id);
  expect(childIds).toContain('status-filter');
  expect(childIds).toContain('order-table');
  expect(childIds).toContain('order-paginator');
  expect(childIds).toContain('create-order-btn');
});

// --- Snapshot: capture state ---
test('snapshot captures all registered elements', async ({ probe }) => {
  const snapshot = await probe.snapshot();

  expect(snapshot).toBeDefined();
  expect(snapshot.timestamp).toBeGreaterThan(0);
  expect(snapshot.elements).toBeDefined();
  expect(snapshot.elements['order-page']).toBeDefined();
  expect(snapshot.elements['order-table']).toBeDefined();
  expect(snapshot.elements['status-filter']).toBeDefined();
});

// --- Diff: compare snapshots ---
test('diff detects state changes', async ({ probe, page }) => {
  const before = await probe.snapshot();

  // Change the filter's state attribute
  await page.evaluate(() => {
    const el = document.querySelector('[data-probe-id="status-filter"]');
    el?.setAttribute('data-probe-state', 'active');
  });
  // Wait for MutationObserver
  await page.waitForTimeout(100);

  const after = await probe.snapshot();
  const diffs = await probe.diff(before, after);

  expect(diffs.length).toBeGreaterThan(0);
  const stateChange = diffs.find((d: any) => d.elementId === 'status-filter' && d.field === 'state');
  expect(stateChange).toBeDefined();
});

// --- Page query ---
test('queryPage returns page summary', async ({ probe }) => {
  const pageResult = await probe.queryPage();

  expect(pageResult).toBeDefined();
  expect(pageResult.id).toBe('order-page');
  expect(pageResult.elements.length).toBeGreaterThan(0);
});

// --- Source: source binding from annotation ---
test('order-table has source binding from annotation', async ({ probe }) => {
  const source = await probe.getSource('order-table');

  expect(source).toBeDefined();
  expect(source!.url).toBe('/api/orders');
  expect(source!.method).toBe('GET');
});

// --- Action: fill form field ---
test('can fill form fields through probe', async ({ probe, page }) => {
  await probe.click('create-order-btn');
  await page.waitForSelector('[data-probe-id="customer-input"]');
  await page.evaluate(() => (window as any).__probe__?.registry?.scan());

  await probe.fill('customer-input', 'Acme Corp');

  const value = await page.evaluate(() =>
    (document.querySelector('[data-probe-id="customer-input"]') as HTMLInputElement)?.value
  );
  expect(value).toBe('Acme Corp');
});
