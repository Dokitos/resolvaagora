import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

class AppSettings {
  final bool maintenanceMode;
  final String? maintenanceMessage;
  final bool registrationEnabled;
  final bool paymentsEnabled;
  final bool paymentsTestMode;
  final bool smsVerificationEnabled;

  const AppSettings({
    this.maintenanceMode = false,
    this.maintenanceMessage,
    this.registrationEnabled = true,
    this.paymentsEnabled = true,
    this.paymentsTestMode = true,
    this.smsVerificationEnabled = false,
  });

  factory AppSettings.fromJson(Map<String, dynamic> j) => AppSettings(
        maintenanceMode: j['maintenanceMode'] as bool? ?? false,
        maintenanceMessage: j['maintenanceMessage'] as String?,
        registrationEnabled: j['registrationEnabled'] as bool? ?? true,
        paymentsEnabled: j['paymentsEnabled'] as bool? ?? true,
        paymentsTestMode: j['paymentsTestMode'] as bool? ?? true,
        smsVerificationEnabled: j['smsVerificationEnabled'] as bool? ?? false,
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
