import { test, expect } from '@playwright/test';

// UI Test Probe -- Playwright integration reference (Vue app)
// The ProbeAPI is framework-agnostic: these tests are identical to the
// React example. The same page.probe.* methods work regardless of whether
// the app uses React, Vue, Svelte, or Angular.

test.describe('Order Page -- Probe API (Vue)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/orders');
    // Event-driven readiness -- no arbitrary timeouts
    await page.probe.waitForPageReady();
  });

  // --- Element Registry: semantic query ---
  test('table loads with correct state and source', async ({ page }) => {
    const table = await page.probe.query('order-table');

    expect(table).not.toBeNull();
    expect(table.state.current).toBe('loaded');
    expect(table.data.rows).toBeGreaterThanOrEqual(1);
    expect(table.source.url).toBe('/api/orders');
    expect(table.source.status).toBe(200);
  });

  // --- Action Dispatch + Event Stream: act-and-wait ---
  test('status filter reloads table via API linkage', async ({ page }) => {
    const result = await page.probe.actAndWait(
      'status-filter',
      'select:completed',
      { target: 'order-table', state: 'loaded' }
    );

    expect(result.linkageResults.directEffects[0].target).toBe('order-table');
    expect(result.linkageResults.directEffects[0].result).toBe('pass');
    expect(result.linkageResults.apiCalls[0].url).toContain('status=completed');
  });

  // --- Linkage verification ---
  test('filter-to-table linkage is correctly wired', async ({ page }) => {
    const linkage = await page.probe.verifyLinkage('status-filter', 'select:completed');

    expect(linkage.trigger).toBe('status-filter');
    expect(linkage.directEffects).toHaveLength(1);
    expect(linkage.directEffects[0].target).toBe('order-table');
    expect(linkage.directEffects[0].effect).toBe('data_reload');
    expect(linkage.directEffects[0].result).toBe('pass');
  });

  // --- Hierarchy: effective visibility ---
  test('tax-input visibility follows modal state', async ({ page }) => {
    await page.probe.click('create-order-btn');
    await page.probe.waitForState('create-order-modal', 'open');

    // Walks parent chain: tax-input -> order-form -> create-order-modal -> order-page
    const visible = await page.probe.isEffectivelyVisible('tax-input');
    expect(visible).toBe(true);
  });

  // --- Session tracking: dirty form ---
  test('form tracks dirty state after input', async ({ page }) => {
    await page.probe.click('create-order-btn');
    await page.probe.waitForState('create-order-modal', 'open');

    const formBefore = await page.probe.query('order-form');
    expect(formBefore.session.isDirty).toBe(false);

    await page.probe.fill('customer-input', 'Acme Corp');

    const formAfter = await page.probe.query('order-form');
    expect(formAfter.session.isDirty).toBe(true);
  });

  // --- Responsive: device preset ---
  test('table renders correctly on mobile', async ({ page }) => {
    await page.probe.setDevice('iphone-15-pro');

    const table = await page.probe.query('order-table');
    expect(table.layout.width).toBeLessThanOrEqual(393);
    expect(table.layout.visible).toBe(true);
  });

  // --- Snapshot + Diff: regression detection ---
  test('pagination changes data without breaking layout', async ({ page }) => {
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

  // --- Multi-device matrix ---
  test('order page works across devices', async ({ page }) => {
    const results = await page.probe.runAcrossDevices(
      ['iphone-15-pro', 'ipad-air', 'desktop-1080p'],
      async (probe) => {
        await probe.waitForPageReady();
        const table = await probe.query('order-table');
        expect(table.state.current).toBe('loaded');
        expect(table.layout.visible).toBe(true);

        const filter = await probe.query('status-filter');
        expect(filter.state.current).not.toBe('disabled');
      }
    );

    for (const [device, result] of Object.entries(results)) {
      expect(result.passed, `Failed on ${device}`).toBe(true);
    }
  });

  // --- Keyboard shortcut ---
  test('Ctrl+N opens create order modal', async ({ page }) => {
    await page.probe.pressShortcut('Ctrl+N');
    await page.probe.waitForState('create-order-modal', 'open');

    const modal = await page.probe.query('create-order-modal');
    expect(modal.state.isOpen).toBe(true);
    expect(modal.animation.name).toBe('fade-in');
  });
});
