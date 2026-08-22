import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../router/app_router.dart';
import 'auth_service.dart';

/// Notificações push (FCM): pede permissão, obtém o token e regista-o no
/// backend. Só regista quando há sessão (o endpoint exige autenticação) e é
/// idempotente. Nunca deita o utilizador abaixo, mas regista as falhas no log
/// em vez de as engolir — um registo falhado é indistinguível de "não há
/// notificações" do lado de fora.
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

      if (!_tapListenersRegistered) {
        _tapListenersRegistered = true;

        // App em background/foreground e o utilizador toca na notificação.
        FirebaseMessaging.onMessageOpenedApp.listen(_handleNotificationTap);

        // App estava totalmente fechada e foi aberta a partir do tap numa
        // notificação — verifica-se uma única vez no arranque.
        final initialMessage = await messaging.getInitialMessage();
        if (initialMessage != null) _handleNotificationTap(initialMessage);

        // Fora do guard ficaria a registar um listener novo a cada `init()`.
        messaging.onTokenRefresh.listen(_register);
      }

      if (!_permissionAsked) {
        _permissionAsked = true;
        final settings =
            await messaging.requestPermission(alert: true, badge: true, sound: true);
        if (settings.authorizationStatus == AuthorizationStatus.denied) {
          debugPrint('PushService: notificações recusadas — sem token.');
          return;
        }
      }

      // No iOS as notificações não aparecem com a app aberta se isto não for
      // definido; no Android é ignorado.
      await messaging.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // No iOS o token do FCM só existe depois de o APNs entregar o dele. Se
      // `getToken()` for chamado antes, lança `apns-token-not-set` — era isso
      // que acontecia aqui: a exceção era engolida pelo catch, ficávamos sem
      // token nenhum e o registo só voltava a ser tentado no arranque
      // seguinte, onde a corrida se repetia. No Android não há esta etapa.
      if (Platform.isIOS && !await _waitForApnsToken(messaging)) return;

      final token = await messaging.getToken();
      if (token != null) await _register(token);
    } catch (e) {
      // Não pode voltar a ser silencioso: era o que escondia esta falha.
      debugPrint('PushService.init falhou: $e');
    }
  }

  /// Espera que o APNs entregue o token ao dispositivo (só iOS).
  ///
  /// Devolve `false` se não aparecer dentro do tempo limite — acontece quando
  /// o utilizador recusou as notificações ou não há rede no arranque.
  Future<bool> _waitForApnsToken(FirebaseMessaging messaging) async {
    for (var attempt = 0; attempt < 10; attempt++) {
      if (await messaging.getAPNSToken() != null) return true;
      await Future<void>.delayed(const Duration(seconds: 1));
    }
    debugPrint('PushService: APNs não devolveu token — sem push neste arranque.');
    return false;
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
