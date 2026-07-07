import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Required for pt_PT date formatting (month/day names) used across the app.
  await initializeDateFormatting('pt_PT', null);

  // Firebase is optional — only initialise when google-services.json is present
  try {
    // ignore: unused_import
    // Firebase.initializeApp() is called conditionally at runtime.
    // For development without Firebase credentials, skip silently.
    // ignore: avoid_print
    print('[main] Firebase skipped (no google-services.json)');
  } catch (_) {}

  runApp(const ProviderScope(child: MouraTechnicianApp()));
}

class MouraTechnicianApp extends ConsumerWidget {
  const MouraTechnicianApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    return MaterialApp.router(
      title: 'ResolvaAgora',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
