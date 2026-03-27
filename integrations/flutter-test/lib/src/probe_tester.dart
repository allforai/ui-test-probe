import 'dart:ui';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:ui_test_probe/ui_test_probe.dart';

/// Extension on [WidgetTester] that adds probe-aware testing capabilities.
///
/// Usage:
/// ```dart
/// testWidgets('login flow', (tester) async {
///   await tester.pumpWidget(MyApp());
///   final probe = tester.probeTester;
///
///   final button = probe.query('login-submit');
///   await probe.actAndWait('login-submit', expectState: {'loading': false});
/// });
/// ```
extension ProbeTesterExtension on WidgetTester {
  /// Access the probe testing API for this widget tester.
  ProbeTester get probeTester => ProbeTester(this);
}

/// Probe-aware test helper wrapping a [WidgetTester].
class ProbeTester {
  /// The underlying widget tester.
  final WidgetTester tester;

  /// Lazily-resolved probe binding.
  ProbeBinding? _binding;

  ProbeTester(this.tester);

  /// Get or create the ProbeBinding singleton.
  ProbeBinding get _probeBinding {
    _binding ??= ProbeBinding.ensureInitialized();
    return _binding!;
  }

  /// Query a single probe element by ID.
  ///
  /// Returns the [ProbeElement] or throws if not found.
  ProbeElement query(String probeId) {
    _probeBinding.scan();
    final element = _probeBinding.query(probeId);
    if (element == null) {
      throw StateError('Probe element "$probeId" not found in the widget tree');
    }
    return element;
  }

  /// Query all probe elements, optionally filtered by [type] or [screen].
  List<ProbeElement> queryAll({ProbeType? type, String? screen}) {
    _probeBinding.scan();
    return _probeBinding.queryAll(type: type, screen: screen);
  }

  /// Wait for the current page/route to be fully rendered and idle.
  ///
  /// Pumps frames until no pending timers, animations, or microtasks remain,
  /// then verifies all probe elements on screen report stable states.
  Future<void> waitForPageReady({
    Duration timeout = const Duration(seconds: 5),
  }) async {
    // First, pump until the framework settles (no pending timers/animations).
    await tester.pumpAndSettle(
      const Duration(milliseconds: 100),
      EnginePhase.sendSemanticsUpdate,
      timeout,
    );

    // Then verify probe state stability: scan twice with a frame in between
    // and ensure no state changes occurred.
    _probeBinding.scan();
    final firstSnapshot = Map<String, Map<String, dynamic>>.fromEntries(
      _probeBinding.registry.entries.map(
        (e) => MapEntry(e.key, Map<String, dynamic>.from(e.value.state)),
      ),
    );

    await tester.pump(const Duration(milliseconds: 100));
    _probeBinding.scan();

    final secondSnapshot = _probeBinding.registry;
    for (final entry in secondSnapshot.entries) {
      final prev = firstSnapshot[entry.key];
      if (prev == null) continue;
      final curr = entry.value.state;
      // Check for transient states like 'loading: true'.
      if (curr['loading'] == true || curr['submitting'] == true) {
        // Still transitioning -- pump more frames.
        await tester.pumpAndSettle(
          const Duration(milliseconds: 100),
          EnginePhase.sendSemanticsUpdate,
          timeout,
        );
        break;
      }
    }
  }

  /// Perform an action on a probe element and wait for an expected state.
  ///
  /// Taps [probeId] (or performs a custom action), then waits for the
  /// element (or [waitForId]) to reach [expectState].
  Future<ProbeElement> actAndWait(
    String probeId, {
    String? waitForId,
    required Map<String, dynamic> expectState,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    // Find and tap the probe widget.
    _probeBinding.scan();
    final treeElement = _probeBinding.findElementByProbeId(probeId);
    if (treeElement == null) {
      throw StateError('Probe element "$probeId" not found for tap');
    }

    // Use the widget tester to perform the tap on the Semantics widget.
    final finder = find.byElementPredicate(
      (element) => element.widget is ProbeWidget &&
          (element.widget as ProbeWidget).id == probeId,
    );
    await tester.tap(finder);
    await tester.pump();

    // Now poll for the expected state on the target element.
    final targetId = waitForId ?? probeId;
    final deadline = DateTime.now().add(timeout);

    while (DateTime.now().isBefore(deadline)) {
      _probeBinding.scan();
      final target = _probeBinding.query(targetId);
      if (target != null) {
        bool allMatch = true;
        for (final entry in expectState.entries) {
          if (target.state[entry.key] != entry.value) {
            allMatch = false;
            break;
          }
        }
        if (allMatch) return target;
      }

      await tester.pump(const Duration(milliseconds: 50));
    }

    throw TimeoutException(
      'Timed out waiting for $targetId to reach state $expectState',
    );
  }

  /// Set the simulated device profile for responsive testing.
  ///
  /// Adjusts the test surface size and pixel ratio to match [device].
  Future<void> setDevice(DeviceProfile device) async {
    // Set the physical size based on device dimensions and pixel ratio.
    final binding = tester.binding;
    binding.setSurfaceSize(Size(device.width, device.height));
    binding.window.physicalSizeTestValue =
        Size(device.width * device.pixelRatio, device.height * device.pixelRatio);
    binding.window.devicePixelRatioTestValue = device.pixelRatio;

    await tester.pump();
  }

  /// Run a test callback across multiple device profiles.
  ///
  /// Executes [testBody] once per device in [devices], resetting
  /// the surface between runs.
  Future<void> runAcrossDevices(
    List<DeviceProfile> devices,
    Future<void> Function(DeviceProfile device) testBody,
  ) async {
    for (final device in devices) {
      await setDevice(device);
      await testBody(device);
    }

    // Reset to default after all devices.
    tester.binding.setSurfaceSize(null);
    tester.binding.window.clearPhysicalSizeTestValue();
    tester.binding.window.clearDevicePixelRatioTestValue();
    await tester.pump();
  }
}
