import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/i18n/language_selector.dart';
import '../../core/services/auth_service.dart';
import '../../core/services/settings_service.dart';
import '../../core/theme/app_theme.dart';

class LoginScreen extends ConsumerStatefulWidget {
  final String? from;
  const LoginScreen({super.key, this.from});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authProvider.notifier).login(_emailCtrl.text.trim(), _passCtrl.text);

    if (!mounted) return;
    final authState = ref.read(authProvider);
    if (authState.hasError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(authState.error.toString()), backgroundColor: AppTheme.danger),
      );
      return;
    }
    final auth = authState.valueOrNull;
    if (auth?.isAuthenticated == true) {
      if (auth!.isClient) {
        // Só honra `from` se for uma rota válida para o cliente; caso contrário
        // (ex.: /profile capturado quando um técnico saiu) vai para a home.
        final from = widget.from;
        final validForClient = from != null &&
            (from.startsWith('/client') || from.startsWith('/booking'));
        context.go(validForClient ? from : '/client/home');
      } else if (auth.isAdmin) {
        context.go('/admin/home');
      } else {
        context.go('/schedule'); // technician
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider).isLoading;
    final registrationEnabled = ref.watch(appSettingsProvider).valueOrNull?.registrationEnabled ?? true;
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: l.back,
          // Volta ao ecrã anterior; se não houver (ex.: chegámos aqui por
          // redirect de logout), vai para a página inicial pública.
          onPressed: () => context.canPop() ? context.pop() : context.go('/client/home'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.language),
            tooltip: 'Idioma / Language',
            onPressed: () => showLanguageSelector(context, ref),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppTheme.brandBlack,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    alignment: Alignment.center,
                    child: const Text('RA', style: TextStyle(color: AppTheme.brandYellow, fontSize: 22, fontWeight: FontWeight.w900)),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('ResolvaAgora', textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(l.loginWelcomeBack,
                    textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[500], fontSize: 14)),
                const SizedBox(height: 36),
                TextFormField(
                  controller: _emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: InputDecoration(labelText: l.fieldEmail, prefixIcon: const Icon(Icons.email_outlined)),
                  validator: (v) => (v?.contains('@') ?? false) ? null : l.emailInvalid,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passCtrl,
                  obscureText: _obscure,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _submit(),
                  decoration: InputDecoration(
                    labelText: l.fieldPassword,
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) => (v?.length ?? 0) >= 6 ? null : l.passwordMin,
                ),
                const SizedBox(height: 28),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brandRed,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: isLoading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(l.loginButton, style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: TextButton(
                    onPressed: () => context.push('/forgot-password'),
                    child: Text(l.forgotPassword,
                        style: const TextStyle(color: AppTheme.brandBlue, fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 4),
                if (registrationEnabled)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(l.noAccountYet, style: TextStyle(color: Colors.grey[600])),
                      TextButton(
                        onPressed: () {
                          final q = widget.from?.isNotEmpty == true ? '?from=${Uri.encodeComponent(widget.from!)}' : '';
                          context.push('/register$q');
                        },
                        child: Text(l.createAccount, style: const TextStyle(color: AppTheme.brandRed, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
