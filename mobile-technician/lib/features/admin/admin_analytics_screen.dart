import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/admin_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';

class AdminAnalyticsScreen extends ConsumerWidget {
  const AdminAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(adminAnalyticsProvider);
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Analytics'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: AppTheme.brandRed,
        onRefresh: () async => ref.invalidate(adminAnalyticsProvider),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            data.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
              ),
              error: (e, _) => _card('Erro', Text('Não foi possível carregar: $e')),
              data: (a) {
                final bySpec = (a['requestsBySpecialty'] as List?)
                        ?.map((e) => Map<String, dynamic>.from(e as Map))
                        .toList() ??
                    [];
                return Column(children: [
                  _card(
                    'Indicadores',
                    Column(children: [
                      _metric('Avaliação média', '${a['averageRating'] ?? 0} ★', Icons.star_rounded, AppTheme.brandYellow),
                      _metric('Aceitação de orçamentos', '${a['quoteAcceptanceRate'] ?? 0}%', Icons.check_circle_outline, AppTheme.success),
                      _metric('Taxa de conclusão', '${a['completionRate'] ?? 0}%', Icons.done_all, AppTheme.brandBlue),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  _bySpecialtyCard(bySpec),
                ]);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _bySpecialtyCard(List<Map<String, dynamic>> data) {
    if (data.isEmpty) {
      return _card('Pedidos por especialidade', Text('Sem dados.', style: TextStyle(color: Colors.grey[500])));
    }
    int maxV = 0;
    for (final d in data) {
      final c = (d['count'] as num?)?.toInt() ?? 0;
      if (c > maxV) maxV = c;
    }
    if (maxV <= 0) maxV = 1;
    return _card(
      'Pedidos por especialidade',
      Column(
        children: data.map((d) {
          final count = (d['count'] as num?)?.toInt() ?? 0;
          final key = d['specialty']?.toString() ?? '';
          final label = specialtyLabels[key] ?? key;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(children: [
              SizedBox(
                width: 96,
                child: Text(label, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis),
              ),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (count / maxV).clamp(0.0, 1.0),
                    minHeight: 14,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation(AppTheme.brandYellow),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 32,
                child: Text('$count',
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ]),
          );
        }).toList(),
      ),
    );
  }

  Widget _metric(String label, String value, IconData icon, Color color) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[700], fontSize: 14))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        ]),
      );

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
          const SizedBox(height: 12),
          child,
        ]),
      );
}
