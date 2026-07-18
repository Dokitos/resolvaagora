import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../network/api_client.dart';
import 'client_service.dart';

const _storage = FlutterSecureStorage();

class AuthState {
  final bool isAuthenticated;
  final String? userId;
  final String? name;
  final String? role; // 'TECHNICIAN', 'CLIENT', 'ADMIN'

  const AuthState({
    required this.isAuthenticated,
    this.userId,
    this.name,
    this.role,
  });

  factory AuthState.unauthenticated() =>
      const AuthState(isAuthenticated: false);

  bool get isClient => role == 'CLIENT';
  bool get isTechnician => role == 'TECHNICIAN';
  bool get isAdmin => role == 'ADMIN';
}

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final token = await _storage.read(key: 'access_token');
    if (token == null) return AuthState.unauthenticated();
    final role = await _storage.read(key: 'user_role');
    final name = await _storage.read(key: 'user_name');
    final userId = await _storage.read(key: 'user_id');
    return AuthState(
      isAuthenticated: true,
      userId: userId,
      name: name,
      role: role,
    );
  }

  Future<void> login(String email, String password) async {
    final dio = ref.read(dioProvider);
    state = const AsyncLoading();
    try {
      final response = await dio.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      final data = response.data as Map<String, dynamic>;
      final role = data['user']['role'] as String;

      await _storage.write(key: 'access_token', value: data['accessToken']);
      await _storage.write(key: 'refresh_token', value: data['refreshToken']);
      await _storage.write(key: 'user_id', value: data['user']['id']);
      await _storage.write(key: 'user_role', value: role);

      String name = data['user']['email'] as String;

      if (role == 'TECHNICIAN') {
        try {
          final profile = await ref.read(dioProvider).get('/technician/me');
          final t = profile.data as Map<String, dynamic>?;
          if (t != null && t['firstName'] != null) {
            name = '${t['firstName']} ${t['lastName']}';
          }
        } catch (_) {}
      } else if (role == 'CLIENT') {
        try {
          final profile = await ref.read(dioProvider).get('/clients/me');
          final t = profile.data as Map<String, dynamic>?;
          if (t != null && t['firstName'] != null) {
            name = '${t['firstName']} ${t['lastName']}';
          }
        } catch (_) {}
      }

      await _storage.write(key: 'user_name', value: name);

      state = AsyncData(AuthState(
        isAuthenticated: true,
        userId: data['user']['id'],
        name: name,
        role: role,
      ));
      // Nova identidade → descarta os dados de cliente em cache (perfil, moradas,
      // pedidos, subscrição, notificações…) para o próximo ecrã voltar a buscar.
      _invalidateClientData();
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Erro ao iniciar sessão';
      state = AsyncError(msg, e.stackTrace);
    }
  }

  /// Register a new CLIENT account, then sign in automatically.
  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
    String? referralCode,
  }) async {
    final dio = ref.read(dioProvider);
    state = const AsyncLoading();
    try {
      await dio.post('/auth/register', data: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        if (phone != null && phone.isNotEmpty) 'phone': phone,
        if (referralCode != null && referralCode.isNotEmpty) 'referralCode': referralCode,
      });
    } on DioException catch (e) {
      final msg = e.response?.data?['message'] ?? 'Erro ao criar conta';
      state = AsyncError(msg is List ? msg.join(', ') : msg, e.stackTrace);
      return;
    }
    // login() sets the authenticated state (storage + tokens + name).
    await login(email, password);
  }

  /// Request a password-reset code by email. Returns a dev-only code when the
  /// backend runs in development (so the flow is testable without real SMTP).
  Future<String?> forgotPassword(String email) async {
    final dio = ref.read(dioProvider);
    final r = await dio.post('/auth/forgot-password', data: {'email': email});
    return (r.data as Map<String, dynamic>)['devCode'] as String?;
  }

  /// Redefine the password using the emailed code.
  Future<void> resetPassword(String code, String newPassword) async {
    final dio = ref.read(dioProvider);
    await dio.post('/auth/reset-password', data: {'token': code, 'newPassword': newPassword});
  }

  /// Refresh the cached display name after the client edits their profile.
  Future<void> updateStoredName(String name) async {
    await _storage.write(key: 'user_name', value: name);
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncData(AuthState(
        isAuthenticated: current.isAuthenticated,
        userId: current.userId,
        name: name,
        role: current.role,
      ));
    }
  }

  Future<void> logout() async {
    final dio = ref.read(dioProvider);
    await dio.post('/auth/logout').catchError((_) => Response(requestOptions: RequestOptions()));
    await _storage.deleteAll();
    state = AsyncData(AuthState.unauthenticated());
    // Limpa a cache de dados do cliente para não vazar para a próxima sessão.
    _invalidateClientData();
  }

  /// Descarta os providers de dados do cliente para forçarem novo fetch com a
  /// identidade atual (evita mostrar o perfil/dados da sessão anterior).
  void _invalidateClientData() {
    ref.invalidate(clientProfileProvider);
    ref.invalidate(clientAddressesProvider);
    ref.invalidate(clientServiceRequestsProvider);
    ref.invalidate(mySubscriptionProvider);
    ref.invalidate(notificationsProvider);
    ref.invalidate(unreadCountProvider);
    ref.invalidate(referralInfoProvider);
    ref.invalidate(subscriptionPlansProvider);
  }
}

final authProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
