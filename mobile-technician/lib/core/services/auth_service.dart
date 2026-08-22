import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';
import '../network/api_client.dart';
import 'client_service.dart';

const _storage = FlutterSecureStorage();

/// Extrai uma mensagem amigável (PT) do erro de um pedido de auth, traduzindo
/// as mensagens conhecidas que o backend devolve em inglês. Segue o mesmo
/// padrão de `_friendlyError` usado em `job_detail_screen.dart`/etc., mas
/// específico do fluxo de auth porque aqui vale a pena traduzir mensagens
/// conhecidas (ex.: "Invalid credentials") em vez de as mostrar tal e qual.
String _authErrorMessage(DioException e, String fallback) {
  final data = e.response?.data;
  final raw = data is Map ? data['message'] : null;
  if (raw == null) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout ||
        e.type == DioExceptionType.sendTimeout ||
        e.type == DioExceptionType.connectionError) {
      return 'Sem ligação à internet. Verifica a tua ligação e tenta novamente.';
    }
    return fallback;
  }
  if (raw is List) {
    return raw.map((m) => _translateAuthMessage(m.toString())).join(', ');
  }
  return _translateAuthMessage(raw.toString());
}

String _translateAuthMessage(String backendMsg) {
  switch (backendMsg) {
    case 'Invalid credentials':
      return 'Email ou palavra-passe incorretos';
    case 'Invalid refresh token':
    case 'Refresh token revoked':
    case 'User not found or inactive':
      return 'Sessão expirada. Inicia sessão novamente.';
    default:
      return backendMsg;
  }
}

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
      await _completeLogin(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      state = AsyncError(_authErrorMessage(e, 'Erro ao iniciar sessão'), e.stackTrace);
    }
  }

  /// Guarda a sessão devolvida pelo backend e resolve o nome a mostrar.
  ///
  /// Partilhado pelo login com password e pelo login social: a sessão é a
  /// mesma, muda só a forma de a obter.
  Future<void> _completeLogin(Map<String, dynamic> data) async {
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
  }

  /// Entrada com Google. Só faz sentido para clientes — as contas de técnico
  /// são criadas pela administração.
  Future<void> signInWithGoogle() => _social(_googleCredential);

  /// Entrada com Apple.
  Future<void> signInWithApple() => _social(_appleCredential);

  /// Autentica no Firebase com o fornecedor escolhido, troca o ID token pela
  /// sessão da plataforma e guarda-a como qualquer outra.
  Future<void> _social(
    Future<({fb.AuthCredential credential, String? name})> Function() obtain,
  ) async {
    state = const AsyncLoading();
    try {
      final result = await obtain();
      final credential =
          await fb.FirebaseAuth.instance.signInWithCredential(result.credential);
      final idToken = await credential.user?.getIdToken();
      if (idToken == null) {
        throw Exception('O fornecedor não devolveu um token válido.');
      }

      final response = await ref.read(dioProvider).post('/auth/social', data: {
        'idToken': idToken,
        if (result.name != null && result.name!.isNotEmpty) 'name': result.name,
      });
      await _completeLogin(response.data as Map<String, dynamic>);
    } on _SignInCancelled {
      // Desistir não é um erro: volta ao ecrã como estava, sem mensagem.
      state = AsyncData(AuthState.unauthenticated());
    } on DioException catch (e) {
      state = AsyncError(_authErrorMessage(e, 'Erro ao iniciar sessão'), e.stackTrace);
    } catch (e, st) {
      state = AsyncError('Não foi possível iniciar sessão: $e', st);
    }
  }

  Future<({fb.AuthCredential credential, String? name})> _googleCredential() async {
    final account = await GoogleSignIn().signIn();
    if (account == null) throw _SignInCancelled();

    final auth = await account.authentication;
    return (
      credential: fb.GoogleAuthProvider.credential(
        idToken: auth.idToken,
        accessToken: auth.accessToken,
      ),
      name: account.displayName,
    );
  }

  Future<({fb.AuthCredential credential, String? name})> _appleCredential() async {
    final AuthorizationCredentialAppleID apple;
    try {
      apple = await SignInWithApple.getAppleIDCredential(
        scopes: const [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );
    } on SignInWithAppleAuthorizationException catch (e) {
      if (e.code == AuthorizationErrorCode.canceled) throw _SignInCancelled();
      rethrow;
    }

    // A Apple só envia o nome no primeiro início de sessão; daí ir à parte
    // para o backend o poder guardar nessa única oportunidade.
    final name = [apple.givenName, apple.familyName]
        .whereType<String>()
        .join(' ')
        .trim();

    return (
      credential: fb.OAuthProvider('apple.com').credential(
        idToken: apple.identityToken,
        accessToken: apple.authorizationCode,
      ),
      name: name.isEmpty ? null : name,
    );
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
      state = AsyncError(_authErrorMessage(e, 'Erro ao criar conta'), e.stackTrace);
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
  Future<void> resetPassword(String email, String code, String newPassword) async {
    final dio = ref.read(dioProvider);
    await dio.post('/auth/reset-password', data: {'email': email, 'code': code, 'newPassword': newPassword});
  }

  /// Change the current user's password from within the app (profile
  /// screen), confirming the current password server-side before applying
  /// the new one. Throws [DioException] on failure (e.g. wrong current
  /// password) — the caller reads `e.response?.data?['message']`.
  Future<void> changePassword(String currentPassword, String newPassword) async {
    final dio = ref.read(dioProvider);
    await dio.post('/auth/change-password', data: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
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

/// O utilizador fechou o ecrã do fornecedor. Distinguir isto de uma falha real
/// evita mostrar um erro a quem simplesmente mudou de ideias.
class _SignInCancelled implements Exception {}
