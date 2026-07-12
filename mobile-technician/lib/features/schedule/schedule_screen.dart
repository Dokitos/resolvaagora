import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/technician_service.dart';
import '../../core/models/service_request.dart';
import '../../core/utils/formatters.dart';
import '../../core/theme/app_theme.dart';

final availabilityProvider = StateProvider<bool>((ref) => true);

class ScheduleScreen extends ConsumerWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobsAsync = ref.watch(assignedJobsProvider);
    final isAvailable = ref.watch(availabilityProvider);
    final l = AppLocalizations.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(l.scheduleScreenTitle),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Row(
              children: [
                Text(
                  isAvailable ? l.available : l.busy,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: isAvailable ? AppTheme.success : Colors.grey[500],
                  ),
                ),
                const SizedBox(width: 8),
                Switch.adaptive(
                  value: isAvailable,
                  activeColor: AppTheme.success,
                  onChanged: (v) async {
                    ref.read(availabilityProvider.notifier).state = v;
                    await ref.read(technicianServiceProvider).setAvailability(v);
                  },
                ),
              ],
            ),
          ),
        ],
      ),
      body: jobsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(e.toString(), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(assignedJobsProvider),
                child: Text(l.retry),
              ),
            ],
          ),
        ),
        data: (jobs) {
          if (jobs.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.calendar_today_outlined, size: 56, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  Text(l.noAssignedJobs,
                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  const SizedBox(height: 6),
                  Text(l.stayAvailable,
                      style: TextStyle(color: Colors.grey[500], fontSize: 14)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(assignedJobsProvider),
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: jobs.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (_, i) => _JobCard(job: jobs[i]),
            ),
          );
        },
      ),
    );
  }
}

class _JobCard extends StatelessWidget {
  final ServiceRequest job;
  const _JobCard({required this.job});

  Color get _statusColor {
    switch (job.status) {
      case ServiceStatus.ASSIGNED: return AppTheme.primary;
      case ServiceStatus.IN_TRANSIT: return AppTheme.warning;
      case ServiceStatus.ARRIVED:
      case ServiceStatus.IN_DIAGNOSIS: return const Color(0xFF7C3AED);
      case ServiceStatus.QUOTE_SENT: return Colors.orange;
      case ServiceStatus.QUOTE_APPROVED:
      case ServiceStatus.IN_EXECUTION: return AppTheme.success;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = statusLabels[job.status.name] ?? job.status.name;
    final icon = specialtyIcons[job.specialty.name] ?? '🔧';
    final label = specialtyLabels[job.specialty.name] ?? job.specialty.name;

    return Card(
      child: InkWell(
        onTap: () => context.push('/jobs/${job.id}'),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(child: Text(icon, style: const TextStyle(fontSize: 22))),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        if (job.isPriority) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.amber[100],
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(AppLocalizations.of(context).priorityTag,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF92400E))),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${job.address?.city ?? ''} • ${job.client?.fullName ?? ''}',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _statusColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(status,
                          style: TextStyle(color: _statusColor, fontSize: 12, fontWeight: FontWeight.w500)),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
