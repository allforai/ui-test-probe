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

  ProbeTester(this.tester);

  /// Query a single probe element by ID.
  ///
  /// Returns the [ProbeElement] or throws if not found.
  ProbeElement query(String probeId) {
    // TODO: scan widget tree via ProbeBinding and return element
    throw UnimplementedError('ProbeTester.query() not yet implemented');
  }

  /// Query all probe elements, optionally filtered by [type] or [screen].
  List<ProbeElement> queryAll({ProbeType? type, String? screen}) {
    // TODO: delegate to ProbeBinding.queryAll()
    throw UnimplementedError('ProbeTester.queryAll() not yet implemented');
  }

  /// Wait for the current page/route to be fully rendered and idle.
  ///
  /// Pumps frames until no pending timers, animations, or microtasks remain,
  /// then verifies all probe elements on screen report stable states.
  Future<void> waitForPageReady({
    Duration timeout = const Duration(seconds: 5),
  }) async {
    // TODO: pumpAndSettle + probe state stability check
    throw UnimplementedError('ProbeTester.waitForPageReady() not yet implemented');
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
    // TODO: tap element, pump, poll for state match
    throw UnimplementedError('ProbeTester.actAndWait() not yet implemented');
  }

  /// Set the simulated device profile for responsive testing.
  ///
  /// Adjusts the test surface size and pixel ratio to match [device].
  Future<void> setDevice(DeviceProfile device) async {
    // TODO: configure tester binding surface size
    throw UnimplementedError('ProbeTester.setDevice() not yet implemented');
  }

  /// Run a test callback across multiple device profiles.
  ///
  /// Executes [testBody] once per device in [devices], resetting
  /// the surface between runs.
  Future<void> runAcrossDevices(
    List<DeviceProfile> devices,
    Future<void> Function(DeviceProfile device) testBody,
  ) async {
    // TODO: iterate devices, setDevice, run testBody, reset
    throw UnimplementedError('ProbeTester.runAcrossDevices() not yet implemented');
  }
}
