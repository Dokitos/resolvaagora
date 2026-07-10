import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/models/service_request.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/pressable.dart';
import '../../../core/widgets/shimmer.dart';
import '../services/service_status_ui.dart';

class ClientServicesScreen extends ConsumerWidget {
  const ClientServicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final requests = ref.watch(clientServiceRequestsProvider);
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(l.navMyServices),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: AppTheme.brandRed,
        onRefresh: () async => ref.invalidate(clientServiceRequestsProvider),
        child: requests.when(
          loading: () => ListView(
            padding: const EdgeInsets.all(16),
            children: const [ListCardsSkeleton(count: 5)],
          ),
          error: (e, _) => _ErrorState(onRetry: () => ref.invalidate(clientServiceRequestsProvider)),
          data: (list) {
            if (list.isEmpty) {
              return ListView(children: [
                const SizedBox(height: 80),
                EmptyState(
                  icon: Icons.receipt_long_outlined,
                  title: l.ordersEmptyTitle,
                  message: l.ordersEmptyMessage,
                  actionLabel: l.ordersEmptyAction,
                  onAction: () => context.go('/client/home'),
                ),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _RequestCard(request: list[i]),
            );
          },
        ),
      ),
    );
  }
}

class _RequestCard extends StatelessWidget {
  final ServiceRequest request;
  const _RequestCard({required this.request});

  @override
  Widget build(BuildContext context) {
    final emoji = specialtyIcons[request.specialty.name] ?? '🛠️';
    final label = specialtyLabels[request.specialty.name] ?? 'Serviço';
    final dateFmt = DateFormat("d MMM yyyy", 'pt_PT');
    final (_, tint) = AppTheme.categoryColors(request.specialty.name);

    return Pressable(
      onTap: () => context.push('/client/services/${request.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8, offset: const Offset(0, 2)),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: tint,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(child: Text(emoji, style: const TextStyle(fontSize: 22))),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 2),
                      Text('#${request.id.substring(0, 8).toUpperCase()}',
                          style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                    ],
                  ),
                ),
                statusChip(request.status),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.calendar_today_outlined, size: 15, color: Colors.grey[600]),
                const SizedBox(width: 6),
                Text(
                  request.scheduledDate != null
                      ? dateFmt.format(request.scheduledDate!.toLocal())
                      : AppLocalizations.of(context).noDateSet,
                  style: TextStyle(color: Colors.grey[700], fontSize: 13),
                ),
                const Spacer(),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return ListView(
      children: [
        const SizedBox(height: 120),
        const Icon(Icons.cloud_off_outlined, size: 56, color: Colors.grey),
        const SizedBox(height: 16),
        Center(child: Text(l.ordersLoadError, style: const TextStyle(color: Colors.grey))),
        const SizedBox(height: 16),
        Center(
          child: OutlinedButton(onPressed: onRetry, child: Text(l.retry)),
        ),
      ],
    );
  }
}
