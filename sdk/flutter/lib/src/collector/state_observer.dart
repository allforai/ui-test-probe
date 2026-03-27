import 'dart:async';
import '../annotations/probe_types.dart';

/// An event emitted when a probe element's state changes.
class ProbeStateEvent {
  /// The probe ID that changed.
  final String probeId;

  /// The state key that changed.
  final String key;

  /// The previous value (null if newly set).
  final dynamic previousValue;

  /// The current value.
  final dynamic currentValue;

  /// Timestamp of the change.
  final DateTime timestamp;

  const ProbeStateEvent({
    required this.probeId,
    required this.key,
    this.previousValue,
    required this.currentValue,
    required this.timestamp,
  });

  @override
  String toString() => 'ProbeStateEvent($probeId.$key: $previousValue -> $currentValue)';
}

/// Monitors [ProbeWidget] state changes and emits [ProbeStateEvent]s.
///
/// Attach to the [ProbeBinding] to receive a stream of state mutations
/// across all annotated probe elements.
class StateObserver {
  final StreamController<ProbeStateEvent> _controller =
      StreamController<ProbeStateEvent>.broadcast();

  /// Stream of state change events across all probe elements.
  Stream<ProbeStateEvent> get events => _controller.stream;

  /// Start observing state changes in the widget tree.
  void startObserving() {
    // TODO: hook into ProbeBinding rebuild cycle to diff state maps
    throw UnimplementedError('StateObserver.startObserving() not yet implemented');
  }

  /// Stop observing and clean up resources.
  void stopObserving() {
    // TODO: unhook observer
    throw UnimplementedError('StateObserver.stopObserving() not yet implemented');
  }

  /// Wait for a specific state event matching the predicate.
  Future<ProbeStateEvent> waitForEvent(
    bool Function(ProbeStateEvent) predicate, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    // TODO: implement filtered wait with timeout
    throw UnimplementedError('StateObserver.waitForEvent() not yet implemented');
  }

  /// Dispose the observer and close the stream.
  void dispose() {
    _controller.close();
  }
}
