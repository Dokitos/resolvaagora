import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

/// Uma mensagem trocada entre o cliente e o técnico de um pedido.
class ServiceMessage {
  final String id;
  final String body;
  final String senderId;
  final String senderName;
  final String senderRole;
  final DateTime createdAt;
  final DateTime? readAt;

  const ServiceMessage({
    required this.id,
    required this.body,
    required this.senderId,
    required this.senderName,
    required this.senderRole,
    required this.createdAt,
    this.readAt,
  });

  factory ServiceMessage.fromJson(Map<String, dynamic> j) => ServiceMessage(
        id: j['id'] as String,
        body: j['body'] as String,
        senderId: j['senderId'] as String,
        senderName: j['senderName'] as String? ?? '',
        senderRole: j['senderRole'] as String? ?? '',
        createdAt: DateTime.parse(j['createdAt'] as String),
        readAt: j['readAt'] == null ? null : DateTime.parse(j['readAt'] as String),
      );
}

/// Conversa carregada, com o estado de escrita já resolvido pelo servidor.
class Conversation {
  final List<ServiceMessage> messages;

  /// `false` quando o serviço ainda não tem técnico ou já terminou.
  final bool canSend;

  /// Explicação a mostrar quando [canSend] é `false`.
  final String? closedReason;

  const Conversation({
    required this.messages,
    required this.canSend,
    this.closedReason,
  });
}

/// Resumo para a lista de conversas.
class ConversationSummary {
  final String serviceRequestId;
  final String specialty;
  final String counterpart;
  final String lastMessage;
  final DateTime? lastMessageAt;
  final int unread;
  final bool open;

  const ConversationSummary({
    required this.serviceRequestId,
    required this.specialty,
    required this.counterpart,
    required this.lastMessage,
    required this.unread,
    required this.open,
    this.lastMessageAt,
  });

  factory ConversationSummary.fromJson(Map<String, dynamic> j) => ConversationSummary(
        serviceRequestId: j['serviceRequestId'] as String,
        specialty: j['specialty'] as String? ?? '',
        counterpart: j['counterpart'] as String? ?? '',
        lastMessage: j['lastMessage'] as String? ?? '',
        lastMessageAt: j['lastMessageAt'] == null
            ? null
            : DateTime.parse(j['lastMessageAt'] as String),
        unread: j['unread'] as int? ?? 0,
        open: j['open'] as bool? ?? false,
      );
}

class MessagesService {
  final Ref _ref;
  MessagesService(this._ref);

  Future<Conversation> conversation(String serviceRequestId) async {
    final r = await _ref.read(dioProvider).get('/service-requests/$serviceRequestId/messages');
    final data = r.data as Map<String, dynamic>;
    return Conversation(
      messages: (data['messages'] as List)
          .map((e) => ServiceMessage.fromJson(e as Map<String, dynamic>))
          .toList(),
      canSend: data['canSend'] as bool? ?? false,
      closedReason: data['closedReason'] as String?,
    );
  }

  Future<void> send(String serviceRequestId, String body) async {
    await _ref
        .read(dioProvider)
        .post('/service-requests/$serviceRequestId/messages', data: {'body': body});
  }

  Future<void> markRead(String serviceRequestId) async {
    await _ref.read(dioProvider).patch('/service-requests/$serviceRequestId/messages/read');
  }

  /// Conversas do utilizador autenticado. O caminho difere por papel porque o
  /// backend filtra por lados diferentes do pedido.
  Future<List<ConversationSummary>> conversations({required bool isTechnician}) async {
    final path = isTechnician ? '/technician/conversations' : '/client/conversations';
    final r = await _ref.read(dioProvider).get(path);
    return (r.data as List)
        .map((e) => ConversationSummary.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}

final messagesServiceProvider = Provider<MessagesService>((ref) => MessagesService(ref));

final conversationsProvider =
    FutureProvider.family<List<ConversationSummary>, bool>((ref, isTechnician) {
  return ref.read(messagesServiceProvider).conversations(isTechnician: isTechnician);
});

final conversationProvider =
    FutureProvider.family<Conversation, String>((ref, serviceRequestId) {
  return ref.read(messagesServiceProvider).conversation(serviceRequestId);
});
