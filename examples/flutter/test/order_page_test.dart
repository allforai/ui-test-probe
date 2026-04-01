import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_test_probe/ui_test_probe.dart';
import 'package:ui_test_probe_flutter_test/ui_test_probe_flutter_test.dart';
import 'package:flutter_probe_example/order_page.dart';

void main() {
  group('OrderPage — probe integration tests', () {
    testWidgets('page loads and all elements register', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.pumpAndSettle();

      final pt = tester.probeTester;
      await pt.waitForPageReady();

      final page = pt.query('order-management-page');
      expect(page, isNotNull);
      expect(page.type, equals(ProbeType.page));

      final table = pt.query('order-table');
      expect(table, isNotNull);
      expect(table.type, equals(ProbeType.dataContainer));
      expect(table.source, equals('GET /api/orders'));
    });

    testWidgets('status filter is registered as selector', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.pumpAndSettle();

      final pt = tester.probeTester;
      await pt.waitForPageReady();

      final filter = pt.query('status-filter');
      expect(filter, isNotNull);
      expect(filter.type, equals(ProbeType.selector));

      // Verify linkage declared
      expect(filter.linkage, isNotEmpty);
      expect(filter.linkage.first.targetId, equals('order-table'));
      expect(filter.linkage.first.effect, equals(LinkageEffect.dataReload));
    });

    testWidgets('queryAll returns elements filtered by type', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.pumpAndSettle();

      final pt = tester.probeTester;
      await pt.waitForPageReady();

      final allElements = pt.queryAll();
      expect(allElements.length, greaterThanOrEqualTo(4));

      final pages = pt.queryAll(type: ProbeType.page);
      expect(pages.length, equals(1));
      expect(pages.first.id, equals('order-management-page'));
    });

    testWidgets('create button is registered as action', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.pumpAndSettle();

      final pt = tester.probeTester;
      await pt.waitForPageReady();

      final btn = pt.query('create-order-btn');
      expect(btn, isNotNull);
      expect(btn.type, equals(ProbeType.action));
      expect(btn.isVisible, isTrue);
    });

    testWidgets('paginator is registered as navigation', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.pumpAndSettle();

      final pt = tester.probeTester;
      await pt.waitForPageReady();

      final paginator = pt.query('order-paginator');
      expect(paginator, isNotNull);
      expect(paginator.type, equals(ProbeType.navigation));
      expect(paginator.linkage, isNotEmpty);
      expect(paginator.linkage.first.targetId, equals('order-table'));
    });

    testWidgets('probe element has layout bounds', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.pumpAndSettle();

      final pt = tester.probeTester;
      await pt.waitForPageReady();

      final table = pt.query('order-table');
      expect(table, isNotNull);
      expect(table.bounds, isNotNull);
      // bounds is [x, y, width, height]
      expect(table.bounds![2], greaterThan(0)); // width
      expect(table.bounds![3], greaterThan(0)); // height
    });

    testWidgets('matchers work with probe elements', (tester) async {
      await tester.pumpWidget(const MaterialApp(home: OrderPage()));
      await tester.pumpAndSettle();

      final pt = tester.probeTester;
      await pt.waitForPageReady();

      final table = pt.query('order-table');
      expect(table, isNotNull);

      // Use probe matchers
      expect(table, hasProbeData({'type': ProbeType.dataContainer}));
      expect(table, hasProbeData({'source': 'GET /api/orders'}));
      expect(table, isEffectivelyVisible());
    });
  });
}
