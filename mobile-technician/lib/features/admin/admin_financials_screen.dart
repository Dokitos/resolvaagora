import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/services/admin_service.dart';
import '../../core/theme/app_theme.dart';

/// Parâmetros do filtro de datas (from/to em ISO yyyy-MM-dd).
class _FinRange {
  final String? from;
  final String? to;
  const _FinRange(this.from, this.to);

  // IMPORTANTE: o family do Riverpod compara os argumentos. Sem igualdade
  // estrutural, cada build criava um provider novo → pedido infinito (loading
  // eterno no ecrã Financeiro).
  @override
  bool operator ==(Object other) =>
      identical(this, other) || (other is _FinRange && other.from == from && other.to == to);

  @override
  int get hashCode => Object.hash(from, to);
}

final _adminFinancialsRangeProvider =
    FutureProvider.family<Map<String, dynamic>, _FinRange>((ref, range) {
  return ref.read(adminServiceProvider).financials(from: range.from, to: range.to);
});

class AdminFinancialsScreen extends ConsumerStatefulWidget {
  const AdminFinancialsScreen({super.key});

  @override
  ConsumerState<AdminFinancialsScreen> createState() => _AdminFinancialsScreenState();
}

class _AdminFinancialsScreenState extends ConsumerState<AdminFinancialsScreen> {
  DateTime? _from;
  DateTime? _to;

  final _fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
  final _iso = DateFormat('yyyy-MM-dd');
  final _short = DateFormat('dd/MM');

  _FinRange get _range => _FinRange(
        _from == null ? null : _iso.format(_from!),
        _to == null ? null : _iso.format(_to!),
      );

  Future<void> _pick(bool isFrom) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: (isFrom ? _from : _to) ?? now,
      firstDate: DateTime(now.year - 3),
      lastDate: DateTime(now.year + 1),
    );
    if (picked != null) {
      setState(() {
        if (isFrom) {
          _from = picked;
        } else {
          _to = picked;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(_adminFinancialsRangeProvider(_range));
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Financeiro'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: AppTheme.brandRed,
        onRefresh: () async => ref.invalidate(_adminFinancialsRangeProvider(_range)),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _filterCard(),
            const SizedBox(height: 12),
            data.when(
              loading: () => const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
              ),
              error: (e, _) => _card('Erro', Text('Não foi possível carregar: $e')),
              data: (f) {
                final disp = (f['displacement'] as Map?) ?? {};
                final comm = (f['commissions'] as Map?) ?? {};
                final subs = (f['subscriptions'] as Map?) ?? {};
                final breakdown =
                    (f['breakdown'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [];
                return Column(children: [
                  _card(
                    'Resumo',
                    Column(children: [
                      _row('Deslocações', _money(disp['total']), '${disp['count'] ?? 0}'),
                      _row('Comissões (serviços)', _money(comm['total']), '${comm['count'] ?? 0}'),
                      _row('Subscrições', _money(subs['total']), '${subs['count'] ?? 0}'),
                      const Divider(),
                      _row('Receita total', _money(f['totalRevenue']), '', bold: true),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  _breakdownCard(breakdown),
                ]);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterCard() => _card(
        'Intervalo',
        Row(children: [
          Expanded(child: _dateBtn('De', _from)),
          const SizedBox(width: 8),
          Expanded(child: _dateBtn('Até', _to)),
          if (_from != null || _to != null)
            IconButton(
              tooltip: 'Limpar',
              icon: const Icon(Icons.clear, size: 20),
              onPressed: () => setState(() {
                _from = null;
                _to = null;
              }),
            ),
        ]),
      );

  Widget _dateBtn(String label, DateTime? value) => OutlinedButton.icon(
        onPressed: () => _pick(label == 'De'),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.black87,
          side: BorderSide(color: Colors.grey.shade300),
          padding: const EdgeInsets.symmetric(vertical: 12),
        ),
        icon: const Icon(Icons.calendar_today, size: 16),
        label: Text(value == null ? label : _iso.format(value), style: const TextStyle(fontSize: 13)),
      );

  Widget _breakdownCard(List<Map<String, dynamic>> breakdown) {
    if (breakdown.isEmpty) {
      return _card('Por dia', Text('Sem dados no intervalo.', style: TextStyle(color: Colors.grey[500])));
    }
    double maxV = 0;
    for (final b in breakdown) {
      final t = (b['total'] as num?)?.toDouble() ?? 0;
      if (t > maxV) maxV = t;
    }
    if (maxV <= 0) maxV = 1;
    return _card(
      'Por dia',
      Column(
        children: breakdown.map((b) {
          final total = (b['total'] as num?)?.toDouble() ?? 0;
          final dateStr = b['date']?.toString() ?? '';
          DateTime? d;
          try {
            d = DateTime.parse(dateStr);
          } catch (_) {}
          final label = d != null ? _short.format(d) : dateStr;
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(children: [
              SizedBox(width: 44, child: Text(label, style: const TextStyle(fontSize: 12))),
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (total / maxV).clamp(0.0, 1.0),
                    minHeight: 14,
                    backgroundColor: Colors.grey.shade200,
                    valueColor: const AlwaysStoppedAnimation(AppTheme.brandYellow),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              SizedBox(
                width: 70,
                child: Text(_fmt.format(total),
                    textAlign: TextAlign.right,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              ),
            ]),
          );
        }).toList(),
      ),
    );
  }

  String _money(dynamic v) => _fmt.format((v as num?)?.toDouble() ?? 0);

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

  Widget _row(String label, String value, String sub, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[700], fontSize: 14))),
          if (sub.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: Text('($sub)', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
            ),
          Text(value,
              style: TextStyle(
                  fontWeight: bold ? FontWeight.bold : FontWeight.w600,
                  color: bold ? AppTheme.brandRed : Colors.black87,
                  fontSize: bold ? 16 : 14)),
        ]),
      );
}
