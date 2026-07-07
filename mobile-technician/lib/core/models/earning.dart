double _toDouble(dynamic v, [double fallback = 0.0]) =>
    v == null ? fallback : double.parse(v.toString());

class Earning {
  final String id;
  final String type;
  final double amount;
  final String? serviceRequestId;
  final DateTime createdAt;

  const Earning({
    required this.id,
    required this.type,
    required this.amount,
    this.serviceRequestId,
    required this.createdAt,
  });

  factory Earning.fromJson(Map<String, dynamic> j) => Earning(
    id: j['id'] as String,
    type: j['type'] as String,
    amount: _toDouble(j['amount']),
    serviceRequestId: j['serviceRequestId'] as String?,
    createdAt: DateTime.parse((j['earnedAt'] ?? j['createdAt']) as String),
  );
}

class EarningsSummary {
  final double total;
  final double displacement;
  final double service;
  final List<Earning> items;

  const EarningsSummary({
    required this.total,
    required this.displacement,
    required this.service,
    required this.items,
  });

  factory EarningsSummary.fromJson(Map<String, dynamic> j) {
    final items = (j['earnings'] as List<dynamic>? ?? j['items'] as List<dynamic>? ?? [])
        .map((e) => Earning.fromJson(e as Map<String, dynamic>))
        .toList();
    final total = _toDouble(j['total']);
    final displacement = items
        .where((e) => e.type == 'DISPLACEMENT')
        .fold(0.0, (sum, e) => sum + e.amount);
    final service = items
        .where((e) => e.type == 'SERVICE')
        .fold(0.0, (sum, e) => sum + e.amount);
    return EarningsSummary(
      total: total,
      displacement: displacement,
      service: service,
      items: items,
    );
  }
}
