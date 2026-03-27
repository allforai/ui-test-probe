import '../annotations/probe_types.dart';

/// A recorded network request correlated to a probe source.
class TrackedRequest {
  /// The probe ID whose source triggered this request.
  final String probeId;

  /// HTTP method (GET, POST, etc.).
  final String method;

  /// Request URL.
  final Uri url;

  /// HTTP status code of the response (null if pending).
  final int? statusCode;

  /// Request start time.
  final DateTime startedAt;

  /// Request completion time (null if pending).
  final DateTime? completedAt;

  const TrackedRequest({
    required this.probeId,
    required this.method,
    required this.url,
    this.statusCode,
    required this.startedAt,
    this.completedAt,
  });
}

/// Intercepts HTTP requests and correlates them to probe data sources.
///
/// When a probe element declares a `source` (e.g., "api:/users"),
/// the [SourceTracker] matches outgoing HTTP requests against registered
/// source patterns and records the correlation.
class SourceTracker {
  /// All tracked requests captured during the session.
  final List<TrackedRequest> requests = [];

  /// Start intercepting HTTP requests.
  ///
  /// Installs an HttpOverrides to capture all outgoing requests
  /// and correlate them with probe source declarations.
  void startTracking() {
    // TODO: install HttpOverrides, match requests against probe sources
    throw UnimplementedError('SourceTracker.startTracking() not yet implemented');
  }

  /// Stop intercepting HTTP requests and restore original HttpOverrides.
  void stopTracking() {
    // TODO: restore original HttpOverrides
    throw UnimplementedError('SourceTracker.stopTracking() not yet implemented');
  }

  /// Get all tracked requests for a specific probe element.
  List<TrackedRequest> requestsFor(String probeId) {
    // TODO: filter requests by probeId
    throw UnimplementedError('SourceTracker.requestsFor() not yet implemented');
  }

  /// Wait for a pending request associated with [probeId] to complete.
  Future<TrackedRequest> waitForRequest(
    String probeId, {
    Duration timeout = const Duration(seconds: 10),
  }) async {
    // TODO: implement with timeout
    throw UnimplementedError('SourceTracker.waitForRequest() not yet implemented');
  }
}
