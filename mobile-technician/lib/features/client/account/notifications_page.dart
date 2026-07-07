import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/models/client_profile.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';

class NotificationsPage extends ConsumerWidget {
  const NotificationsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Notificações'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          TextButton(
            onPressed: () async {
              await ref.read(clientServiceProvider).markAllRead();
              ref.invalidate(notificationsProvider);
              ref.invalidate(unreadCountProvider);
            },
            child: const Text('Ler todas', style: TextStyle(color: Colors.white, fontSize: 13)),
          ),
        ],
      ),
      body: RefreshIndicator(
        color: AppTheme.brandRed,
        onRefresh: () async {
          ref.invalidate(notificationsProvider);
          ref.invalidate(unreadCountProvider);
        },
        child: notifications.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
          error: (e, _) => _error(ref),
          data: (list) {
            if (list.isEmpty) return const _Empty();
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _NotificationCard(notification: list[i]),
            );
          },
        ),
      ),
    );
  }

  Widget _error(WidgetRef ref) => ListView(
        children: [
          const SizedBox(height: 120),
          const Icon(Icons.cloud_off_outlined, size: 56, color: Colors.grey),
          const SizedBox(height: 12),
          const Center(child: Text('Não foi possível carregar as notificações', style: TextStyle(color: Colors.grey))),
          const SizedBox(height: 16),
          Center(
            child: OutlinedButton(
              onPressed: () => ref.invalidate(notificationsProvider),
              child: const Text('Tentar novamente'),
            ),
          ),
        ],
      );
}

class _NotificationCard extends ConsumerWidget {
  final ClientNotification notification;
  const _NotificationCard({required this.notification});

  IconData get _icon {
    if (notification.type.contains('QUOTE')) return Icons.request_quote_outlined;
    if (notification.type.contains('PAYMENT')) return Icons.payments_outlined;
    if (notification.type.contains('TECHNICIAN') || notification.type.contains('ASSIGNED')) {
      return Icons.engineering_outlined;
    }
    if (notification.type.contains('COMPLETED')) return Icons.task_alt;
    return Icons.notifications_outlined;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final timeFmt = DateFormat('dd/MM/yyyy HH:mm', 'pt_PT');
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: notification.isRead
          ? null
          : () async {
              await ref.read(clientServiceProvider).markRead(notification.id);
              ref.invalidate(notificationsProvider);
              ref.invalidate(unreadCountProvider);
            },
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: notification.isRead ? Colors.white : AppTheme.brandRedLight,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: notification.isRead ? Colors.grey.shade200 : AppTheme.brandRed.withOpacity(0.25)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(10)),
              child: Icon(_icon, color: AppTheme.brandBlue, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(notification.title,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                      if (!notification.isRead)
                        Container(
                          width: 8, height: 8,
                          decoration: const BoxDecoration(color: AppTheme.brandRed, shape: BoxShape.circle),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(notification.body, style: TextStyle(color: Colors.grey[700], fontSize: 13, height: 1.4)),
                  const SizedBox(height: 6),
                  Text(timeFmt.format(notification.createdAt.toLocal()),
                      style: TextStyle(color: Colors.grey[400], fontSize: 11)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        const Icon(Icons.notifications_none, size: 64, color: Colors.grey),
        const SizedBox(height: 16),
        const Center(
          child: Text('Sem notificações',
              style: TextStyle(fontSize: 16, color: Colors.grey, fontWeight: FontWeight.w600)),
        ),
        const SizedBox(height: 8),
        const Center(
          child: Text('As atualizações dos teus pedidos aparecerão aqui',
              style: TextStyle(color: Colors.grey), textAlign: TextAlign.center),
        ),
      ],
    );
  }
}
