import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/services/auth_service.dart';
import '../../core/services/messages_service.dart';
import '../../core/services/realtime_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';

/// Conversa de um pedido. Serve o cliente e o técnico — o que muda entre os
/// dois é apenas de que lado da conversa fica cada mensagem.
class ChatScreen extends ConsumerStatefulWidget {
  final String serviceRequestId;
  const ChatScreen({super.key, required this.serviceRequestId});

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  final _realtime = RealtimeConnection();

  /// Mensagens chegadas pelo socket depois do carregamento inicial.
  final _live = <ServiceMessage>[];
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _connect();
    // Abrir a conversa é a confirmação de que foi lida.
    ref.read(messagesServiceProvider).markRead(widget.serviceRequestId).catchError((_) {});
  }

  Future<void> _connect() async {
    await _realtime.connect(
      event: 'service-message',
      onEvent: (data) {
        if (data is! Map) return;
        // O socket é por utilizador, não por conversa: chegam mensagens de
        // todos os pedidos e só interessam as desta.
        if (data['serviceRequestId'] != widget.serviceRequestId) return;
        if (!mounted) return;
        setState(() {
          _live.add(ServiceMessage.fromJson(Map<String, dynamic>.from(data)));
        });
        _scrollToEnd();
      },
    );
  }

  @override
  void dispose() {
    _realtime.dispose();
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
      );
    });
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _sending) return;

    setState(() => _sending = true);
    try {
      await ref.read(messagesServiceProvider).send(widget.serviceRequestId, text);
      _input.clear();
      // Recarrega em vez de acrescentar à mão: assim a mensagem enviada fica
      // com o id e a hora do servidor, e não uma versão local aproximada.
      ref.invalidate(conversationProvider(widget.serviceRequestId));
      _scrollToEnd();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Não foi possível enviar: $e'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final myId = ref.watch(authProvider).valueOrNull?.userId;
    final async = ref.watch(conversationProvider(widget.serviceRequestId));

    return Scaffold(
      appBar: AppBar(title: const Text('Mensagens')),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(e.toString(), textAlign: TextAlign.center),
          ),
        ),
        data: (conversation) {
          final messages = [...conversation.messages, ..._live];

          return Column(
            children: [
              // Aviso de moderação: as conversas podem ser consultadas pela
              // equipa, e isso tem de estar à vista de quem escreve.
              Container(
                width: double.infinity,
                color: Colors.amber[50],
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: Text(
                  'As conversas podem ser consultadas pela equipa ResolvaAgora '
                  'para resolver questões relacionadas com o serviço.',
                  style: TextStyle(fontSize: 11, color: Colors.amber[900]),
                ),
              ),
              Expanded(
                child: messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.chat_bubble_outline, size: 48, color: Colors.grey[300]),
                            const SizedBox(height: 12),
                            Text(
                              'Ainda não há mensagens.',
                              style: TextStyle(color: Colors.grey[500]),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.all(16),
                        itemCount: messages.length,
                        itemBuilder: (context, i) => _Bubble(
                          message: messages[i],
                          mine: messages[i].senderId == myId,
                        ),
                      ),
              ),
              if (conversation.canSend)
                _Composer(controller: _input, sending: _sending, onSend: _send)
              else
                Container(
                  width: double.infinity,
                  color: Colors.grey[100],
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    conversation.closedReason ?? 'Esta conversa está fechada.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Bubble extends StatelessWidget {
  final ServiceMessage message;
  final bool mine;
  const _Bubble({required this.message, required this.mine});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (!mine && message.senderName.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 4, bottom: 2),
              child: Text(
                message.senderName,
                style: TextStyle(fontSize: 11, color: Colors.grey[600]),
              ),
            ),
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.75,
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: mine ? AppTheme.primary : Colors.grey[200],
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(14),
                topRight: const Radius.circular(14),
                bottomLeft: Radius.circular(mine ? 14 : 4),
                bottomRight: Radius.circular(mine ? 4 : 14),
              ),
            ),
            child: Text(
              message.body,
              style: TextStyle(color: mine ? Colors.white : Colors.black87, fontSize: 14),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: 3, left: 4, right: 4),
            child: Text(
              formatTime(message.createdAt),
              style: TextStyle(fontSize: 10, color: Colors.grey[500]),
            ),
          ),
        ],
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final bool sending;
  final VoidCallback onSend;
  const _Composer({required this.controller, required this.sending, required this.onSend});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
        decoration: BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Colors.grey[200]!)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                minLines: 1,
                maxLines: 4,
                maxLength: 2000,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  hintText: 'Escrever mensagem…',
                  counterText: '',
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                ),
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: sending ? null : onSend,
              icon: sending
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.send, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}
