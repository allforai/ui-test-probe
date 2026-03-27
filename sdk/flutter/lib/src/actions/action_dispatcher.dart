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

  /// Tap a probe element.
  ///
  /// Pre-checks: element must be visible and enabled.
  Future<ActionResult> tap(String probeId) async {
    // TODO: validate element state, perform tap, return result
    throw UnimplementedError('ActionDispatcher.tap() not yet implemented');
  }

  /// Fill a text input probe element with [text].
  ///
  /// Pre-checks: element must be of type [ProbeType.input], visible, and enabled.
  Future<ActionResult> fill(String probeId, String text) async {
    // TODO: validate input type, clear existing, enter text
    throw UnimplementedError('ActionDispatcher.fill() not yet implemented');
  }

  /// Select a value from a probe element (dropdown, picker, radio group).
  ///
  /// Pre-checks: element must be visible and enabled.
  Future<ActionResult> select(String probeId, dynamic value) async {
    // TODO: validate element, perform selection
    throw UnimplementedError('ActionDispatcher.select() not yet implemented');
  }

  /// Perform an action and wait for a state change on the target or a linked element.
  ///
  /// Executes [action] on [probeId], then waits for [expectStateKey] to
  /// equal [expectStateValue] on [waitForProbeId] (defaults to [probeId]).
  Future<ActionResult> actAndWait(
    String probeId, {
    required Future<void> Function() action,
    String? waitForProbeId,
    required String expectStateKey,
    required dynamic expectStateValue,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    // TODO: execute action, poll for state change with timeout
    throw UnimplementedError('ActionDispatcher.actAndWait() not yet implemented');
  }

  /// Verify that a probe element's linkage produces the expected effect.
  ///
  /// Activates the element and checks that linked targets transition
  /// according to their declared [LinkageEffect].
  Future<bool> verifyLinkage(String probeId) async {
    // TODO: resolve linkage paths, trigger, verify effects
    throw UnimplementedError('ActionDispatcher.verifyLinkage() not yet implemented');
  }
}
