import 'package:flutter/material.dart';
import '../../core/widgets/onboarding_overlay.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/technician_service.dart';
import '../../core/models/service_request.dart';
import '../../core/utils/formatters.dart';
import '../../core/theme/app_theme.dart';

/// Override local e otimista da disponibilidade: aplicado assim que o
/// técnico mexe no switch, antes (e independentemente) do refetch do
/// perfil. `null` = ainda não há override → usar o valor vindo do backend.
final _availabilityOverrideProvider = StateProvider<bool?>((ref) => null);

/// Disponibilidade real do técnico (`true` = AVAILABLE), derivada do
/// `technicianProfileProvider` (que reflete o `Technician.status` guardado
/// no backend) em vez de um valor fixo. Isto corrige o bug em que o switch
/// reaparecia sempre como "Disponível" ao reabrir a app, mesmo que o
/// backend tivesse `BUSY` guardado de uma sessão anterior.
///
/// `null` enquanto o perfil ainda está a carregar (o ecrã mostra um loader
/// no lugar do switch nesse intervalo, em vez de assumir um valor —
/// nunca mostra "Disponível" por defeito antes de saber o valor real).
final availabilityProvider = Provider<bool?>((ref) {
  final override = ref.watch(_availabilityOverrideProvider);
  if (override != null) return override;
  final profileAsync = ref.watch(technicianProfileProvider);
  final status = profileAsync.valueOrNull?['status']?.toString();
  if (status != null) return status == 'AVAILABLE';
  // Falha ao carregar o perfil: assume "Ocupado" (lado seguro) em vez de
  // ficar preso num loader eterno — nunca assume "Disponível" sem certeza.
  if (profileAsync.hasError) return false;
  return null; // ainda a carregar
});

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
          const OnboardingTrigger(role: OnboardingRole.technician),
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: isAvailable == null
                // Ainda a carregar o estado real (perfil do técnico) — não
                // assume "Disponível" nem "Ocupado" enquanto não sabe.
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: Center(
                      child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  )
                : Row(
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
                          final previous = isAvailable;
                          ref.read(_availabilityOverrideProvider.notifier).state = v;
                          try {
                            await ref.read(technicianServiceProvider).setAvailability(v);
                          } catch (_) {
                            ref.read(_availabilityOverrideProvider.notifier).state = previous;
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Não foi possível atualizar a disponibilidade.'),
                                  backgroundColor: AppTheme.danger,
                                ),
                              );
                            }
                          }
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
          // Agrupa por "Hoje" vs "Próximos" — antes era uma lista plana sem
          // qualquer estrutura, difícil de ler quando há vários dias de
          // serviços atribuídos de uma vez.
          final now = DateTime.now();
          bool isToday(DateTime? d) =>
              d != null && d.year == now.year && d.month == now.month && d.day == now.day;
          final today = jobs.where((j) => isToday(j.scheduledDate)).toList();
          final upcoming = jobs.where((j) => !isToday(j.scheduledDate)).toList()
            ..sort((a, b) {
              final ad = a.scheduledDate;
              final bd = b.scheduledDate;
              if (ad == null && bd == null) return 0;
              if (ad == null) return 1; // sem data agendada vai para o fim
              if (bd == null) return -1;
              return ad.compareTo(bd);
            });

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(assignedJobsProvider);
              // Descarta o override otimista e vai buscar o status real de
              // novo — reflete alterações feitas noutra sessão/dispositivo.
              ref.read(_availabilityOverrideProvider.notifier).state = null;
              ref.invalidate(technicianProfileProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (today.isNotEmpty) ...[
                  _SectionHeader(title: l.todaySection, count: today.length),
                  const SizedBox(height: 10),
                  for (final job in today) ...[
                    _JobCard(job: job),
                    const SizedBox(height: 10),
                  ],
                  const SizedBox(height: 6),
                ],
                if (upcoming.isNotEmpty) ...[
                  _SectionHeader(title: l.upcomingSection, count: upcoming.length),
                  const SizedBox(height: 10),
                  for (final job in upcoming) ...[
                    _JobCard(job: job),
                    const SizedBox(height: 10),
                  ],
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  final int count;
  const _SectionHeader({required this.title, required this.count});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.grey[200],
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            '$count',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.grey[700]),
          ),
        ),
      ],
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
                    if (job.scheduledDate != null) ...[
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Icon(Icons.schedule, size: 13, color: Colors.grey[500]),
                          const SizedBox(width: 4),
                          Text(
                            '${formatWeekdayShort(job.scheduledDate!)}, ${formatDateShort(job.scheduledDate!)} • ${formatTime(job.scheduledDate!)}',
                            style: TextStyle(color: Colors.grey[500], fontSize: 12),
                          ),
                        ],
                      ),
                    ],
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
