import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../core/services/auth_service.dart';
import '../../core/theme/app_theme.dart';

/// Fluxo de recuperação de palavra-passe em dois passos no mesmo ecrã:
/// 1) pedir o código por email; 2) introduzir o código + nova palavra-passe.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _emailCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool _codeSent = false;
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _codeCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  void _toast(String msg) => ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(msg)));

  Future<void> _sendCode() async {
    if (!_emailCtrl.text.contains('@')) {
      _toast('Introduz um email válido.');
      return;
    }
    setState(() => _loading = true);
    try {
      final devCode = await ref.read(authProvider.notifier).forgotPassword(_emailCtrl.text.trim());
      if (!mounted) return;
      setState(() => _codeSent = true);
      if (devCode != null) {
        _codeCtrl.text = devCode; // conveniência em ambiente de teste
        _toast('Código de teste preenchido: $devCode');
      } else {
        _toast('Se existir uma conta, enviámos um código por email.');
      }
    } catch (_) {
      _toast('Não foi possível enviar o código. Tenta novamente.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _reset() async {
    if (_codeCtrl.text.trim().isEmpty || _passCtrl.text.length < 8) {
      _toast('Indica o código e uma palavra-passe com pelo menos 8 caracteres.');
      return;
    }
    setState(() => _loading = true);
    try {
      await ref.read(authProvider.notifier).resetPassword(_codeCtrl.text.trim(), _passCtrl.text);
      if (!mounted) return;
      _toast('Palavra-passe redefinida. Inicia sessão.');
      context.go('/login');
    } on DioException catch (e) {
      _toast(e.response?.data?['message']?.toString() ?? 'Código inválido ou expirado.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.black87,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 8),
            const Text('Recuperar palavra-passe',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              _codeSent
                  ? 'Introduz o código que enviámos e escolhe uma nova palavra-passe.'
                  : 'Indica o teu email e enviamos um código de recuperação.',
              style: TextStyle(color: Colors.grey[600], fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 28),
            TextField(
              controller: _emailCtrl,
              enabled: !_codeSent,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(Icons.email_outlined)),
            ),
            if (_codeSent) ...[
              const SizedBox(height: 16),
              TextField(
                controller: _codeCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Código (6 dígitos)', prefixIcon: Icon(Icons.pin_outlined)),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passCtrl,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'Nova palavra-passe',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 28),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _loading ? null : (_codeSent ? _reset : _sendCode),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                ),
                child: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(_codeSent ? 'REDEFINIR PALAVRA-PASSE' : 'ENVIAR CÓDIGO',
                        style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
              ),
            ),
            if (_codeSent) ...[
              const SizedBox(height: 12),
              Center(
                child: TextButton(
                  onPressed: _loading ? null : _sendCode,
                  child: const Text('Reenviar código'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
