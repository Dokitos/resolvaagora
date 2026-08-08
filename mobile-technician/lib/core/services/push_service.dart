import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../router/app_router.dart';
import 'auth_service.dart';

/// Notificações push (FCM): pede permissão, obtém o token e regista-o no
/// backend. Só regista quando há sessão (o endpoint exige autenticação); é
/// idempotente e falha em silêncio.
class PushService {
  final Ref _ref;
  PushService(this._ref);

  bool _permissionAsked = false;
  // `init()` pode ser chamado mais do que uma vez (ex.: `fireImmediately`
  // seguido de um login real) — regista os listeners de tap uma única vez
  // para não navegar em duplicado quando a mesma notificação é reaberta.
  bool _tapListenersRegistered = false;

  Future<void> init() async {
    try {
      final messaging = FirebaseMessaging.instance;
      if (!_permissionAsked) {
        _permissionAsked = true;
        await messaging.requestPermission(alert: true, badge: true, sound: true);
      }
      final token = await messaging.getToken();
      if (token != null) await _register(token);
      // Regista automaticamente quando o token é renovado.
      messaging.onTokenRefresh.listen(_register);

      if (!_tapListenersRegistered) {
        _tapListenersRegistered = true;

        // App em background/foreground e o utilizador toca na notificação.
        FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

        // App estava totalmente fechada e foi aberta a partir do tap numa
        // notificação — verifica-se uma única vez no arranque.
        final initialMessage = await messaging.getInitialMessage();
        if (initialMessage != null) _handleNotificationTap(initialMessage);
      }
    } catch (_) {
      // Firebase pode não estar disponível (sem google-services.json) — ignora.
    }
  }

  /// Navega para o ecrã do pedido/trabalho referido pela notificação.
  ///
  /// O payload de dados do FCM segue a mesma forma usada nas notificações
  /// in-app / socket do backend (ver `notification-queue.consumer.ts`,
  /// método `deliver`): `{ serviceRequestId, ... }`. O ecrã de destino
  /// depende do papel do utilizador autenticado, já que esta app serve
  /// técnico, cliente e admin com rotas distintas (`app_router.dart`).
  void _handleNotificationTap(RemoteMessage message) {
    final serviceRequestId = message.data['serviceRequestId'] as String?;
    if (serviceRequestId == null || serviceRequestId.isEmpty) return;

    try {
      final auth = _ref.read(authProvider).valueOrNull;
      final router = _ref.read(appRouterProvider);

      if (auth?.isTechnician == true) {
        router.push('/jobs/$serviceRequestId');
      } else if (auth?.isAdmin == true) {
        router.push('/admin/requests/$serviceRequestId');
      } else {
        router.push('/client/services/$serviceRequestId');
      }
    } catch (_) {
      // O router pode ainda não estar pronto (ex.: mensagem tratada antes do
      // primeiro frame) — ignora em vez de arriscar um crash no arranque.
    }
  }

  Future<void> _register(String token) async {
    try {
      await _ref.read(dioProvider).post('/notifications/register-token', data: {
        'token': token,
        'platform': Platform.isIOS ? 'IOS' : 'ANDROID',
      });
    } catch (_) {
      // Sem sessão / offline → ignora; volta a tentar no próximo arranque.
    }
  }
}

final pushServiceProvider = Provider<PushService>((ref) => PushService(ref));
