import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

class AppSettings {
  final bool maintenanceMode;
  final String? maintenanceMessage;
  final bool registrationEnabled;
  final bool paymentsEnabled;
  final bool paymentsTestMode;
  final bool smsVerificationEnabled;
  final bool smsConfigured;
  final double displacementFee;
  final String stripePublishableKey;

  const AppSettings({
    this.maintenanceMode = false,
    this.maintenanceMessage,
    this.registrationEnabled = true,
    this.paymentsEnabled = true,
    this.paymentsTestMode = true,
    this.smsVerificationEnabled = false,
    this.smsConfigured = false,
    this.displacementFee = 25.0,
    this.stripePublishableKey = '',
  });

  /// A app só exige o código SMS quando a verificação está ligada E a Twilio
  /// está configurada no servidor.
  bool get otpRequired => smsVerificationEnabled && smsConfigured;

  factory AppSettings.fromJson(Map<String, dynamic> j) => AppSettings(
        maintenanceMode: j['maintenanceMode'] as bool? ?? false,
        maintenanceMessage: j['maintenanceMessage'] as String?,
        registrationEnabled: j['registrationEnabled'] as bool? ?? true,
        paymentsEnabled: j['paymentsEnabled'] as bool? ?? true,
        paymentsTestMode: j['paymentsTestMode'] as bool? ?? true,
        smsVerificationEnabled: j['smsVerificationEnabled'] as bool? ?? false,
        smsConfigured: j['smsConfigured'] as bool? ?? false,
        displacementFee: (j['displacementFee'] as num?)?.toDouble() ?? 25.0,
        stripePublishableKey: j['stripePublishableKey'] as String? ?? '',
      );
}

/// Public app-wide flags (maintenance, registration, payments). Safe to read
/// before login. Falls back to permissive defaults if the request fails.
final appSettingsProvider = FutureProvider<AppSettings>((ref) async {
  try {
    final dio = ref.read(dioProvider);
    final r = await dio.get('/settings/public');
    return AppSettings.fromJson(Map<String, dynamic>.from(r.data as Map));
  } catch (_) {
    return const AppSettings();
  }
});
