import 'dart:io' show Platform;
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

/// Notificações push (FCM): pede permissão, obtém o token e regista-o no
/// backend. Só regista quando há sessão (o endpoint exige autenticação); é
/// idempotente e falha em silêncio.
class PushService {
  final Ref _ref;
  PushService(this._ref);

  bool _permissionAsked = false;

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
    } catch (_) {
      // Firebase pode não estar disponível (sem google-services.json) — ignora.
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
