import 'package:flutter/material.dart';
import '../../core/widgets/onboarding_overlay.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/services/admin_service.dart';
import '../../core/services/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../client/services/service_status_ui.dart';
import '../../core/models/service_request.dart';

class AdminDashboardScreen extends ConsumerWidget {
  const AdminDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(adminDashboardProvider);
    final name = ref.watch(authProvider).valueOrNull?.name ?? 'Admin';
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: RefreshIndicator(
        color: AppTheme.brandRed,
        onRefresh: () async => ref.invalidate(adminDashboardProvider),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const OnboardingTrigger(role: OnboardingRole.admin),
            Container(
              color: AppTheme.brandRed,
              padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 20, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Painel de Administração', style: TextStyle(color: Colors.white70, fontSize: 13)),
                  const SizedBox(height: 2),
                  Text('Olá, $name', style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            data.when(
              loading: () => const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator(color: AppTheme.brandRed))),
              error: (e, _) => Padding(
                padding: const EdgeInsets.all(24),
                child: Column(children: [
                  const Text('Não foi possível carregar o dashboard', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: () => ref.invalidate(adminDashboardProvider), child: const Text('Tentar novamente')),
                ]),
              ),
              data: (d) {
                final today = (d['today'] as Map?) ?? {};
                final byStatus = (d['byStatus'] as List?) ?? [];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Expanded(child: _stat('Pedidos hoje', '${today['totalRequests'] ?? 0}', Icons.assignment_outlined, AppTheme.brandBlue)),
                          const SizedBox(width: 12),
                          Expanded(child: _stat('Receita hoje', fmt.format((today['revenue'] as num?)?.toDouble() ?? 0), Icons.euro, const Color(0xFF16A34A))),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(child: _stat('Técnicos ativos', '${d['activeTechnicians'] ?? 0}', Icons.engineering_outlined, AppTheme.brandBlue)),
                          const SizedBox(width: 12),
                          Expanded(child: _stat('Alertas SLA', '${d['activeAlerts'] ?? 0}', Icons.warning_amber_outlined, AppTheme.brandRed)),
                        ],
                      ),
                      const SizedBox(height: 20),
                      if (byStatus.isNotEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Pedidos por estado', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8, runSpacing: 8,
                                children: byStatus.map((s) {
                                  final st = ServiceStatus.values.firstWhere((e) => e.name == s['status'], orElse: () => ServiceStatus.ASSIGNED);
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(20)),
                                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                                      statusChip(st),
                                      const SizedBox(width: 6),
                                      Text('${s['count']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                    ]),
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () => context.go('/admin/requests'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.brandRed, foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          icon: const Icon(Icons.assignment_outlined),
                          label: const Text('Ver todos os pedidos'),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        ],
      ),
    );
  }
}
