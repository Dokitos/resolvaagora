import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/services/admin_service.dart';
import '../../core/services/realtime_service.dart';
import '../../core/theme/app_theme.dart';

class AdminChatScreen extends ConsumerStatefulWidget {
  final String clientUserId;
  final String clientName;
  const AdminChatScreen({super.key, required this.clientUserId, required this.clientName});

  @override
  ConsumerState<AdminChatScreen> createState() => _AdminChatScreenState();
}

class _AdminChatScreenState extends ConsumerState<AdminChatScreen> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  List<Map<String, dynamic>> _messages = [];
  bool _loading = true;
  Timer? _poll;
  final _realtime = RealtimeConnection();

  @override
  void initState() {
    super.initState();
    _load(initial: true);
    // Tempo real: mensagem nova de qualquer cliente recarrega esta conversa.
    _realtime.connect(event: 'support-message', onEvent: (_) => _load());
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
      final msgs = await ref.read(adminServiceProvider).clientMessages(widget.clientUserId);
      if (!mounted) return;
      final grew = msgs.length != _messages.length;
      setState(() { _messages = msgs; _loading = false; });
      if (initial || grew) _toEnd();
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _toEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      });

  Future<void> _send() async {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    _ctrl.clear();
    try {
      final msg = await ref.read(adminServiceProvider).sendClientMessage(widget.clientUserId, text);
      setState(() => _messages = [..._messages, msg]);
      _toEnd();
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível enviar')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final timeFmt = DateFormat('dd/MM HH:mm', 'pt_PT');
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(title: Text(widget.clientName), backgroundColor: AppTheme.brandRed, foregroundColor: Colors.white, elevation: 0),
      body: Column(children: [
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: AppTheme.brandRed))
              : _messages.isEmpty
                  ? const Center(child: Text('Sem mensagens. Envia a primeira.', style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.all(16),
                      itemCount: _messages.length,
                      itemBuilder: (_, i) {
                        final m = _messages[i];
                        final mine = m['senderRole'] == 'ADMIN';
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
                            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                              Text('${m['body']}', style: TextStyle(color: mine ? Colors.white : Colors.black87, fontSize: 14)),
                              const SizedBox(height: 3),
                              Text(timeFmt.format(DateTime.parse(m['createdAt']).toLocal()), style: TextStyle(fontSize: 10, color: mine ? Colors.white70 : Colors.grey[400])),
                            ]),
                          ),
                        );
                      },
                    ),
        ),
        SafeArea(top: false, child: Container(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 8), color: Colors.white,
          child: Row(children: [
            Expanded(child: TextField(
              controller: _ctrl, minLines: 1, maxLines: 4, textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(hintText: 'Mensagem...', filled: true, fillColor: Colors.grey[100], contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none)),
            )),
            const SizedBox(width: 8),
            CircleAvatar(radius: 24, backgroundColor: AppTheme.brandRed, child: IconButton(icon: const Icon(Icons.send, color: Colors.white, size: 20), onPressed: _send)),
          ]),
        )),
      ]),
    );
  }
}
