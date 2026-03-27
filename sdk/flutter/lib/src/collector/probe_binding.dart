import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import '../annotations/probe_types.dart';
import '../annotations/probe_widget.dart';

/// A binding extension that scans the widget tree for [ProbeWidget] instances
/// and maintains a live registry of [ProbeElement] objects.
///
/// Injected at test time to enable semantic querying without coupling
/// production code to test infrastructure.
class ProbeBinding extends WidgetsFlutterBinding {
  /// Singleton instance.
  static ProbeBinding? _instance;

  /// Initialize the probe binding. Call once before runApp() in test setup.
  static ProbeBinding ensureInitialized() {
    _instance ??= ProbeBinding();
    return _instance!;
  }

  /// Internal registry of discovered probe elements.
  final Map<String, ProbeElement> _registry = {};

  /// Expose the registry for read access (used by StateObserver, etc.).
  Map<String, ProbeElement> get registry =>
      Map<String, ProbeElement>.unmodifiable(_registry);

  /// Scan the current widget tree and rebuild the probe registry.
  ///
  /// Walks the element tree looking for [ProbeWidget] instances and
  /// extracts their metadata into [ProbeElement] objects.
  void scan() {
    _registry.clear();

    final rootElement = WidgetsBinding.instance.rootElement;
    if (rootElement == null) return;

    void visitor(Element element) {
      final widget = element.widget;
      if (widget is ProbeWidget) {
        final probeElement = _extractProbeElement(widget, element);
        _registry[probeElement.id] = probeElement;
      }
      element.visitChildren(visitor);
    }

    rootElement.visitChildren(visitor);
  }

  /// Extract a [ProbeElement] from a [ProbeWidget] and its [Element].
  ProbeElement _extractProbeElement(ProbeWidget widget, Element element) {
    // Compute bounding box from RenderObject if available.
    List<double>? bounds;
    bool isVisible = true;
    final renderObject = element.findRenderObject();
    if (renderObject is RenderBox && renderObject.hasSize) {
      final size = renderObject.size;
      try {
        final offset = renderObject.localToGlobal(Offset.zero);
        bounds = [offset.dx, offset.dy, size.width, size.height];
      } catch (_) {
        bounds = [0, 0, size.width, size.height];
      }
    }

    // Attempt to determine visibility from Semantics / RenderObject.
    if (renderObject != null) {
      final semantics = renderObject.debugSemantics;
      if (semantics != null && !semantics.isInvisible) {
        isVisible = true;
      }
    }

    // Walk up to find parent ProbeWidget id.
    String? parentId;
    element.visitAncestorElements((ancestor) {
      if (ancestor.widget is ProbeWidget) {
        parentId = (ancestor.widget as ProbeWidget).id;
        return false; // stop
      }
      return true; // keep going
    });

    // Determine enabled state from widget state map.
    final isEnabled = widget.state['enabled'] != false &&
        widget.state['disabled'] != true;

    return ProbeElement(
      id: widget.id,
      type: widget.type,
      label: widget.label,
      state: Map<String, dynamic>.from(widget.state),
      source: widget.source,
      linkage: List<LinkagePath>.from(widget.linkage),
      bounds: bounds,
      isVisible: isVisible,
      isEnabled: isEnabled,
      parentId: parentId,
    );
  }

  /// Query a single probe element by its ID.
  ///
  /// Returns `null` if no element with [probeId] is found.
  ProbeElement? query(String probeId) {
    return _registry[probeId];
  }

  /// Query all probe elements matching a predicate.
  ///
  /// If [type] is provided, only elements of that type are returned.
  /// If [screen] is provided, only elements on that screen are returned.
  List<ProbeElement> queryAll({ProbeType? type, String? screen}) {
    return _registry.values.where((element) {
      if (type != null && element.type != type) return false;
      if (screen != null && element.screen != screen) return false;
      return true;
    }).toList();
  }

  /// Wait for a probe element to reach a specific state.
  ///
  /// Returns the [ProbeElement] once the [stateKey] equals [stateValue],
  /// or throws a timeout after [timeout].
  Future<ProbeElement> waitForState(
    String probeId, {
    required String stateKey,
    required dynamic stateValue,
    Duration timeout = const Duration(seconds: 5),
  }) async {
    final deadline = DateTime.now().add(timeout);
    const pollInterval = Duration(milliseconds: 50);

    while (DateTime.now().isBefore(deadline)) {
      scan();
      final element = _registry[probeId];
      if (element != null && element.state[stateKey] == stateValue) {
        return element;
      }
      await Future<void>.delayed(pollInterval);
    }

    throw TimeoutException(
      'Timed out waiting for $probeId state "$stateKey" to equal $stateValue',
    );
  }

  /// Get the data source associated with a probe element.
  ///
  /// Returns the source URI/identifier, or `null` if not set.
  String? getSource(String probeId) {
    return _registry[probeId]?.source;
  }

  /// Find the Element in the tree for a given probe ID.
  ///
  /// Returns `null` if not found. Used by ActionDispatcher.
  Element? findElementByProbeId(String probeId) {
    final rootElement = WidgetsBinding.instance.rootElement;
    if (rootElement == null) return null;

    Element? found;
    void visitor(Element element) {
      if (found != null) return;
      final widget = element.widget;
      if (widget is ProbeWidget && widget.id == probeId) {
        found = element;
        return;
      }
      element.visitChildren(visitor);
    }

    rootElement.visitChildren(visitor);
    return found;
  }
}

/// Exception thrown when a wait operation times out.
class TimeoutException implements Exception {
  final String message;
  const TimeoutException(this.message);

  @override
  String toString() => 'TimeoutException: $message';
}
