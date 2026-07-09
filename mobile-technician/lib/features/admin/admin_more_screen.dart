import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/services/admin_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/theme/app_theme.dart';

class AdminMoreScreen extends ConsumerWidget {
  const AdminMoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fin = ref.watch(adminFinancialsProvider);
    final analytics = ref.watch(adminAnalyticsProvider);
    final techs = ref.watch(adminTechniciansProvider);
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(title: const Text('Mais'), backgroundColor: AppTheme.brandRed, foregroundColor: Colors.white, elevation: 0),
      body: RefreshIndicator(
        color: AppTheme.brandRed,
        onRefresh: () async {
          ref.invalidate(adminFinancialsProvider);
          ref.invalidate(adminAnalyticsProvider);
          ref.invalidate(adminTechniciansProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Financeiro
            _section('Financeiro', fin.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => const Text('Erro a carregar'),
              data: (f) {
                final disp = (f['displacement'] as Map?) ?? {};
                final comm = (f['commissions'] as Map?) ?? {};
                final subs = (f['subscriptions'] as Map?) ?? {};
                return Column(children: [
                  _row('Deslocações', fmt.format((disp['total'] as num?)?.toDouble() ?? 0), '${disp['count'] ?? 0}'),
                  _row('Comissões (serviços)', fmt.format((comm['total'] as num?)?.toDouble() ?? 0), '${comm['count'] ?? 0}'),
                  _row('Subscrições', fmt.format((subs['total'] as num?)?.toDouble() ?? 0), '${subs['count'] ?? 0}'),
                  const Divider(),
                  _row('Receita total', fmt.format((f['totalRevenue'] as num?)?.toDouble() ?? 0), '', bold: true),
                ]);
              },
            )),
            const SizedBox(height: 12),

            // Analytics
            _section('Analytics', analytics.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => const Text('Erro a carregar'),
              data: (a) => Column(children: [
                _row('Avaliação média', '${a['averageRating'] ?? 0} ★', ''),
                _row('Aceitação de orçamentos', '${a['quoteAcceptanceRate'] ?? 0}%', ''),
                _row('Taxa de conclusão', '${a['completionRate'] ?? 0}%', ''),
              ]),
            )),
            const SizedBox(height: 12),

            // Técnicos
            _section('Técnicos', techs.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => const Text('Erro a carregar'),
              data: (list) => Column(children: list.map((t) {
                final user = (t['user'] as Map?) ?? {};
                final count = (t['_count'] as Map?) ?? {};
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(backgroundColor: const Color(0xFFEEF2FF), child: const Icon(Icons.engineering, color: AppTheme.brandBlue, size: 20)),
                  title: Text('${t['firstName']} ${t['lastName']}', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                  subtitle: Text('${user['email'] ?? ''} · ${count['serviceRequests'] ?? 0} serviços', style: const TextStyle(fontSize: 12)),
                  trailing: _statusBadge('${t['status'] ?? ''}'),
                );
              }).toList()),
            )),
            const SizedBox(height: 12),

            // Definições da app (feature flags)
            const _AdminSettingsSection(),
            const SizedBox(height: 20),

            OutlinedButton.icon(
              onPressed: () {
                // O redirect do router encaminha para /login ao limpar a sessão.
                ref.read(authProvider.notifier).logout();
              },
              style: OutlinedButton.styleFrom(foregroundColor: AppTheme.brandRed, side: const BorderSide(color: AppTheme.brandRed), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
              icon: const Icon(Icons.logout),
              label: const Text('Terminar sessão', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 8),
            Center(child: Text('Para gestão de planos, SLA e promoções detalhadas, usa o painel web.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[400], fontSize: 11))),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _section(String title, Widget child) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          child,
        ]),
      );

  Widget _row(String label, String value, String sub, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[700], fontSize: 14))),
          if (sub.isNotEmpty) Padding(padding: const EdgeInsets.only(right: 8), child: Text('($sub)', style: TextStyle(color: Colors.grey[400], fontSize: 12))),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w600, color: bold ? AppTheme.brandRed : Colors.black87, fontSize: bold ? 16 : 14)),
        ]),
      );

  Widget _statusBadge(String s) {
    final ok = s == 'AVAILABLE';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(color: (ok ? const Color(0xFF16A34A) : Colors.grey).withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(ok ? 'Disponível' : s, style: TextStyle(fontSize: 10, color: ok ? const Color(0xFF16A34A) : Colors.grey)),
    );
  }
}

/// Secção de definições da app (flags) no painel admin mobile.
class _AdminSettingsSection extends ConsumerWidget {
  const _AdminSettingsSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settings = ref.watch(adminSettingsProvider);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Definições', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 8),
        settings.when(
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => const Text('Erro a carregar'),
          data: (s) {
            Future<void> patch(Map<String, dynamic> data) async {
              await ref.read(adminServiceProvider).updateSettings(data);
              ref.invalidate(adminSettingsProvider);
            }
            return Column(children: [
              _toggle('Modo de manutenção', 'Bloqueia novos pedidos.', s['maintenanceMode'] == true,
                  (v) => patch({'maintenanceMode': v}), danger: true),
              _toggle('Permitir registo de contas', null, s['registrationEnabled'] != false,
                  (v) => patch({'registrationEnabled': v})),
              _toggle('Pagamentos ativos', null, s['paymentsEnabled'] != false,
                  (v) => patch({'paymentsEnabled': v})),
              _toggle('Pagamentos em modo de teste', 'Simula pagamentos sem cobrar.', s['paymentsTestMode'] == true,
                  (v) => patch({'paymentsTestMode': v})),
            ]);
          },
        ),
      ]),
    );
  }

  Widget _toggle(String label, String? desc, bool value, ValueChanged<bool> onChanged, {bool danger = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
              if (desc != null) Text(desc, style: TextStyle(fontSize: 11, color: Colors.grey[500])),
            ]),
          ),
          Switch.adaptive(
            value: value,
            activeColor: danger ? AppTheme.danger : AppTheme.brandYellow,
            onChanged: onChanged,
          ),
        ]),
      );
}
