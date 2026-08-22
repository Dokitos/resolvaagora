import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/push_service.dart';
import '../../core/theme/app_theme.dart';

/// Diagnóstico das notificações push, passo a passo.
///
/// No iOS qualquer falha na cadeia (permissão → token APNs → token FCM →
/// registo no backend) produz o mesmo sintoma: não chega nada. Os logs do
/// dispositivo só se leem com um Mac, por isso o diagnóstico vive aqui, no
/// próprio telemóvel.
///
/// Os textos estão em português direto, sem passar pelo `AppLocalizations`:
/// é um ecrã de manutenção, não faz parte do produto.
class PushDiagnosticsPage extends ConsumerStatefulWidget {
  const PushDiagnosticsPage({super.key});

  @override
  ConsumerState<PushDiagnosticsPage> createState() => _PushDiagnosticsPageState();
}

class _PushDiagnosticsPageState extends ConsumerState<PushDiagnosticsPage> {
  Future<PushDiagnostics>? _future;

  @override
  void initState() {
    super.initState();
    _run();
  }

  void _run() {
    setState(() => _future = ref.read(pushServiceProvider).diagnose());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Diagnóstico de notificações'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Voltar a verificar',
            onPressed: _run,
          ),
        ],
      ),
      body: FutureBuilder<PushDiagnostics>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return _Message('A verificação falhou: ${snapshot.error}');
          }

          final d = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _Row('Plataforma', d.platform, ok: true),
              _Row(
                'Permissão',
                d.permission,
                ok: d.permission == 'authorized' || d.permission == 'provisional',
              ),
              if (d.platform == 'iOS')
                _Row(
                  'Token APNs',
                  d.apnsToken == null ? 'em falta' : 'recebido',
                  ok: d.apnsToken != null,
                ),
              _Row(
                'Token FCM',
                d.fcmToken == null ? 'em falta' : 'recebido',
                ok: d.fcmToken != null,
              ),
              _Row(
                'Registo no servidor',
                d.registration ?? 'não tentado',
                ok: d.registration == 'ok',
              ),
              if (d.error != null) ...[
                const SizedBox(height: 16),
                const Text('Erro', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                SelectableText(d.error!, style: const TextStyle(fontSize: 13)),
              ],
              if (d.fcmToken != null) ...[
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  icon: const Icon(Icons.copy, size: 18),
                  label: const Text('Copiar token FCM'),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: d.fcmToken!));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Token copiado.')),
                    );
                  },
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool ok;
  const _Row(this.label, this.value, {required this.ok});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        children: [
          Icon(
            ok ? Icons.check_circle : Icons.cancel,
            size: 20,
            color: ok ? Colors.green : AppTheme.brandRed,
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(color: Colors.grey[600], fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

class _Message extends StatelessWidget {
  final String text;
  const _Message(this.text);

  @override
  Widget build(BuildContext context) =>
      Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(text)));
}
