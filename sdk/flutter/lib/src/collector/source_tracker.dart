import 'dart:async';
import 'dart:convert';
import 'dart:io';
import '../annotations/probe_types.dart';
import 'probe_binding.dart';

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

  /// Whether this request has completed.
  bool get isCompleted => completedAt != null;
}

/// Intercepts HTTP requests and correlates them to probe data sources.
///
/// When a probe element declares a `source` (e.g., "api:/users"),
/// the [SourceTracker] matches outgoing HTTP requests against registered
/// source patterns and records the correlation.
class SourceTracker {
  /// All tracked requests captured during the session.
  final List<TrackedRequest> requests = [];

  /// The binding used to resolve probe sources.
  final ProbeBinding _binding;

  /// The original HttpOverrides before we installed ours.
  HttpOverrides? _previousOverrides;

  /// Stream controller for notifying when requests complete.
  final StreamController<TrackedRequest> _completionController =
      StreamController<TrackedRequest>.broadcast();

  SourceTracker(this._binding);

  /// Start intercepting HTTP requests.
  ///
  /// Installs an HttpOverrides to capture all outgoing requests
  /// and correlate them with probe source declarations.
  void startTracking() {
    _previousOverrides = HttpOverrides.current;
    HttpOverrides.global = _ProbeHttpOverrides(
      previous: _previousOverrides,
      tracker: this,
    );
  }

  /// Stop intercepting HTTP requests and restore original HttpOverrides.
  void stopTracking() {
    HttpOverrides.global = _previousOverrides;
    _previousOverrides = null;
  }

  /// Record a request. Called by the HttpOverrides wrapper.
  void _recordRequest(String method, Uri url, int? statusCode,
      DateTime startedAt, DateTime? completedAt) {
    // Match URL against probe source declarations.
    _binding.scan();
    final registry = _binding.registry;

    for (final entry in registry.entries) {
      final source = entry.value.source;
      if (source != null && _matchesSource(url, source)) {
        final tracked = TrackedRequest(
          probeId: entry.key,
          method: method,
          url: url,
          statusCode: statusCode,
          startedAt: startedAt,
          completedAt: completedAt,
        );
        requests.add(tracked);
        if (tracked.isCompleted) {
          _completionController.add(tracked);
        }
      }
    }
  }

  /// Check if a URL matches a probe source pattern.
  ///
  /// Source patterns can be:
  /// - "api:/users" — matches URLs containing "/users"
  /// - Full URLs — exact match
  /// - Path patterns — matches URL path
  bool _matchesSource(Uri url, String source) {
    // Strip "api:" prefix if present.
    String pattern = source;
    if (pattern.startsWith('api:')) {
      pattern = pattern.substring(4);
    }

    // Check if the URL path contains the pattern.
    return url.toString().contains(pattern) || url.path.contains(pattern);
  }

  /// Get all tracked requests for a specific probe element.
  List<TrackedRequest> requestsFor(String probeId) {
    return requests.where((r) => r.probeId == probeId).toList();
  }

  /// Wait for a pending request associated with [probeId] to complete.
  Future<TrackedRequest> waitForRequest(
    String probeId, {
    Duration timeout = const Duration(seconds: 10),
  }) async {
    // First check if there's already a completed request.
    final existing = requests
        .where((r) => r.probeId == probeId && r.isCompleted)
        .toList();
    if (existing.isNotEmpty) {
      return existing.last;
    }

    // Wait for a new completion event.
    final completer = Completer<TrackedRequest>();
    late StreamSubscription<TrackedRequest> subscription;

    final timer = Timer(timeout, () {
      if (!completer.isCompleted) {
        subscription.cancel();
        completer.completeError(
          TimeoutException(
            'Timed out waiting for request for probe "$probeId"',
          ),
        );
      }
    });

    subscription = _completionController.stream
        .where((r) => r.probeId == probeId)
        .listen((request) {
      if (!completer.isCompleted) {
        timer.cancel();
        subscription.cancel();
        completer.complete(request);
      }
    });

    return completer.future;
  }

  /// Dispose resources.
  void dispose() {
    _completionController.close();
  }
}

/// Custom HttpOverrides that wraps HTTP clients to track requests.
class _ProbeHttpOverrides extends HttpOverrides {
  final HttpOverrides? previous;
  final SourceTracker tracker;

  _ProbeHttpOverrides({this.previous, required this.tracker});

  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final innerClient = previous?.createHttpClient(context) ??
        super.createHttpClient(context);
    return _TrackedHttpClient(innerClient, tracker);
  }
}

/// A wrapping HttpClient that records requests for source tracking.
class _TrackedHttpClient implements HttpClient {
  final HttpClient _inner;
  final SourceTracker _tracker;

  _TrackedHttpClient(this._inner, this._tracker);

  Future<HttpClientRequest> _trackOpen(
      String method, Uri url, Future<HttpClientRequest> Function() open) async {
    final startedAt = DateTime.now();
    final request = await open();
    // Wrap the close to capture the response.
    return _TrackedHttpClientRequest(request, method, url, startedAt, _tracker);
  }

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) =>
      _trackOpen(method, url, () => _inner.openUrl(method, url));

  @override
  Future<HttpClientRequest> open(
          String method, String host, int port, String path) =>
      _trackOpen(method, Uri(host: host, port: port, path: path),
          () => _inner.open(method, host, port, path));

  @override
  Future<HttpClientRequest> getUrl(Uri url) =>
      _trackOpen('GET', url, () => _inner.getUrl(url));

  @override
  Future<HttpClientRequest> get(String host, int port, String path) =>
      _trackOpen('GET', Uri(host: host, port: port, path: path),
          () => _inner.get(host, port, path));

  @override
  Future<HttpClientRequest> postUrl(Uri url) =>
      _trackOpen('POST', url, () => _inner.postUrl(url));

  @override
  Future<HttpClientRequest> post(String host, int port, String path) =>
      _trackOpen('POST', Uri(host: host, port: port, path: path),
          () => _inner.post(host, port, path));

  @override
  Future<HttpClientRequest> putUrl(Uri url) =>
      _trackOpen('PUT', url, () => _inner.putUrl(url));

  @override
  Future<HttpClientRequest> put(String host, int port, String path) =>
      _trackOpen('PUT', Uri(host: host, port: port, path: path),
          () => _inner.put(host, port, path));

  @override
  Future<HttpClientRequest> deleteUrl(Uri url) =>
      _trackOpen('DELETE', url, () => _inner.deleteUrl(url));

  @override
  Future<HttpClientRequest> delete(String host, int port, String path) =>
      _trackOpen('DELETE', Uri(host: host, port: port, path: path),
          () => _inner.delete(host, port, path));

  @override
  Future<HttpClientRequest> patchUrl(Uri url) =>
      _trackOpen('PATCH', url, () => _inner.patchUrl(url));

  @override
  Future<HttpClientRequest> patch(String host, int port, String path) =>
      _trackOpen('PATCH', Uri(host: host, port: port, path: path),
          () => _inner.patch(host, port, path));

  @override
  Future<HttpClientRequest> headUrl(Uri url) =>
      _trackOpen('HEAD', url, () => _inner.headUrl(url));

  @override
  Future<HttpClientRequest> head(String host, int port, String path) =>
      _trackOpen('HEAD', Uri(host: host, port: port, path: path),
          () => _inner.head(host, port, path));

  // Delegate all other HttpClient properties/methods.
  @override
  set autoUncompress(bool value) => _inner.autoUncompress = value;
  @override
  bool get autoUncompress => _inner.autoUncompress;
  @override
  set connectionTimeout(Duration? value) => _inner.connectionTimeout = value;
  @override
  Duration? get connectionTimeout => _inner.connectionTimeout;
  @override
  set idleTimeout(Duration value) => _inner.idleTimeout = value;
  @override
  Duration get idleTimeout => _inner.idleTimeout;
  @override
  set maxConnectionsPerHost(int? value) =>
      _inner.maxConnectionsPerHost = value;
  @override
  int? get maxConnectionsPerHost => _inner.maxConnectionsPerHost;
  @override
  set userAgent(String? value) => _inner.userAgent = value;
  @override
  String? get userAgent => _inner.userAgent;
  @override
  set authenticate(
          Future<bool> Function(Uri url, String scheme, String? realm)? f) =>
      _inner.authenticate = f;
  @override
  set authenticateProxy(
          Future<bool> Function(
                  String host, int port, String scheme, String? realm)?
              f) =>
      _inner.authenticateProxy = f;
  @override
  set badCertificateCallback(
          bool Function(X509Certificate cert, String host, int port)?
              callback) =>
      _inner.badCertificateCallback = callback;
  @override
  set findProxy(String Function(Uri url)? f) => _inner.findProxy = f;
  @override
  set connectionFactory(
          Future<ConnectionTask<Socket>> Function(
                  Uri url, String? proxyHost, int? proxyPort)?
              f) =>
      _inner.connectionFactory = f;
  @override
  set keyLog(Function(String line)? callback) => _inner.keyLog = callback;
  @override
  void addCredentials(
          Uri url, String realm, HttpClientCredentials credentials) =>
      _inner.addCredentials(url, realm, credentials);
  @override
  void addProxyCredentials(String host, int port, String realm,
          HttpClientCredentials credentials) =>
      _inner.addProxyCredentials(host, port, realm, credentials);
  @override
  void close({bool force = false}) => _inner.close(force: force);
}

/// Wrapped HttpClientRequest that tracks when the response arrives.
class _TrackedHttpClientRequest implements HttpClientRequest {
  final HttpClientRequest _inner;
  final String _method;
  final Uri _url;
  final DateTime _startedAt;
  final SourceTracker _tracker;

  _TrackedHttpClientRequest(
      this._inner, this._method, this._url, this._startedAt, this._tracker);

  @override
  Future<HttpClientResponse> close() async {
    final response = await _inner.close();
    _tracker._recordRequest(
      _method,
      _url,
      response.statusCode,
      _startedAt,
      DateTime.now(),
    );
    return response;
  }

  // Delegate all other HttpClientRequest members to _inner.
  @override
  bool get bufferOutput => _inner.bufferOutput;
  @override
  set bufferOutput(bool value) => _inner.bufferOutput = value;
  @override
  int get contentLength => _inner.contentLength;
  @override
  set contentLength(int value) => _inner.contentLength = value;
  @override
  Encoding get encoding => _inner.encoding;
  @override
  set encoding(Encoding value) => _inner.encoding = value;
  @override
  bool get followRedirects => _inner.followRedirects;
  @override
  set followRedirects(bool value) => _inner.followRedirects = value;
  @override
  int get maxRedirects => _inner.maxRedirects;
  @override
  set maxRedirects(int value) => _inner.maxRedirects = value;
  @override
  bool get persistentConnection => _inner.persistentConnection;
  @override
  set persistentConnection(bool value) =>
      _inner.persistentConnection = value;
  @override
  HttpHeaders get headers => _inner.headers;
  @override
  HttpConnectionInfo? get connectionInfo => _inner.connectionInfo;
  @override
  List<Cookie> get cookies => _inner.cookies;
  @override
  Future<HttpClientResponse> get done => _inner.done;
  @override
  String get method => _inner.method;
  @override
  Uri get uri => _inner.uri;
  @override
  void abort([Object? exception, StackTrace? stackTrace]) =>
      _inner.abort(exception, stackTrace);
  @override
  void add(List<int> data) => _inner.add(data);
  @override
  void addError(Object error, [StackTrace? stackTrace]) =>
      _inner.addError(error, stackTrace);
  @override
  Future addStream(Stream<List<int>> stream) => _inner.addStream(stream);
  @override
  Future flush() => _inner.flush();
  @override
  void write(Object? object) => _inner.write(object);
  @override
  void writeAll(Iterable objects, [String separator = '']) =>
      _inner.writeAll(objects, separator);
  @override
  void writeCharCode(int charCode) => _inner.writeCharCode(charCode);
  @override
  void writeln([Object? object = '']) => _inner.writeln(object);
}
