import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/services/messages_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';

/// Lista de conversas do utilizador. Embebida na aba Comunicação (técnico) e
/// reutilizável na área do cliente.
class ConversationsList extends ConsumerWidget {
  final bool isTechnician;
  const ConversationsList({super.key, required this.isTechnician});

  String _chatPath(String serviceRequestId) =>
      isTechnician ? '/communications/$serviceRequestId' : '/client/messages/$serviceRequestId';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(conversationsProvider(isTechnician));

    return async.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(e.toString(), textAlign: TextAlign.center),
        ),
      ),
      data: (conversations) {
        if (conversations.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.chat_bubble_outline, size: 56, color: Colors.grey[300]),
                const SizedBox(height: 16),
                const Text(
                  'Sem conversas',
                  style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: Text(
                    isTechnician
                        ? 'As conversas abrem quando um trabalho lhe é atribuído.'
                        : 'As conversas abrem quando um técnico for atribuído ao seu pedido.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[500], fontSize: 14),
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(conversationsProvider(isTechnician)),
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: conversations.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final c = conversations[i];
              final icon = specialtyIcons[c.specialty] ?? '🔧';
              final label = specialtyLabels[c.specialty] ?? c.specialty;

              return Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(12),
                  onTap: () => context.push(_chatPath(c.serviceRequestId)),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Center(child: Text(icon, style: const TextStyle(fontSize: 20))),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      c.counterpart.isEmpty ? label : c.counterpart,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 15,
                                      ),
                                    ),
                                  ),
                                  if (c.lastMessageAt != null)
                                    Text(
                                      formatDateShort(c.lastMessageAt!),
                                      style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                                    ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                c.lastMessage,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: Colors.grey[600],
                                  fontWeight: c.unread > 0 ? FontWeight.w600 : FontWeight.normal,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Text(
                                    label,
                                    style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                                  ),
                                  if (!c.open) ...[
                                    const SizedBox(width: 8),
                                    Text(
                                      'terminado',
                                      style: TextStyle(fontSize: 11, color: Colors.grey[400]),
                                    ),
                                  ],
                                  const Spacer(),
                                  if (c.unread > 0)
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 7,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppTheme.primary,
                                        borderRadius: BorderRadius.circular(10),
                                      ),
                                      child: Text(
                                        '${c.unread}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
