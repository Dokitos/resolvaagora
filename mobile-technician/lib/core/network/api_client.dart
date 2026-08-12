import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';

/// Exportada para os serviços (ex.: [RealtimeConnection]) que precisam da
/// base da API sem reler `String.fromEnvironment` (fonte única da verdade).
const String apiBaseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3002/api/v1',
);

const _storage = FlutterSecureStorage();

// Serializa os refreshes de token entre pedidos em paralelo. O backend roda o
// refresh token a cada uso (single-use); sem este lock, dois 401 em paralelo
// disparavam dois refreshes, o segundo era rejeitado (token já rodado pelo
// primeiro) e o catch apagava TUDO do storage — incluindo o token válido que
// o primeiro refresh acabou de gravar — forçando um logout indevido.
Completer<bool>? _refreshCompleter;

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: apiBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 15),
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      // Endpoints de auth (login, registo, refresh, recuperação de password)
      // devolvem 401 pelo próprio motivo do pedido falhar (ex.: password
      // errada), não porque o access token expirou. Tratá-los como sessão
      // expirada disparava um refresh silencioso (sem refresh_token ainda,
      // porque o login nem chegou a suceder) e depois invalidava o
      // authProvider — precisamente o notifier que o `login()`/`register()`
      // está a meio de marcar como `AsyncError`. O invalidate descartava essa
      // instância e recriava-a a partir de storage vazio (não-autenticado,
      // sem erro), fazendo o ecrã de login ler `hasError == false` e não
      // mostrar snackbar nenhuma. Por isso estes paths ficam de fora da
      // lógica de refresh/invalidate abaixo.
      final path = error.requestOptions.path;
      final isAuthEndpoint = path.contains('/auth/login') ||
          path.contains('/auth/register') ||
          path.contains('/auth/refresh') ||
          path.contains('/auth/forgot-password') ||
          path.contains('/auth/reset-password');
      if (error.response?.statusCode == 401 && !isAuthEndpoint) {
        bool refreshed;
        final existing = _refreshCompleter;
        if (existing != null) {
          // Já há um refresh em curso disparado por outro pedido em paralelo —
          // espera pelo mesmo resultado em vez de disparar um segundo refresh.
          refreshed = await existing.future;
        } else {
          final completer = Completer<bool>();
          _refreshCompleter = completer;
          refreshed = false;
          try {
            refreshed = await _tryRefresh(dio);
          } finally {
            completer.complete(refreshed);
            _refreshCompleter = null;
          }
        }
        if (refreshed) {
          final token = await _storage.read(key: 'access_token');
          error.requestOptions.headers['Authorization'] = 'Bearer $token';
          final response = await dio.fetch(error.requestOptions);
          return handler.resolve(response);
        }
        // Refresh falhou → _tryRefresh já limpou o storage. Força o authProvider
        // a reavaliar (build() lê o storage vazio → não-autenticado) para o
        // router redirecionar ao login.
        ref.invalidate(authProvider);
      }
      handler.next(error);
    },
  ));

  return dio;
});

Future<bool> _tryRefresh(Dio dio) async {
  final refreshToken = await _storage.read(key: 'refresh_token');
  if (refreshToken == null) return false;

  try {
    final response = await dio.post('/auth/refresh', data: {'refreshToken': refreshToken});
    await _storage.write(key: 'access_token', value: response.data['accessToken']);
    await _storage.write(key: 'refresh_token', value: response.data['refreshToken']);
    return true;
  } catch (_) {
    await _storage.deleteAll();
    return false;
  }
}
