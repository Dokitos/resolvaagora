import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/technician_service.dart';
import '../../core/models/earning.dart';
import '../../core/utils/formatters.dart';
import '../../core/theme/app_theme.dart';

/// Período selecionado nos Ganhos. Por defeito 'all' — assim o técnico vê
/// sempre o histórico completo, e não só o mês atual.
final earningsPeriodProvider = StateProvider<String>((ref) => 'all');

final earningsProvider = FutureProvider<EarningsSummary>((ref) {
  final period = ref.watch(earningsPeriodProvider);
  return ref.read(technicianServiceProvider).getEarnings(period: period);
});

/// Seletor de período dos ganhos (Semana / Mês / Tudo).
class _PeriodSelector extends ConsumerWidget {
  const _PeriodSelector();

  static const _options = [
    ('week', 'Semana'),
    ('month', 'Mês'),
    ('all', 'Tudo'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final selected = ref.watch(earningsPeriodProvider);
    return Row(
      children: [
        for (final (value, label) in _options) ...[
          Expanded(
            child: GestureDetector(
              onTap: () => ref.read(earningsPeriodProvider.notifier).state = value,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: selected == value ? AppTheme.primary : Colors.white,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: selected == value ? AppTheme.primary : Colors.grey.shade300,
                  ),
                ),
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: selected == value ? Colors.white : Colors.grey[700],
                  ),
                ),
              ),
            ),
          ),
          if (value != _options.last.$1) const SizedBox(width: 8),
        ],
      ],
    );
  }
}

class EarningsScreen extends ConsumerWidget {
  const EarningsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final earningsAsync = ref.watch(earningsProvider);
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(title: Text(l.earningsTitle)),
      body: earningsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (data) => RefreshIndicator(
          onRefresh: () async => ref.invalidate(earningsProvider),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const _PeriodSelector(),
              const SizedBox(height: 14),
              // Summary cards
              Row(
                children: [
                  Expanded(child: _SummaryCard(
                    label: l.priceTotal,
                    value: formatCurrency(data.total),
                    color: AppTheme.primary,
                    icon: Icons.euro,
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _SummaryCard(
                    label: l.displacements,
                    value: formatCurrency(data.displacement),
                    color: AppTheme.success,
                    icon: Icons.directions_car_outlined,
                  )),
                  const SizedBox(width: 10),
                  Expanded(child: _SummaryCard(
                    label: l.services,
                    value: formatCurrency(data.service),
                    color: const Color(0xFF7C3AED),
                    icon: Icons.build_outlined,
                  )),
                ],
              ),
              const SizedBox(height: 20),
              Text(l.history, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
              const SizedBox(height: 10),
              if (data.items.isEmpty)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      children: [
                        Icon(Icons.euro_outlined, size: 48, color: Colors.grey[300]),
                        const SizedBox(height: 12),
                        Text(l.noEarnings,
                            style: const TextStyle(color: Colors.grey, fontSize: 15)),
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
          isDisplacement ? AppLocalizations.of(context).priceDisplacement : AppLocalizations.of(context).serviceCompleted,
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
