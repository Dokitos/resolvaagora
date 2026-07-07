import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/auth_service.dart';
import '../../core/theme/app_theme.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  final String? from;
  const RegisterScreen({super.key, this.from});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _referral = TextEditingController();
  bool _obscure = true;

  @override
  void dispose() {
    for (final c in [_firstName, _lastName, _email, _phone, _password, _referral]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    await ref.read(authProvider.notifier).register(
          email: _email.text.trim(),
          password: _password.text,
          firstName: _firstName.text.trim(),
          lastName: _lastName.text.trim(),
          phone: _phone.text.trim(),
          referralCode: _referral.text.trim(),
        );

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
      context.go(widget.from?.isNotEmpty == true ? widget.from! : '/client/home');
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLoading = ref.watch(authProvider).isLoading;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
        title: const Text('Criar conta', style: TextStyle(color: Colors.black87)),
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text('Cria a tua conta de cliente',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text('É rápido — só precisas para concluir um pedido.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 14)),
              const SizedBox(height: 28),
              Row(
                children: [
                  Expanded(child: _field(_firstName, 'Nome', Icons.person_outline,
                      validator: (v) => (v?.trim().isNotEmpty ?? false) ? null : 'Obrigatório')),
                  const SizedBox(width: 12),
                  Expanded(child: _field(_lastName, 'Apelido', Icons.person_outline,
                      validator: (v) => (v?.trim().isNotEmpty ?? false) ? null : 'Obrigatório')),
                ],
              ),
              const SizedBox(height: 16),
              _field(_email, 'Email', Icons.email_outlined,
                  keyboard: TextInputType.emailAddress,
                  validator: (v) => (v?.contains('@') ?? false) ? null : 'Email inválido'),
              const SizedBox(height: 16),
              _field(_phone, 'Telefone (opcional)', Icons.phone_outlined,
                  keyboard: TextInputType.phone,
                  formatters: [FilteringTextInputFormatter.digitsOnly]),
              const SizedBox(height: 16),
              TextFormField(
                controller: _password,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
                validator: (v) => (v?.length ?? 0) >= 8 ? null : 'Mínimo 8 caracteres',
              ),
              const SizedBox(height: 16),
              _field(_referral, 'Código de referência (opcional)', Icons.card_giftcard_outlined,
                  keyboard: TextInputType.text),
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
                      : const Text('CRIAR CONTA', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Já tens conta?', style: TextStyle(color: Colors.grey[600])),
                  TextButton(
                    onPressed: () => context.pop(),
                    child: const Text('Entrar', style: TextStyle(color: AppTheme.brandRed, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon,
      {TextInputType? keyboard, List<TextInputFormatter>? formatters, String? Function(String?)? validator}) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboard,
      inputFormatters: formatters,
      validator: validator,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
    );
  }
}
