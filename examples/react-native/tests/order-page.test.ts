import { device } from 'detox';
import { probe } from 'ui-test-probe/detox'; // ProbeAPI Detox extension

/**
 * Order Management Page — probe-driven Detox test suite.
 * Uses ProbeAPI extensions for event-driven, state-aware assertions
 * instead of waitFor + polling patterns.
 */
describe('OrderPage — probe integration tests', () => {

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('page loads and all elements register', async () => {
    // waitForPageReady — blocks until page state is 'loaded' and all
    // registered probe elements have completed initial data fetch.
    await probe.waitForPageReady('order-management-page');

    // query — returns the full ProbeElement for a registered control
    const list = await probe.query('order-list');
    expect(list).not.toBeNull();
    expect(list!.state.current).toBe('loaded');
    expect(list!.type).toBe('data-container');

    // source binding — verify the list knows its data origin
    expect(list!.source?.url).toBe('GET /api/orders');
  });

  it('status filter triggers list reload via linkage', async () => {
    await probe.waitForPageReady('order-management-page');

    // actAndWait — performs a semantic action on one element and waits
    // for the linked target to reach 'loaded' state. Event-driven, no sleep.
    await probe.actAndWait(
      'status-filter',         // trigger element
      'select:completed',      // semantic action: pick "completed"
      { target: 'order-list' } // wait for this element to settle
    );

    const list = await probe.query('order-list');
    expect(list!.state.current).toBe('loaded');

    // verifyLinkage — validates the full cause-effect chain:
    // returns directEffects, chainedEffects, and apiCalls
    const linkage = await probe.verifyLinkage(
      'status-filter',
      'select:completed',
    );
    expect(linkage.directEffects).toHaveLength(1);
    expect(linkage.directEffects[0].target).toBe('order-list');
    expect(linkage.directEffects[0].result).toBe('pass');
    // Verify the API was called with the correct filter
    expect(linkage.apiCalls).toHaveLength(1);
    expect(linkage.apiCalls[0].url).toContain('status=completed');
    expect(linkage.apiCalls[0].status).toBe(200);
  });

  it('paginator triggers list reload', async () => {
    await probe.waitForPageReady('order-management-page');

    await probe.actAndWait(
      'order-paginator',
      'next-page',
      { target: 'order-list' },
    );

    const list = await probe.query('order-list');
    expect(list!.state.current).toBe('loaded');

    const paginator = await probe.query('order-paginator');
    expect(paginator!.data.value).toBe(2); // now on page 2
  });

  it('create order modal — open, fill, validate, submit', async () => {
    await probe.waitForPageReady('order-management-page');

    // Open modal via action button
    await probe.actAndWait(
      'create-order-btn',
      'tap',
      { target: 'create-order-modal' },
    );

    // isEffectivelyVisible — walks the parent chain to confirm true visibility.
    // A child may report visible=true, but if its parent (e.g., overlay) is
    // hidden, this correctly returns false.
    const visible = await probe.isEffectivelyVisible('create-order-modal');
    expect(visible).toBe(true);

    // Verify animation completed (slide-up finished)
    const modal = await probe.query('create-order-modal');
    expect(modal!.animation?.playing).toBe(false);
    expect(modal!.state.isOpen).toBe(true);

    // Session tracking — form starts clean
    expect(modal!.session?.isDirty).toBe(false);

    // Fill form fields — triggers session dirty tracking
    await probe.actAndWait('customer-input', 'type:Acme Corp');
    await probe.actAndWait('amount-input', 'type:1500');

    // Session is now dirty (unsaved changes)
    const dirtyModal = await probe.query('create-order-modal');
    expect(dirtyModal!.session?.isDirty).toBe(true);

    // Validation — check for errors on form fields
    const amountInput = await probe.query('amount-input');
    expect(amountInput!.state.validationErrors ?? []).toHaveLength(0);
  });

  it('responsive layout — multi-device matrix', async () => {
    // setDevice — configures simulator/emulator viewport to match a
    // built-in device preset. React Native adjusts Dimensions accordingly.
    await probe.setDevice('iphone-15-pro');
    await probe.waitForPageReady('order-management-page');

    const list = await probe.query('order-list');
    expect(list!.layout.width).toBeLessThanOrEqual(393);

    // runAcrossDevices — runs the same test closure on multiple device
    // presets, collecting pass/fail per device. One test, full coverage.
    const results = await probe.runAcrossDevices(
      ['iphone-15-pro', 'pixel-8', 'ipad-air', 'desktop-1080p'],
      async (p) => {
        await p.waitForPageReady('order-management-page');
        const tbl = await p.query('order-list');
        expect(tbl).not.toBeNull();
        expect(tbl!.state.current).toBe('loaded');
        // Tablet/desktop should render wider layout
        const ctx = p.getPlatformContext();
        if (ctx.device.formFactor === 'tablet' || ctx.device.formFactor === 'desktop') {
          expect(tbl!.layout.width).toBeGreaterThan(600);
        }
      },
    );

    // All devices should pass
    for (const [deviceName, result] of Object.entries(results)) {
      expect(result.passed).toBe(true);
    }
  });
});
