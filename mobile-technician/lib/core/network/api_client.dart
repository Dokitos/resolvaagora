import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../services/auth_service.dart';

const String _baseUrl = String.fromEnvironment(
  'API_URL',
  defaultValue: 'http://localhost:3002/api/v1',
);

const _storage = FlutterSecureStorage();

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
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
      if (error.response?.statusCode == 401) {
        final refreshed = await _tryRefresh(dio);
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
