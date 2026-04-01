import 'dart:convert';
import 'dart:io';

import 'package:ui_test_probe/ui_test_probe.dart';

/// Converts a Dart camelCase ProbeType name to the kebab-case spec name.
/// e.g. "dataContainer" → "data-container"
String _probeTypeToKebab(String camel) {
  final buffer = StringBuffer();
  for (int i = 0; i < camel.length; i++) {
    final ch = camel[i];
    if (ch == ch.toUpperCase() && ch != ch.toLowerCase() && i > 0) {
      buffer.write('-');
      buffer.write(ch.toLowerCase());
    } else {
      buffer.write(ch);
    }
  }
  return buffer.toString();
}

/// Converts a kebab-case spec type name to a Dart camelCase ProbeType enum name.
/// e.g. "data-container" → "dataContainer"
String _kebabToCamel(String kebab) {
  final parts = kebab.split('-');
  if (parts.length == 1) return kebab;
  return parts.first +
      parts.skip(1).map((p) => p[0].toUpperCase() + p.substring(1)).join();
}

/// Runs conformance test vectors against a [ProbeBinding].
class ConformanceRunner {
  final ProbeBinding binding;

  ConformanceRunner(this.binding);

  /// Reads a JSON file at [filePath] and returns the list of vector maps.
  List<Map<String, dynamic>> loadVectors(String filePath) {
    final file = File(filePath);
    final raw = file.readAsStringSync();
    final decoded = jsonDecode(raw) as Map<String, dynamic>;
    final vectors = decoded['vectors'] as List<dynamic>;
    return vectors.cast<Map<String, dynamic>>();
  }

  /// Executes a single vector's action, evaluates the result against
  /// the expected outcome, and returns a result map with keys:
  ///   id, name, passed, error (optional)
  Map<String, dynamic> runPrimitive(Map<String, dynamic> vector) {
    final id = vector['id'] as String;
    final name = vector['name'] as String;
    final action = vector['action'] as Map<String, dynamic>;
    final expect = vector['expect'] as Map<String, dynamic>;

    final method = action['method'] as String;
    final args = (action['args'] as List<dynamic>).cast<dynamic>();

    try {
      final actual = _executeMethod(method, args);
      final evalResult = _evaluate(actual, expect);
      return {
        'id': id,
        'name': name,
        'passed': evalResult['passed'],
        if (evalResult['error'] != null) 'error': evalResult['error'],
      };
    } catch (e) {
      return {
        'id': id,
        'name': name,
        'passed': false,
        'error': 'Exception: $e',
      };
    }
  }

  /// Maps method names from vectors to actual ProbeBinding calls.
  dynamic _executeMethod(String method, List<dynamic> args) {
    binding.scan();

    switch (method) {
      case 'query':
        final id = args[0] as String;
        return binding.query(id);

      case 'queryAll':
        if (args.isNotEmpty && args[0] is String && (args[0] as String).isNotEmpty) {
          final typeStr = args[0] as String;
          final camel = _kebabToCamel(typeStr);
          final probeType = ProbeType.values.firstWhere(
            (t) => t.name == camel,
            orElse: () => throw ArgumentError('Unknown ProbeType: $typeStr'),
          );
          return binding.queryAll(type: probeType);
        }
        return binding.queryAll();

      case 'queryPage':
        final pages = binding.queryAll(type: ProbeType.page);
        final page = pages.isNotEmpty ? pages.first : null;
        if (page == null) return null;
        // Return a page summary map with elementCount
        return {
          'element': page,
          'elementCount': binding.queryAll().length,
        };

      case 'isEffectivelyVisible':
        final id = args[0] as String;
        final element = binding.query(id);
        return element?.isVisible ?? false;

      default:
        throw ArgumentError('Unknown method: $method');
    }
  }

  /// Evaluates the actual result against the expect specification.
  /// Returns a map with 'passed' (bool) and optional 'error' (String).
  Map<String, dynamic> _evaluate(dynamic actual, Map<String, dynamic> expect) {
    final errors = <String>[];

    if (expect.containsKey('is_null')) {
      if (expect['is_null'] == true && actual != null) {
        errors.add('Expected null but got: $actual');
      } else if (expect['is_null'] == false && actual == null) {
        errors.add('Expected non-null but got null');
      }
    }

    if (expect.containsKey('not_null')) {
      if (expect['not_null'] == true && actual == null) {
        errors.add('Expected non-null but got null');
      }
    }

    if (expect.containsKey('is_true')) {
      if (expect['is_true'] == true && actual != true) {
        errors.add('Expected true but got: $actual');
      }
    }

    if (expect.containsKey('is_false')) {
      if (expect['is_false'] == true && actual != false) {
        errors.add('Expected false but got: $actual');
      }
    }

    if (expect.containsKey('has_length')) {
      final lengthSpec = expect['has_length'];
      int? length;
      if (actual is List) {
        length = actual.length;
      } else if (actual is Map) {
        length = actual.length;
      } else if (actual == null) {
        errors.add('has_length check: actual is null');
      } else {
        errors.add('has_length check: actual is not a list or map: $actual');
      }
      if (length != null) {
        if (lengthSpec is Map<String, dynamic>) {
          final opResult = _evalOp(length, lengthSpec);
          if (!opResult['passed']!) {
            errors.add('has_length: ${opResult['error']}');
          }
        } else if (lengthSpec is int) {
          if (length != lengthSpec) {
            errors.add('has_length: expected $lengthSpec, got $length');
          }
        }
      }
    }

    if (expect.containsKey('fields')) {
      final fields = expect['fields'] as Map<String, dynamic>;
      for (final entry in fields.entries) {
        final path = entry.key;
        final expectedValue = entry.value;
        final actualValue = _getPath(actual, path);

        if (expectedValue is Map<String, dynamic>) {
          // Operator check
          final opResult = _evalOp(actualValue, expectedValue);
          if (!opResult['passed']!) {
            errors.add('field "$path": ${opResult['error']}');
          }
        } else {
          // Direct equality check
          if (actualValue != expectedValue) {
            errors.add(
                'field "$path": expected "$expectedValue" but got "$actualValue"');
          }
        }
      }
    }

    if (errors.isEmpty) {
      return {'passed': true};
    }
    return {'passed': false, 'error': errors.join('; ')};
  }

  /// Resolves a dot-notated path on a ProbeElement or result map.
  dynamic _getPath(dynamic obj, String path) {
    if (obj == null) return null;

    // Handle page summary map from queryPage
    if (obj is Map<String, dynamic>) {
      if (path == 'elementCount') {
        return obj['elementCount'];
      }
      final parts = path.split('.');
      dynamic current = obj;
      for (final part in parts) {
        if (current is Map) {
          current = current[part];
        } else {
          return null;
        }
      }
      return current;
    }

    if (obj is ProbeElement) {
      switch (path) {
        case 'id':
          return obj.id;
        case 'type':
          return _probeTypeToKebab(obj.type.name);
        case 'source':
          return obj.source;
        case 'state':
          return obj.state;
        case 'state.current':
          return obj.state['current'];
        case 'layout':
          return {
            'visible': obj.isVisible,
            'width': obj.bounds != null ? obj.bounds![2] : 0.0,
            'height': obj.bounds != null ? obj.bounds![3] : 0.0,
          };
        case 'layout.visible':
          return obj.isVisible;
        case 'layout.width':
          return obj.bounds != null ? obj.bounds![2] : 0.0;
        case 'layout.height':
          return obj.bounds != null ? obj.bounds![3] : 0.0;
        default:
          return null;
      }
    }

    return null;
  }

  /// Evaluates operator-based comparisons.
  /// Supported ops: gt, gte, lt, lte, contains, has_length
  Map<String, dynamic> _evalOp(dynamic actual, Map<String, dynamic> op) {
    final errors = <String>[];

    if (op.containsKey('gt')) {
      final threshold = (op['gt'] as num).toDouble();
      final actualNum = actual is num ? actual.toDouble() : null;
      if (actualNum == null || actualNum <= threshold) {
        errors.add('expected > $threshold but got $actual');
      }
    }

    if (op.containsKey('gte')) {
      final threshold = (op['gte'] as num).toDouble();
      final actualNum = actual is num ? actual.toDouble() : null;
      if (actualNum == null || actualNum < threshold) {
        errors.add('expected >= $threshold but got $actual');
      }
    }

    if (op.containsKey('lt')) {
      final threshold = (op['lt'] as num).toDouble();
      final actualNum = actual is num ? actual.toDouble() : null;
      if (actualNum == null || actualNum >= threshold) {
        errors.add('expected < $threshold but got $actual');
      }
    }

    if (op.containsKey('lte')) {
      final threshold = (op['lte'] as num).toDouble();
      final actualNum = actual is num ? actual.toDouble() : null;
      if (actualNum == null || actualNum > threshold) {
        errors.add('expected <= $threshold but got $actual');
      }
    }

    if (op.containsKey('contains')) {
      final needle = op['contains'];
      if (actual is String) {
        if (!actual.contains(needle.toString())) {
          errors.add('expected to contain "$needle" but got "$actual"');
        }
      } else if (actual is List) {
        if (!actual.contains(needle)) {
          errors.add('expected list to contain "$needle"');
        }
      } else {
        errors.add('contains check: actual is not a string or list: $actual');
      }
    }

    if (op.containsKey('has_length')) {
      final lengthSpec = op['has_length'];
      int? length;
      if (actual is List) {
        length = actual.length;
      } else if (actual is String) {
        length = actual.length;
      } else {
        errors.add('has_length (nested): actual is not a list or string: $actual');
      }
      if (length != null) {
        if (lengthSpec is int && length != lengthSpec) {
          errors.add('has_length: expected $lengthSpec, got $length');
        } else if (lengthSpec is Map<String, dynamic>) {
          final nested = _evalOp(length, lengthSpec);
          if (!nested['passed']!) {
            errors.add('has_length: ${nested['error']}');
          }
        }
      }
    }

    if (errors.isEmpty) {
      return {'passed': true};
    }
    return {'passed': false, 'error': errors.join('; ')};
  }
}
