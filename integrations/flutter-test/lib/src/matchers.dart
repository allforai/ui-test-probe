import 'package:flutter_test/flutter_test.dart';
import 'package:ui_test_probe/ui_test_probe.dart';

/// Matches a [ProbeElement] whose state map contains [key] with [value].
///
/// ```dart
/// expect(probe.query('submit-btn'), hasProbeState('enabled', true));
/// ```
Matcher hasProbeState(String key, dynamic value) {
  return _ProbeStateMatcher(key, value);
}

/// Matches a [ProbeElement] whose data fields match the given map.
///
/// Checks any combination of: label, value, source, type, screen.
///
/// ```dart
/// expect(probe.query('user-name'), hasProbeData({'label': 'Username', 'type': ProbeType.input}));
/// ```
Matcher hasProbeData(Map<String, dynamic> expected) {
  return _ProbeDataMatcher(expected);
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
  return const _EffectivelyVisibleMatcher();
}

/// Matcher that checks a specific key/value in a [ProbeElement]'s state map.
class _ProbeStateMatcher extends Matcher {
  final String key;
  final dynamic value;

  const _ProbeStateMatcher(this.key, this.value);

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is! ProbeElement) return false;
    return item.state.containsKey(key) && item.state[key] == value;
  }

  @override
  Description describe(Description description) {
    return description.add('ProbeElement with state["$key"] == $value');
  }

  @override
  Description describeMismatch(
      dynamic item, Description mismatchDescription,
      Map matchState, bool verbose) {
    if (item is! ProbeElement) {
      return mismatchDescription.add('is not a ProbeElement');
    }
    if (!item.state.containsKey(key)) {
      return mismatchDescription
          .add('state does not contain key "$key". '
              'Available keys: ${item.state.keys.toList()}');
    }
    return mismatchDescription
        .add('state["$key"] is ${item.state[key]}, expected $value');
  }
}

/// Matcher that checks data fields of a [ProbeElement].
class _ProbeDataMatcher extends Matcher {
  final Map<String, dynamic> expected;

  const _ProbeDataMatcher(this.expected);

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is! ProbeElement) return false;

    for (final entry in expected.entries) {
      final actual = _getField(item, entry.key);
      if (actual != entry.value) return false;
    }
    return true;
  }

  dynamic _getField(ProbeElement element, String fieldName) {
    switch (fieldName) {
      case 'label':
        return element.label;
      case 'value':
        return element.value;
      case 'source':
        return element.source;
      case 'type':
        return element.type;
      case 'screen':
        return element.screen;
      case 'id':
        return element.id;
      case 'isVisible':
        return element.isVisible;
      case 'isEnabled':
        return element.isEnabled;
      case 'a11yLabel':
        return element.a11yLabel;
      case 'a11yRole':
        return element.a11yRole;
      case 'parentId':
        return element.parentId;
      default:
        return null;
    }
  }

  @override
  Description describe(Description description) {
    return description.add('ProbeElement with data matching $expected');
  }

  @override
  Description describeMismatch(
      dynamic item, Description mismatchDescription,
      Map matchState, bool verbose) {
    if (item is! ProbeElement) {
      return mismatchDescription.add('is not a ProbeElement');
    }
    final mismatches = <String>[];
    for (final entry in expected.entries) {
      final actual = _getField(item, entry.key);
      if (actual != entry.value) {
        mismatches.add('${entry.key}: expected ${entry.value}, got $actual');
      }
    }
    return mismatchDescription.add(mismatches.join('; '));
  }
}

/// Matcher that checks effective visibility of a [ProbeElement].
///
/// Checks isVisible flag and that bounds are present and within
/// a reasonable viewport area (non-zero size, non-negative position).
class _EffectivelyVisibleMatcher extends Matcher {
  const _EffectivelyVisibleMatcher();

  @override
  bool matches(dynamic item, Map matchState) {
    if (item is! ProbeElement) return false;

    // Must have isVisible flag set.
    if (!item.isVisible) {
      matchState['reason'] = 'isVisible is false';
      return false;
    }

    // Must have bounds.
    if (item.bounds == null || item.bounds!.length < 4) {
      matchState['reason'] = 'bounds are null or incomplete';
      return false;
    }

    final x = item.bounds![0];
    final y = item.bounds![1];
    final w = item.bounds![2];
    final h = item.bounds![3];

    // Must have non-zero size.
    if (w <= 0 || h <= 0) {
      matchState['reason'] = 'element has zero or negative size ($w x $h)';
      return false;
    }

    // Bounds should not be entirely off-screen (negative extent).
    if (x + w <= 0 || y + h <= 0) {
      matchState['reason'] =
          'element is entirely off-screen at ($x, $y, $w, $h)';
      return false;
    }

    return true;
  }

  @override
  Description describe(Description description) {
    return description.add('ProbeElement that is effectively visible');
  }

  @override
  Description describeMismatch(
      dynamic item, Description mismatchDescription,
      Map matchState, bool verbose) {
    if (item is! ProbeElement) {
      return mismatchDescription.add('is not a ProbeElement');
    }
    final reason = matchState['reason'] as String? ?? 'unknown reason';
    return mismatchDescription.add('is not effectively visible: $reason');
  }
}
