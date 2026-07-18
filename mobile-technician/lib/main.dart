import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/i18n/locale_provider.dart';
import 'core/router/app_router.dart';
import 'core/services/auth_service.dart';
import 'core/services/push_service.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Required for pt_PT date formatting (month/day names) used across the app.
  await initializeDateFormatting('pt_PT', null);

  // Firebase (notificações push). Não bloqueia o arranque se falhar.
  try {
    await Firebase.initializeApp();
  } catch (_) {
    // Sem google-services.json / config → segue sem push.
  }

  runApp(const ProviderScope(child: MouraTechnicianApp()));
}

class MouraTechnicianApp extends ConsumerWidget {
  const MouraTechnicianApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeProvider);

    // Regista o token de push sempre que há sessão (login ou arranque já
    // autenticado). É idempotente e não bloqueia a UI.
    ref.listen(authProvider, (prev, next) {
      if (next.valueOrNull?.isAuthenticated == true) {
        ref.read(pushServiceProvider).init();
      }
    });

    return MaterialApp.router(
      title: 'ResolvaAgora',
      theme: AppTheme.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
      locale: locale,
      supportedLocales: supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
    );
  }
}
