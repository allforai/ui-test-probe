import 'package:flutter_test/flutter_test.dart';
import 'package:ui_test_probe/ui_test_probe.dart';

/// Matches a [ProbeElement] whose state map contains [key] with [value].
///
/// ```dart
/// expect(probe.query('submit-btn'), hasProbeState('enabled', true));
/// ```
Matcher hasProbeState(String key, dynamic value) {
  // TODO: implement ProbeElement state matcher
  throw UnimplementedError('hasProbeState() not yet implemented');
}

/// Matches a [ProbeElement] whose data fields match the given map.
///
/// Checks any combination of: label, value, source, type, screen.
///
/// ```dart
/// expect(probe.query('user-name'), hasProbeData({'label': 'Username', 'type': ProbeType.input}));
/// ```
Matcher hasProbeData(Map<String, dynamic> expected) {
  // TODO: implement ProbeElement data matcher
  throw UnimplementedError('hasProbeData() not yet implemented');
}

/// Matches a [ProbeElement] that is effectively visible on screen.
///
/// An element is effectively visible if:
/// - Its [isVisible] flag is true
/// - Its bounds are within the viewport
/// - It is not obscured by other elements
///
/// ```dart
/// expect(probe.query('error-banner'), isEffectivelyVisible());
/// ```
Matcher isEffectivelyVisible() {
  // TODO: implement visibility matcher with bounds + obscurity checks
  throw UnimplementedError('isEffectivelyVisible() not yet implemented');
}
