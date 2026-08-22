import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

/// Origem de uma entrada do feed de comunicações.
enum CommunicationKind { notice, email, payment }

CommunicationKind _kindFrom(String raw) {
  switch (raw) {
    case 'EMAIL':
      return CommunicationKind.email;
    case 'PAYMENT':
      return CommunicationKind.payment;
    default:
      return CommunicationKind.notice;
  }
}

/// Uma entrada do feed: aviso da aplicação, email recebido ou pagamento.
class Communication {
  final String id;
  final CommunicationKind kind;
  final String title;
  final String? body;
  final double? amount;
  final bool read;
  final String? serviceRequestId;
  final DateTime createdAt;

  const Communication({
    required this.id,
    required this.kind,
    required this.title,
    required this.createdAt,
    this.body,
    this.amount,
    this.read = true,
    this.serviceRequestId,
  });

  factory Communication.fromJson(Map<String, dynamic> j) => Communication(
        id: j['id'] as String,
        kind: _kindFrom(j['kind'] as String? ?? 'NOTICE'),
        title: j['title'] as String? ?? '',
        body: j['body'] as String?,
        amount: j['amount'] == null ? null : double.parse(j['amount'].toString()),
        read: j['read'] as bool? ?? true,
        serviceRequestId: j['serviceRequestId'] as String?,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class CommunicationsPage {
  final List<Communication> items;

  /// Data do último item; `null` quando não há mais nada para carregar.
  final String? nextCursor;

  const CommunicationsPage({required this.items, this.nextCursor});
}

class CommunicationsService {
  final Ref _ref;
  CommunicationsService(this._ref);

  Future<CommunicationsPage> fetch({String? before}) async {
    final r = await _ref.read(dioProvider).get(
          '/technician/communications',
          queryParameters: {if (before != null) 'before': before},
        );
    final data = r.data as Map<String, dynamic>;
    return CommunicationsPage(
      items: (data['items'] as List)
          .map((e) => Communication.fromJson(e as Map<String, dynamic>))
          .toList(),
      nextCursor: data['nextCursor'] as String?,
    );
  }
}

final communicationsServiceProvider =
    Provider<CommunicationsService>((ref) => CommunicationsService(ref));

/// Primeira página do feed. As seguintes são pedidas pelo ecrã à medida que se
/// desce, para não guardar em memória histórico que ninguém está a ver.
final communicationsProvider = FutureProvider<CommunicationsPage>(
  (ref) => ref.read(communicationsServiceProvider).fetch(),
);
