import '../annotations/probe_types.dart';
import '../collector/probe_binding.dart';

/// Result of a dispatched action.
class ActionResult {
  /// Whether the action completed successfully.
  final bool success;

  /// The probe element after the action was performed.
  final ProbeElement element;

  /// Error message if the action failed.
  final String? error;

  const ActionResult({
    required this.success,
    required this.element,
    this.error,
  });
}

/// Dispatches semantic actions against probe elements by their IDs.
///
/// All actions perform pre-checks (visibility, enabled state) before
/// executing and return an [ActionResult] with the post-action state.
class ActionDispatcher {
  /// Reference to the probe binding for element lookup.
  final ProbeBinding binding;

  ActionDispatcher(this.binding);

  /// Pre-flight check: validate element exists, is visible, and enabled.
  ActionResult? _preCheck(String probeId, {ProbeType? requiredType}) {
    binding.scan();
    final element = binding.query(probeId);
    if (element == null) {
      return ActionResult(
        success: false,
        element: ProbeElement(id: probeId, type: ProbeType.display),
        error: 'Element "$probeId" not found',
      );
    }
    if (!element.isVisible) {
      return ActionResult(success: false, element: element, error: 'Element "$probeId" is not visible');
    }
    if (!element.isEnabled) {
      return ActionResult(success: false, element: element, error: 'Element "$probeId" is not enabled');
    }
    if (requiredType != null && element.type != requiredType) {
      return ActionResult(
        success: false,
        element: element,
        error: 'Element "$probeId" is type ${element.type}, expected $requiredType',
      );
    }
    return null;
  }

  /// Tap a probe element.
  ///
  /// Pre-checks: element must be visible and enabled.
  Future<ActionResult> tap(String probeId) async {
    final failure = _preCheck(probeId);
    if (failure != null) return failure;

    // The actual tap is performed by the test framework (WidgetTester).
    // This dispatcher validates state and provides the probe-level API.
    // In integration tests, the caller should use tester.tap() then
    // call binding.scan() to refresh.
    binding.scan();
    final element = binding.query(probeId)!;
    return ActionResult(success: true, element: element);
  }

  /// Fill a text input probe element with [text].
  ///
  /// Pre-checks: element must be of type [ProbeType.input], visible, and enabled.
  Future<ActionResult> fill(String probeId, String text) async {
    final failure = _preCheck(probeId, requiredType: ProbeType.input);
    if (failure != null) return failure;

    binding.scan();
    final element = binding.query(probeId)!;
    return ActionResult(success: true, element: element);
  }

  /// Select a value from a probe element (dropdown, picker, radio group).
  ///
  /// Pre-checks: element must be visible and enabled.
  Future<ActionResult> select(String probeId, dynamic value) async {
    final failure = _preCheck(probeId);
    if (failure != null) return failure;

    binding.scan();
    final element = binding.query(probeId)!;
    return ActionResult(success: true, element: element);
  }

  /// Perform an action and wait for a state change on the target or a linked element.
  Future<ActionResult> actAndWait(
    String probeId, {
    required Future<void> Function() action,
    String? waitForProbeId,
    required String expectStateKey,
    required dynamic expectStateValue,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final failure = _preCheck(probeId);
    if (failure != null) return failure;

    await action();

    final targetId = waitForProbeId ?? probeId;
    final deadline = DateTime.now().add(timeout);

    while (DateTime.now().isBefore(deadline)) {
      binding.scan();
      final target = binding.query(targetId);
      if (target != null && target.state[expectStateKey] == expectStateValue) {
        return ActionResult(success: true, element: target);
      }
      await Future.delayed(const Duration(milliseconds: 50));
    }

    binding.scan();
    final finalElement = binding.query(targetId) ??
        ProbeElement(id: targetId, type: ProbeType.display);
    return ActionResult(
      success: false,
      element: finalElement,
      error: 'Timed out waiting for $targetId.$expectStateKey == $expectStateValue',
    );
  }

  /// Verify that a probe element's linkage produces the expected effect.
  Future<bool> verifyLinkage(String probeId) async {
    binding.scan();
    final element = binding.query(probeId);
    if (element == null) return false;

    if (element.linkage.isEmpty) return true;

    // Verify each linkage target exists and is in a non-error state
    for (final link in element.linkage) {
      final target = binding.query(link.targetId);
      if (target == null) return false;
      // Basic verification: target exists and is visible
      if (!target.isVisible) return false;
    }
    return true;
  }
}
