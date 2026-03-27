import { test, expect } from '@playwright/test';

// UI Test Probe -- Playwright integration reference
// All probe methods are accessed via page.probe.* (injected by the
// @allforai/ui-test-probe-playwright plugin during fixture setup).

test.describe('Order Page -- Probe API', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/orders');
    // Event-driven page readiness -- replaces arbitrary sleep/waitForSelector
    await page.probe.waitForPageReady();
  });

  // --- Element Registry: semantic query ---
  test('table loads with correct state and source', async ({ page }) => {
    const table = await page.probe.query('order-table');

    expect(table).not.toBeNull();
    expect(table.state.current).toBe('loaded');
    expect(table.data.rows).toBeGreaterThanOrEqual(1);
    // Source binding -- verify the API call behind the table
    expect(table.source.url).toBe('/api/orders');
    expect(table.source.status).toBe(200);
  });

  // --- Action Dispatch + Event Stream: act-and-wait ---
  test('status filter reloads table via API linkage', async ({ page }) => {
    // actAndWait: select value + wait for linked target to reach state
    const result = await page.probe.actAndWait(
      'status-filter',
      'select:completed',
      { target: 'order-table', state: 'loaded' }
    );

    // Verify the linkage chain completed successfully
    expect(result.linkageResults.directEffects[0].target).toBe('order-table');
    expect(result.linkageResults.directEffects[0].result).toBe('pass');
    // API call was made with correct filter parameter
    expect(result.linkageResults.apiCalls[0].url).toContain('status=completed');
    expect(result.linkageResults.apiCalls[0].status).toBe(200);
  });

  // --- Linkage verification: full chain inspection ---
  test('filter-to-table linkage is correctly wired', async ({ page }) => {
    const linkage = await page.probe.verifyLinkage('status-filter', 'select:completed');

    expect(linkage.trigger).toBe('status-filter');
    expect(linkage.directEffects).toHaveLength(1);
    expect(linkage.directEffects[0].target).toBe('order-table');
    expect(linkage.directEffects[0].effect).toBe('data_reload');
    expect(linkage.directEffects[0].result).toBe('pass');
  });

  // --- Hierarchy: effective visibility ---
  test('tax-input is visible when modal is open', async ({ page }) => {
    await page.probe.click('create-order-btn');
    // Wait for modal animation to finish
    await page.probe.waitForState('create-order-modal', 'open');

    // isEffectivelyVisible walks the parent chain:
    // tax-input -> order-form -> create-order-modal (open) -> order-page (visible) = true
    const visible = await page.probe.isEffectivelyVisible('tax-input');
    expect(visible).toBe(true);
  });

  // --- Session tracking: dirty form detection ---
  test('form tracks dirty state after input', async ({ page }) => {
    await page.probe.click('create-order-btn');
    await page.probe.waitForState('create-order-modal', 'open');

    // Before input -- form is clean
    const formBefore = await page.probe.query('order-form');
    expect(formBefore.session.isDirty).toBe(false);

    // Type into customer field
    await page.probe.fill('customer-input', 'Acme Corp');

    // After input -- form is dirty
    const formAfter = await page.probe.query('order-form');
    expect(formAfter.session.isDirty).toBe(true);
  });

  // --- Responsive: device preset ---
  test('table renders correctly on mobile', async ({ page }) => {
    await page.probe.setDevice('iphone-15-pro');

    const table = await page.probe.query('order-table');
    // On mobile, layout width should fit within 393px viewport
    expect(table.layout.width).toBeLessThanOrEqual(393);
    expect(table.layout.visible).toBe(true);
  });

  // --- Snapshot + Diff: regression detection ---
  test('paginator changes table data without breaking layout', async ({ page }) => {
    const before = await page.probe.snapshot();

    await page.probe.actAndWait(
      'order-paginator',
      'click:next',
      { target: 'order-table', state: 'loaded' }
    );

    const after = await page.probe.snapshot();
    const changes = page.probe.diff(before, after);

    // Only data should change, not layout or structure
    const dataChanges = changes.filter((c) => c.property.startsWith('data.'));
    const layoutChanges = changes.filter((c) => c.property.startsWith('layout.'));
    expect(dataChanges.length).toBeGreaterThan(0);
    expect(layoutChanges.length).toBe(0);
  });

  // --- Multi-device matrix: run same test across breakpoints ---
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

    // All devices should pass
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
