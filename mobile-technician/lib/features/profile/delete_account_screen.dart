import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/api_client.dart';
import '../../core/services/auth_service.dart';
import '../../core/theme/app_theme.dart';

/// Eliminação da conta pelo próprio, exigida pela diretriz 5.1.1(v) da App
/// Store para qualquer app onde se possa criar conta.
///
/// O ecrã é deliberadamente explícito sobre o que desaparece e o que fica: a
/// lei obriga a guardar registos de faturação, e dizer "apagamos tudo" quando
/// não é verdade seria pior do que explicar a diferença.
class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() => _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen> {
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _confirmAndDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar a conta?'),
        content: const Text(
          'Esta ação não pode ser anulada. Perde o acesso à conta e o histórico '
          'deixa de estar disponível na aplicação.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.danger),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      await ref.read(dioProvider).post('/auth/delete-account', data: {
        if (_password.text.isNotEmpty) 'password': _password.text,
      });
      if (!mounted) return;
      // Termina a sessão: o router encaminha para o ecrã de entrada assim que
      // o estado deixa de estar autenticado.
      await ref.read(authProvider.notifier).logout();
    } on DioException catch (e) {
      final data = e.response?.data;
      final message = data is Map && data['message'] != null
          ? data['message'].toString()
          : 'Não foi possível eliminar a conta. Tente novamente.';
      if (mounted) setState(() => _error = message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Não foi possível eliminar a conta. Tente novamente.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Eliminar conta')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.danger.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.warning_amber_rounded, color: AppTheme.danger),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Ao eliminar a conta perde o acesso imediatamente. '
                    'Esta ação não pode ser anulada.',
                    style: TextStyle(color: Colors.red[900], fontSize: 13),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const _Section(
            title: 'O que é eliminado',
            items: [
              'Nome, telefone, NIF e fotografia',
              'Moradas guardadas',
              'Notificações e mensagens de apoio',
              'Contas Apple ou Google associadas',
            ],
          ),
          const SizedBox(height: 20),
          const _Section(
            title: 'O que é mantido, sem o identificar',
            items: [
              'Faturas e registos de pagamento, que a lei obriga a guardar',
              'Histórico dos serviços já concluídos',
            ],
          ),
          const SizedBox(height: 24),
          Text(
            'Se tiver pedidos em curso, conclua-os ou cancele-os primeiro. '
            'Uma subscrição ativa é cancelada automaticamente.',
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(
              labelText: 'Palavra-passe',
              helperText: 'Se entrou com Apple ou Google, deixe em branco.',
              border: OutlineInputBorder(),
            ),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 13)),
          ],
          const SizedBox(height: 24),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _busy ? null : _confirmAndDelete,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.danger,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: _busy
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Text(
                      'Eliminar a minha conta',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<String> items;
  const _Section({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        const SizedBox(height: 8),
        for (final item in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('•  ', style: TextStyle(color: Colors.grey[500])),
                Expanded(
                  child: Text(
                    item,
                    style: TextStyle(color: Colors.grey[700], fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}
