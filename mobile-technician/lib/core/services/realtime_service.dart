import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

const String _apiUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3002/api/v1',
);

const _storage = FlutterSecureStorage();

/// Liga-se ao gateway WebSocket (namespace `/notifications`) autenticado com o
/// token guardado e permite subscrever eventos (ex.: `support-message`).
/// Uma instância por ecrã; chamar [dispose] ao sair.
class RealtimeConnection {
  io.Socket? _socket;

  /// Origem do socket = base da API sem o sufixo `/api/v1`.
  static String get _origin {
    final i = _apiUrl.indexOf('/api/');
    return i >= 0 ? _apiUrl.substring(0, i) : _apiUrl;
  }

  Future<void> connect({
    required String event,
    required void Function(dynamic data) onEvent,
  }) async {
    final token = await _storage.read(key: 'access_token');
    if (token == null) return;

    final socket = io.io(
      '$_origin/notifications',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .build(),
    );
    socket.on(event, onEvent);
    socket.connect();
    _socket = socket;
  }

  void dispose() {
    _socket?.dispose();
    _socket = null;
  }
}
