import { test, expect, _electron as electron } from '@playwright/test';

// UI Test Probe -- Electron + Playwright integration reference
// Electron has first-class Playwright support. The probe collector is
// injected into the BrowserWindow the same way as in a regular browser.
// The only difference: we launch via _electron.launch() instead of page.goto().

let app: Awaited<ReturnType<typeof electron.launch>>;
let page: Awaited<ReturnType<typeof app.firstWindow>>;

test.beforeAll(async () => {
  // Launch the Electron app -- Playwright connects to its renderer
  app = await electron.launch({ args: ['./dist/main.js'] });
  page = await app.firstWindow();
  // Probe collector is auto-injected into the BrowserWindow
  await page.probe.waitForPageReady();
});

test.afterAll(async () => {
  await app.close();
});

test.describe('Order Page -- Electron Probe API', () => {

  // --- Element Registry: semantic query ---
  test('table loads with correct state and source', async () => {
    const table = await page.probe.query('order-table');

    expect(table).not.toBeNull();
    expect(table.state.current).toBe('loaded');
    expect(table.data.rows).toBeGreaterThanOrEqual(1);
    expect(table.source.url).toBe('/api/orders');
    expect(table.source.status).toBe(200);
  });

  // --- Action Dispatch + Event Stream: act-and-wait ---
  test('status filter reloads table via API linkage', async () => {
    const result = await page.probe.actAndWait(
      'status-filter',
      'select:completed',
      { target: 'order-table', state: 'loaded' }
    );

    expect(result.linkageResults.directEffects[0].target).toBe('order-table');
    expect(result.linkageResults.directEffects[0].result).toBe('pass');
    expect(result.linkageResults.apiCalls[0].url).toContain('status=completed');
    expect(result.linkageResults.apiCalls[0].status).toBe(200);
  });

  // --- Linkage verification ---
  test('filter-to-table linkage is correctly wired', async () => {
    const linkage = await page.probe.verifyLinkage('status-filter', 'select:completed');

    expect(linkage.trigger).toBe('status-filter');
    expect(linkage.directEffects).toHaveLength(1);
    expect(linkage.directEffects[0].target).toBe('order-table');
    expect(linkage.directEffects[0].effect).toBe('data_reload');
    expect(linkage.directEffects[0].result).toBe('pass');
  });

  // --- Hierarchy: effective visibility ---
  test('tax-input is visible when modal is open', async () => {
    await page.probe.click('create-order-btn');
    await page.probe.waitForState('create-order-modal', 'open');

    const visible = await page.probe.isEffectivelyVisible('tax-input');
    expect(visible).toBe(true);
  });

  // --- Session tracking ---
  test('form tracks dirty state after input', async () => {
    // Modal should still be open from previous test; re-open if needed
    const modal = await page.probe.query('create-order-modal');
    if (!modal || modal.state.current !== 'open') {
      await page.probe.click('create-order-btn');
      await page.probe.waitForState('create-order-modal', 'open');
    }

    const formBefore = await page.probe.query('order-form');
    expect(formBefore.session.isDirty).toBe(false);

    await page.probe.fill('customer-input', 'Acme Corp');

    const formAfter = await page.probe.query('order-form');
    expect(formAfter.session.isDirty).toBe(true);
  });

  // --- Responsive: device preset (resizes the Electron window) ---
  test('table renders correctly at mobile size', async () => {
    await page.probe.setDevice('iphone-15-pro');

    const table = await page.probe.query('order-table');
    expect(table.layout.width).toBeLessThanOrEqual(393);
    expect(table.layout.visible).toBe(true);

    // Restore to desktop
    await page.probe.setDevice('desktop-1080p');
  });

  // --- Snapshot + Diff ---
  test('pagination changes data without breaking layout', async () => {
    const before = await page.probe.snapshot();

    await page.probe.actAndWait(
      'order-paginator',
      'click:next',
      { target: 'order-table', state: 'loaded' }
    );

    const after = await page.probe.snapshot();
    const changes = page.probe.diff(before, after);

    const dataChanges = changes.filter((c) => c.property.startsWith('data.'));
    const layoutChanges = changes.filter((c) => c.property.startsWith('layout.'));
    expect(dataChanges.length).toBeGreaterThan(0);
    expect(layoutChanges.length).toBe(0);
  });

  // --- Multi-device matrix (resizes window for each preset) ---
  test('order page works across window sizes', async () => {
    const results = await page.probe.runAcrossDevices(
      ['iphone-15-pro', 'ipad-air', 'desktop-1080p'],
      async (probe) => {
        await probe.waitForPageReady();
        const table = await probe.query('order-table');
        expect(table.state.current).toBe('loaded');
        expect(table.layout.visible).toBe(true);
      }
    );

    for (const [device, result] of Object.entries(results)) {
      expect(result.passed, `Failed on ${device}`).toBe(true);
    }
  });

  // --- Keyboard shortcut ---
  test('Ctrl+N opens create order modal', async () => {
    await page.probe.pressShortcut('Ctrl+N');
    await page.probe.waitForState('create-order-modal', 'open');

    const modal = await page.probe.query('create-order-modal');
    expect(modal.state.isOpen).toBe(true);
    expect(modal.animation.name).toBe('fade-in');
  });
});
