import 'package:flutter/widgets.dart';
import 'probe_types.dart';

/// A wrapper widget that annotates its child with probe metadata.
///
/// [ProbeWidget] attaches observable testing metadata to any widget subtree.
/// At test time, the [ProbeBinding] scans the widget tree for these wrappers
/// and builds a queryable registry of [ProbeElement] instances.
///
/// ```dart
/// ProbeWidget(
///   id: 'login-submit',
///   type: ProbeType.control,
///   state: {'enabled': true},
///   child: ElevatedButton(onPressed: _login, child: Text('Login')),
/// )
/// ```
class ProbeWidget extends StatelessWidget {
  /// Unique probe identifier. Must be unique within the current screen/route.
  final String id;

  /// Semantic type classification of this element.
  final ProbeType type;

  /// Data source URI or identifier (e.g., "api:/users", "local:cache").
  final String? source;

  /// Linkage paths describing how this element connects to others.
  final List<LinkagePath> linkage;

  /// Semantic state map (e.g., {"loading": true, "error": null}).
  final Map<String, dynamic> state;

  /// Human-readable label for this probe element.
  final String? label;

  /// The child widget to wrap.
  final Widget child;

  const ProbeWidget({
    super.key,
    required this.id,
    required this.type,
    this.source,
    this.linkage = const [],
    this.state = const {},
    this.label,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    // Encode probe metadata into Semantics properties so that both
    // the accessibility tree and the ProbeBinding can discover them.
    final probeLabel = label ?? id;
    final stateDesc = state.entries
        .map((e) => '${e.key}=${e.value}')
        .join(', ');

    return Semantics(
      identifier: id,
      label: probeLabel,
      value: stateDesc.isNotEmpty ? stateDesc : null,
      hint: 'probe:${type.name}${source != null ? "|src:$source" : ""}',
      child: child,
    );
  }
}
