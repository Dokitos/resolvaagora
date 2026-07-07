import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/models/client_profile.dart';
import '../../../core/services/client_service.dart';
import '../../../core/services/realtime_service.dart';
import '../../../core/theme/app_theme.dart';

class SupportChatPage extends ConsumerStatefulWidget {
  const SupportChatPage({super.key});

  @override
  ConsumerState<SupportChatPage> createState() => _SupportChatPageState();
}

class _SupportChatPageState extends ConsumerState<SupportChatPage> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  List<SupportMessage> _messages = [];
  bool _loading = true;
  bool _sending = false;
  Timer? _poll;
  final _realtime = RealtimeConnection();

  @override
  void initState() {
    super.initState();
    _load(initial: true);
    // Tempo real: nova mensagem do suporte recarrega a conversa de imediato.
    _realtime.connect(event: 'support-message', onEvent: (_) => _load());
    // Fallback lento caso o WebSocket caia (rede/servidor).
    _poll = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _realtime.dispose();
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load({bool initial = false}) async {
    try {
      final msgs = await ref.read(clientServiceProvider).getSupportMessages();
      if (!mounted) return;
      final grew = msgs.length != _messages.length;
      setState(() {
        _messages = msgs;
        _loading = false;
      });
      if (initial || grew) _scrollToEnd();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _scrollToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      final msg = await ref.read(clientServiceProvider).sendSupportMessage(text);
      _ctrl.clear();
      setState(() {
        _messages = [..._messages, msg];
        _sending = false;
      });
      _scrollToEnd();
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível enviar a mensagem')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeFmt = DateFormat('dd/MM HH:mm', 'pt_PT');
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Chat de suporte'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppTheme.brandRed))
                : _messages.isEmpty
                    ? _empty()
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.all(16),
                        itemCount: _messages.length,
                        itemBuilder: (_, i) => _bubble(_messages[i], timeFmt),
                      ),
          ),
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
              color: Colors.white,
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _ctrl,
                      minLines: 1,
                      maxLines: 4,
                      textCapitalization: TextCapitalization.sentences,
                      decoration: InputDecoration(
                        hintText: 'Escreve uma mensagem...',
                        filled: true,
                        fillColor: Colors.grey[100],
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    radius: 24,
                    backgroundColor: AppTheme.brandRed,
                    child: IconButton(
                      icon: _sending
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.send, color: Colors.white, size: 20),
                      onPressed: _send,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _bubble(SupportMessage m, DateFormat fmt) {
    final mine = !m.isFromAdmin; // client's own messages on the right
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: mine ? AppTheme.brandRed : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: mine ? null : Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!mine)
              const Padding(
                padding: EdgeInsets.only(bottom: 2),
                child: Text('Suporte', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.brandRed)),
              ),
            Text(m.body, style: TextStyle(color: mine ? Colors.white : Colors.black87, fontSize: 14, height: 1.3)),
            const SizedBox(height: 3),
            Text(fmt.format(m.createdAt.toLocal()),
                style: TextStyle(fontSize: 10, color: mine ? Colors.white70 : Colors.grey[400])),
          ],
        ),
      ),
    );
  }

  Widget _empty() => ListView(
        children: [
          const SizedBox(height: 100),
          Icon(Icons.support_agent, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          const Center(child: Text('Fala com o nosso suporte', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.grey))),
          const SizedBox(height: 8),
          const Center(child: Text('Envia a tua dúvida — respondemos por aqui.', style: TextStyle(color: Colors.grey))),
        ],
      );
}
