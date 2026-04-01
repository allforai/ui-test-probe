import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_test_probe/ui_test_probe.dart';

import 'package:probe_conformance_flutter/conformance_runner.dart';

/// Minimal order management widget that registers all 8 elements from
/// example-app.json so the registry vectors can find them.
class _MinimalOrderApp extends StatelessWidget {
  const _MinimalOrderApp();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: ProbeWidget(
        id: 'order-management-page',
        type: ProbeType.page,
        child: Scaffold(
          body: SingleChildScrollView(
            child: Column(
              children: [
                ProbeWidget(
                  id: 'order-table',
                  type: ProbeType.dataContainer,
                  source: 'GET /api/orders',
                  child: const SizedBox(width: 400, height: 200, child: Placeholder()),
                ),
                ProbeWidget(
                  id: 'status-filter',
                  type: ProbeType.selector,
                  linkage: const [
                    LinkagePath(
                      targetId: 'order-table',
                      effect: LinkageEffect.dataReload,
                    ),
                  ],
                  child: const SizedBox(width: 200, height: 40, child: Placeholder()),
                ),
                ProbeWidget(
                  id: 'order-paginator',
                  type: ProbeType.navigation,
                  linkage: const [
                    LinkagePath(
                      targetId: 'order-table',
                      effect: LinkageEffect.dataReload,
                    ),
                  ],
                  child: const SizedBox(width: 200, height: 40, child: Placeholder()),
                ),
                ProbeWidget(
                  id: 'create-order-btn',
                  type: ProbeType.action,
                  child: const SizedBox(
                    width: 160,
                    height: 40,
                    child: Placeholder(),
                  ),
                ),
                // Modal and form elements — registered directly in the tree
                // so registry vectors can find them without needing a dialog.
                ProbeWidget(
                  id: 'create-order-modal',
                  type: ProbeType.modal,
                  state: const {'loaded': true},
                  child: Column(
                    children: [
                      ProbeWidget(
                        id: 'customer-input',
                        type: ProbeType.form,
                        child: const SizedBox(
                          width: 200,
                          height: 40,
                          child: Placeholder(),
                        ),
                      ),
                      ProbeWidget(
                        id: 'amount-input',
                        type: ProbeType.form,
                        child: const SizedBox(
                          width: 200,
                          height: 40,
                          child: Placeholder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

void main() {
  // IDs that reference elements only present when a dialog is open.
  // We include them in the tree, so none need to be skipped now.
  const Set<String> skipIds = {};

  testWidgets('conformance: primitive-registry vectors', (tester) async {
    // Build the minimal widget tree.
    await tester.pumpWidget(const _MinimalOrderApp());
    await tester.pumpAndSettle();

    final binding = ProbeBinding.ensureInitialized();
    binding.scan();

    final runner = ConformanceRunner(binding);

    // Resolve the vector file relative to this test file's package root.
    final scriptDir = Directory.current.path;
    // When run with `flutter test` the cwd is the package root.
    final vectorPath =
        '$scriptDir/../vectors/primitive-registry.json';

    final vectors = runner.loadVectors(vectorPath);

    int passed = 0;
    int skipped = 0;
    final failures = <String>[];

    for (final vector in vectors) {
      final id = vector['id'] as String;
      final name = vector['name'] as String;

      if (skipIds.contains(id)) {
        skipped++;
        // ignore: avoid_print
        print('[SKIP] $id: $name');
        continue;
      }

      final result = runner.runPrimitive(vector);
      if (result['passed'] == true) {
        passed++;
        // ignore: avoid_print
        print('[PASS] $id: $name');
      } else {
        failures.add('$id ($name): ${result['error']}');
        // ignore: avoid_print
        print('[FAIL] $id: $name — ${result['error']}');
      }
    }

    // ignore: avoid_print
    print('\nResults: $passed passed, ${failures.length} failed, $skipped skipped '
        'out of ${vectors.length} vectors');

    expect(
      failures,
      isEmpty,
      reason: 'Conformance failures:\n${failures.join('\n')}',
    );
  });
}
