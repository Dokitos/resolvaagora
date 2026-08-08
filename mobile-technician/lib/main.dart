import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';
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

class MouraTechnicianApp extends ConsumerStatefulWidget {
  const MouraTechnicianApp({super.key});

  @override
  ConsumerState<MouraTechnicianApp> createState() => _MouraTechnicianAppState();
}

class _MouraTechnicianAppState extends ConsumerState<MouraTechnicianApp> {
  ProviderSubscription<AsyncValue<AuthState>>? _authSub;

  @override
  void initState() {
    super.initState();

    // Regista o token de push sempre que há sessão (login ou arranque já
    // autenticado). Isto usa `ref.listenManual` (em vez de `ref.listen` no
    // `build`) precisamente para poder usar `fireImmediately: true`: garante
    // que também corre logo no arranque quando a app já tem uma sessão
    // guardada — sem isto, o registo ficava dependente do timing de uma
    // transição de estado a acontecer DEPOIS do listener estar registado
    // (ex.: só disparava com um login manual, não com uma sessão já
    // autenticada ao abrir a app). `init()` é idempotente e não bloqueia a
    // UI; `prev` é `null` nesta primeira chamada e não é usado na condição,
    // por isso não há risco de crash.
    _authSub = ref.listenManual(authProvider, (prev, next) {
      if (next.valueOrNull?.isAuthenticated == true) {
        ref.read(pushServiceProvider).init();
      }
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    _authSub?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final locale = ref.watch(localeProvider);

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
