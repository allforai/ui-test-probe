import 'dart:async';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';
import '../annotations/probe_types.dart';
import 'probe_binding.dart';

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

  /// The binding to observe.
  final ProbeBinding _binding;

  /// Snapshot of previous state maps keyed by probe ID.
  Map<String, Map<String, dynamic>> _previousStates = {};

  /// Whether the observer is currently active.
  bool _observing = false;

  StateObserver(this._binding);

  /// Stream of state change events across all probe elements.
  Stream<ProbeStateEvent> get events => _controller.stream;

  /// Start observing state changes in the widget tree.
  ///
  /// Hooks into the post-frame callback to diff state maps after each frame.
  void startObserving() {
    if (_observing) return;
    _observing = true;

    // Capture the initial state snapshot.
    _binding.scan();
    _captureSnapshot();

    // Register a persistent frame callback to diff after each frame.
    WidgetsBinding.instance.addPersistentFrameCallback(_onFrame);
  }

  /// Stop observing and clean up resources.
  void stopObserving() {
    _observing = false;
    // Note: persistent frame callbacks cannot be removed in Flutter,
    // so we guard with the _observing flag.
  }

  /// Frame callback that rescans and diffs state.
  void _onFrame(Duration timestamp) {
    if (!_observing || _controller.isClosed) return;

    _binding.scan();
    final currentRegistry = _binding.registry;
    final now = DateTime.now();

    for (final entry in currentRegistry.entries) {
      final probeId = entry.key;
      final currentState = entry.value.state;
      final previousState = _previousStates[probeId] ?? {};

      // Check for changed or new keys.
      for (final stateEntry in currentState.entries) {
        final key = stateEntry.key;
        final currentValue = stateEntry.value;
        final previousValue = previousState[key];

        if (currentValue != previousValue) {
          _controller.add(ProbeStateEvent(
            probeId: probeId,
            key: key,
            previousValue: previousValue,
            currentValue: currentValue,
            timestamp: now,
          ));
        }
      }

      // Check for removed keys.
      for (final key in previousState.keys) {
        if (!currentState.containsKey(key)) {
          _controller.add(ProbeStateEvent(
            probeId: probeId,
            key: key,
            previousValue: previousState[key],
            currentValue: null,
            timestamp: now,
          ));
        }
      }
    }

    _captureSnapshot();
  }

  /// Capture the current state as the baseline for next diff.
  void _captureSnapshot() {
    _previousStates = {};
    for (final entry in _binding.registry.entries) {
      _previousStates[entry.key] = Map<String, dynamic>.from(entry.value.state);
    }
  }

  /// Wait for a specific state event matching the predicate.
  Future<ProbeStateEvent> waitForEvent(
    bool Function(ProbeStateEvent) predicate, {
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final completer = Completer<ProbeStateEvent>();
    late StreamSubscription<ProbeStateEvent> subscription;

    final timer = Timer(timeout, () {
      if (!completer.isCompleted) {
        subscription.cancel();
        completer.completeError(
          TimeoutException('Timed out waiting for matching state event'),
        );
      }
    });

    subscription = _controller.stream.where(predicate).listen((event) {
      if (!completer.isCompleted) {
        timer.cancel();
        subscription.cancel();
        completer.complete(event);
      }
    });

    return completer.future;
  }

  /// Dispose the observer and close the stream.
  void dispose() {
    _observing = false;
    _controller.close();
  }
}
