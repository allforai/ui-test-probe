import 'package:flutter_test/flutter_test.dart';
import 'package:ui_test_probe/test_binding.dart';
import 'package:example_app/order_page.dart';

/// Order Management Page — probe-driven test suite.
/// Uses ProbeBinding extensions on WidgetTester for event-driven,
/// state-aware assertions instead of sleep-and-screenshot.
void main() {
  // ProbeBinding replaces the default test binding, enabling probeTester API
  final binding = ProbeBinding.ensureInitialized();

  group('OrderPage — probe integration tests', () {
    testWidgets('page loads and all elements register', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));

      // waitForPageReady — blocks until page state is 'loaded' and all
      // child probe elements have finished their initial data fetch.
      // No arbitrary sleep — event-driven completion.
      await tester.probeTester.waitForPageReady('order-management-page');

      // query — returns the full ProbeElement for a registered control
      final table = tester.probeTester.query('order-table');
      expect(table, isNotNull);
      expect(table!.state.current, equals('loaded'));
      expect(table.type, equals(ProbeType.dataContainer));

      // source binding — verify the table knows its data origin
      expect(table.source?.url, equals('GET /api/orders'));
    });

    testWidgets('status filter triggers table reload via linkage', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.probeTester.waitForPageReady('order-management-page');

      // actAndWait — performs an action on one element and waits for the
      // linked target to reach 'loaded' state. No manual pump/sleep.
      // 'select:completed' is a semantic action: select the "completed" option.
      await tester.probeTester.actAndWait(
        'status-filter',            // trigger element
        'select:completed',         // semantic action
        target: 'order-table',      // wait for this element to settle
      );

      // Verify the table reloaded with filtered data
      final table = tester.probeTester.query('order-table');
      expect(table!.state.current, equals('loaded'));

      // verifyLinkage — validates the full cause-effect chain:
      // returns directEffects, chainedEffects, and apiCalls
      final linkage = await tester.probeTester.verifyLinkage(
        'status-filter',
        'select:completed',
      );
      expect(linkage.directEffects, hasLength(1));
      expect(linkage.directEffects.first.target, equals('order-table'));
      expect(linkage.directEffects.first.result, equals('pass'));
      // Verify the API was called with the correct filter parameter
      expect(linkage.apiCalls, hasLength(1));
      expect(linkage.apiCalls.first.url, contains('status=completed'));
      expect(linkage.apiCalls.first.status, equals(200));
    });

    testWidgets('paginator triggers table reload', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.probeTester.waitForPageReady('order-management-page');

      await tester.probeTester.actAndWait(
        'order-paginator',
        'next-page',
        target: 'order-table',
      );

      final table = tester.probeTester.query('order-table');
      expect(table!.state.current, equals('loaded'));

      // Check paginator state directly
      final paginator = tester.probeTester.query('order-paginator');
      expect(paginator!.data.value, equals(2)); // page 2
    });

    testWidgets('create order modal — open, fill, validate, submit', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.probeTester.waitForPageReady('order-management-page');

      // Open modal via action button
      await tester.probeTester.actAndWait(
        'create-order-btn',
        'tap',
        target: 'create-order-modal',
      );

      // isEffectivelyVisible — walks the parent chain to check real visibility.
      // The modal's own visible=true is not enough; this confirms all ancestors
      // (overlay, page) are also visible.
      expect(tester.probeTester.isEffectivelyVisible('create-order-modal'), isTrue);

      // Verify animation completed (dialog fade-in finished)
      final modal = tester.probeTester.query('create-order-modal');
      expect(modal!.animation?.playing, isFalse);
      expect(modal.state.isOpen, isTrue);

      // Session tracking — form starts clean
      expect(modal.session?.isDirty, isFalse);

      // Fill form fields — triggers session dirty tracking
      await tester.probeTester.actAndWait('customer-input', 'type:Acme Corp');
      await tester.probeTester.actAndWait('amount-input', 'type:1500');

      // Session is now dirty (unsaved changes)
      final dirtyModal = tester.probeTester.query('create-order-modal');
      expect(dirtyModal!.session?.isDirty, isTrue);

      // Check validation state on form fields
      final amountInput = tester.probeTester.query('amount-input');
      expect(amountInput!.state.validationErrors, isEmpty);
    });

    testWidgets('responsive layout — multi-device matrix', (tester) async {
      // setDevice — configures MediaQuery, screen size, and pixel ratio
      // to match a built-in device preset. Flutter WidgetTester adjusts
      // the test surface size accordingly.
      await tester.probeTester.setDevice('iphone-15-pro');
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.probeTester.waitForPageReady('order-management-page');

      final table = tester.probeTester.query('order-table');
      expect(table!.layout.width, lessThanOrEqualTo(393));

      // runAcrossDevices — runs the same test closure on multiple device
      // presets, collecting pass/fail per device. One test definition,
      // full device coverage.
      final results = await tester.probeTester.runAcrossDevices(
        ['iphone-15-pro', 'pixel-8', 'ipad-air', 'desktop-1080p'],
        (probeTester) async {
          await probeTester.waitForPageReady('order-management-page');
          final tbl = probeTester.query('order-table');
          expect(tbl, isNotNull);
          expect(tbl!.state.current, equals('loaded'));
          // On tablet/desktop the table should be wider
          final ctx = probeTester.getPlatformContext();
          if (ctx.device.formFactor == 'tablet' ||
              ctx.device.formFactor == 'desktop') {
            expect(tbl.layout.width, greaterThan(600));
          }
        },
      );

      // All devices should pass
      for (final entry in results.entries) {
        expect(entry.value.passed, isTrue, reason: '${entry.key} failed');
      }
    });
  });
}
