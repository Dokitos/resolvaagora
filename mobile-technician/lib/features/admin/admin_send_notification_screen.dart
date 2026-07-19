import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/admin_service.dart';
import '../../core/theme/app_theme.dart';

/// Ecrã admin para enviar uma notificação push personalizada
/// para todos os clientes ou todos os técnicos.
class AdminSendNotificationScreen extends ConsumerStatefulWidget {
  const AdminSendNotificationScreen({super.key});

  @override
  ConsumerState<AdminSendNotificationScreen> createState() =>
      _AdminSendNotificationScreenState();
}

class _AdminSendNotificationScreenState
    extends ConsumerState<AdminSendNotificationScreen> {
  final _titleCtrl = TextEditingController();
  final _bodyCtrl = TextEditingController();
  String _target = 'ALL_CLIENTS';
  bool _sending = false;
  Map<String, dynamic>? _result;

  @override
  void dispose() {
    _titleCtrl.dispose();
    _bodyCtrl.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final title = _titleCtrl.text.trim();
    final body = _bodyCtrl.text.trim();
    if (title.isEmpty || body.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Preenche o título e a mensagem.')),
      );
      return;
    }
    setState(() {
      _sending = true;
      _result = null;
    });
    try {
      final res = await ref.read(adminServiceProvider).broadcast(
            target: _target,
            title: title,
            body: body,
          );
      if (!mounted) return;
      setState(() => _result = res);
      final sent = res['sent'] ?? 0;
      final delivered = res['pushDelivered'] ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.success,
          content: Text('Enviado a $sent destinatário(s) · $delivered push entregues.'),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.danger,
          content: Text('Erro ao enviar: $e'),
        ),
      );
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Enviar notificação'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _card(
            'Destino',
            Column(children: [
              RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                activeColor: AppTheme.brandRed,
                value: 'ALL_CLIENTS',
                groupValue: _target,
                onChanged: (v) => setState(() => _target = v!),
                title: const Text('Clientes'),
                secondary: const Icon(Icons.people_alt_outlined),
              ),
              RadioListTile<String>(
                contentPadding: EdgeInsets.zero,
                activeColor: AppTheme.brandRed,
                value: 'ALL_TECHNICIANS',
                groupValue: _target,
                onChanged: (v) => setState(() => _target = v!),
                title: const Text('Técnicos'),
                secondary: const Icon(Icons.engineering_outlined),
              ),
            ]),
          ),
          const SizedBox(height: 12),
          _card(
            'Mensagem',
            Column(children: [
              TextField(
                controller: _titleCtrl,
                maxLength: 80,
                decoration: const InputDecoration(
                  labelText: 'Título',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _bodyCtrl,
                maxLines: 4,
                maxLength: 240,
                decoration: const InputDecoration(
                  labelText: 'Corpo da mensagem',
                  alignLabelWithHint: true,
                  border: OutlineInputBorder(),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _sending ? null : _send,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.brandRed,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            icon: _sending
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.send),
            label: Text(_sending ? 'A enviar...' : 'Enviar notificação',
                style: const TextStyle(fontWeight: FontWeight.bold)),
          ),
          if (_result != null) ...[
            const SizedBox(height: 16),
            _card(
              'Resultado',
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _resRow('Destinatários', '${_result!['sent'] ?? 0}'),
                _resRow('Tokens push', '${_result!['pushTokens'] ?? 0}'),
                _resRow('Push entregues', '${_result!['pushDelivered'] ?? 0}'),
              ]),
            ),
          ],
        ],
      ),
    );
  }

  Widget _card(String title, Widget child) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          child,
        ]),
      );

  Widget _resRow(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[700]))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ]),
      );
}
