import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/technician_service.dart';
import '../../core/models/earning.dart';
import '../../core/utils/formatters.dart';
import '../../core/theme/app_theme.dart';

final earningsProvider = FutureProvider<EarningsSummary>((ref) {
  return ref.read(technicianServiceProvider).getEarnings();
});

class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final earningsAsync = ref.watch(earningsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Ganhos')),
      body: earningsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(earningsProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Summary cards
              Row(
                children: [
                  Expanded(child: _SummaryCard(
                    label: 'Total',
                    value: formatCurrency(data.total),
                    color: AppTheme.primary,
                    icon: Icons.euro,
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _SummaryCard(
                    label: 'Deslocações',
                    value: formatCurrency(data.displacement),
                    color: AppTheme.success,
                    icon: Icons.directions_car_outlined,
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _SummaryCard(
                    label: 'Serviços',
                    value: formatCurrency(data.service),
                    color: const Color(0xFF7C3AED),
                    icon: Icons.build_outlined,
                  )),
                ],
              ),
              const SizedBox(height: 20),
              const Text('Histórico', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 10),
              if (data.items.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(Icons.euro_outlined, size: 48, color: Colors.grey[300]),
                        const SizedBox(height: 12),
                        const Text('Sem ganhos registados',
                            style: TextStyle(color: Colors.grey, fontSize: 15)),
                      ],
                    ),
                  ),
                ),
              ...data.items.map((e) => _EarningTile(earning: e)),
            ],
          ),
        ),
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  const _SummaryCard({required this.label, required this.value, required this.color, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: color, size: 18),
            ),
            const SizedBox(height: 10),
            Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
          ],
        ),
      ),
    );
  }
}

class _EarningTile extends StatelessWidget {
  final Earning earning;
  const _EarningTile({required this.earning});

  @override
  Widget build(BuildContext context) {
    final isDisplacement = earning.type == 'DISPLACEMENT';
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: (isDisplacement ? AppTheme.success : const Color(0xFF7C3AED)).withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            isDisplacement ? Icons.directions_car_outlined : Icons.build_outlined,
            color: isDisplacement ? AppTheme.success : const Color(0xFF7C3AED),
            size: 20,
          ),
        ),
        title: Text(
          isDisplacement ? 'Taxa de deslocação' : 'Serviço concluído',
          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14),
        ),
        subtitle: Text(
          formatDate(earning.createdAt),
          style: TextStyle(color: Colors.grey[500], fontSize: 12),
        ),
        trailing: Text(
          formatCurrency(earning.amount),
          style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.success, fontSize: 15),
        ),
      ),
    );
  }
}
