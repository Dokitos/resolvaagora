import 'package:flutter/material.dart';
import '../../core/widgets/onboarding_overlay.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:table_calendar/table_calendar.dart';
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

/// Como a agenda e apresentada: grelha mensal ou lista por seccoes.
enum _View { calendar, list }

/// Dia a que um trabalho pertence, ignorando a hora.
DateTime _dayKey(DateTime d) => DateTime(d.year, d.month, d.day);

/// Data que posiciona o trabalho na agenda: a agendada quando existe, senao a
/// de conclusao, senao a de criacao. Garante que nenhum trabalho desaparece do
/// calendario por lhe faltar data agendada.
DateTime _effectiveDate(ServiceRequest j) =>
    j.scheduledDate ?? j.completedAt ?? j.createdAt;

Map<DateTime, List<ServiceRequest>> _groupByDay(List<ServiceRequest> jobs) {
  final map = <DateTime, List<ServiceRequest>>{};
  for (final j in jobs) {
    map.putIfAbsent(_dayKey(_effectiveDate(j)), () => <ServiceRequest>[]).add(j);
  }
  for (final list in map.values) {
    list.sort((a, b) => _effectiveDate(a).compareTo(_effectiveDate(b)));
  }
  return map;
}

class ScheduleScreen extends ConsumerStatefulWidget {
  const ScheduleScreen({super.key});

  @override
  ConsumerState<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends ConsumerState<ScheduleScreen> {
  _View _view = _View.calendar;
  DateTime _focusedDay = DateTime.now();
  DateTime _selectedDay = _dayKey(DateTime.now());

  @override
  Widget build(BuildContext context) {
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
          final byDay = _groupByDay(jobs);

          return RefreshIndicator(
            onRefresh: () async {
              ref.invalidate(assignedJobsProvider);
              // Descarta o override otimista e vai buscar o status real de
              // novo - reflete alteracoes feitas noutra sessao/dispositivo.
              ref.read(_availabilityOverrideProvider.notifier).state = null;
              ref.invalidate(technicianProfileProvider);
            },
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _SummaryStrip(jobs: jobs),
                const SizedBox(height: 16),
                SegmentedButton<_View>(
                  segments: [
                    ButtonSegment(
                      value: _View.calendar,
                      icon: const Icon(Icons.calendar_month_outlined, size: 18),
                      label: Text(l.viewCalendar),
                    ),
                    ButtonSegment(
                      value: _View.list,
                      icon: const Icon(Icons.view_list_outlined, size: 18),
                      label: Text(l.viewList),
                    ),
                  ],
                  selected: {_view},
                  onSelectionChanged: (sel) => setState(() => _view = sel.first),
                ),
                const SizedBox(height: 16),
                if (_view == _View.calendar)
                  ..._buildCalendar(context, byDay, l)
                else
                  ..._buildSections(jobs, l),
              ],
            ),
          );
        },
      ),
    );
  }

  /// Grelha mensal com marcador nos dias que tem trabalhos, seguida dos
  /// trabalhos do dia seleccionado.
  List<Widget> _buildCalendar(
    BuildContext context,
    Map<DateTime, List<ServiceRequest>> byDay,
    AppLocalizations l,
  ) {
    final doDia = byDay[_selectedDay] ?? const <ServiceRequest>[];
    // So o pt tem dados de formatacao carregados no arranque (ver main.dart);
    // passar null deixa o intl usar o de omissao em vez de rebentar.
    final isPt = Localizations.localeOf(context).languageCode == 'pt';

    return [
      Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: TableCalendar<ServiceRequest>(
            locale: isPt ? 'pt_PT' : null,
            firstDay: DateTime.utc(2024, 1, 1),
            lastDay: DateTime.utc(2030, 12, 31),
            focusedDay: _focusedDay,
            startingDayOfWeek: StartingDayOfWeek.monday,
            selectedDayPredicate: (d) => isSameDay(_selectedDay, d),
            eventLoader: (d) => byDay[_dayKey(d)] ?? const <ServiceRequest>[],
            headerStyle: const HeaderStyle(
              formatButtonVisible: false,
              titleCentered: true,
            ),
            calendarStyle: CalendarStyle(
              markerDecoration: const BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
              ),
              todayDecoration: BoxDecoration(
                color: AppTheme.primary.withValues(alpha: 0.25),
                shape: BoxShape.circle,
              ),
              selectedDecoration: const BoxDecoration(
                color: AppTheme.primary,
                shape: BoxShape.circle,
              ),
            ),
            onDaySelected: (sel, foc) => setState(() {
              _selectedDay = _dayKey(sel);
              _focusedDay = foc;
            }),
            // Sem setState: mudar de mes nao altera nada do que e desenhado
            // fora do proprio calendario, que ja se redesenha sozinho.
            onPageChanged: (foc) => _focusedDay = foc,
          ),
        ),
      ),
      const SizedBox(height: 16),
      _SectionHeader(title: formatDateShort(_selectedDay), count: doDia.length),
      const SizedBox(height: 10),
      if (doDia.isEmpty)
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 28),
          child: Center(
            child: Text(l.noJobsOnDay, style: TextStyle(color: Colors.grey[500])),
          ),
        )
      else
        for (final job in doDia) ...[
          _JobCard(job: job),
          const SizedBox(height: 10),
        ],
    ];
  }

  /// Lista por seccoes: hoje, futuros e passados. Antes tudo o que nao fosse
  /// hoje caia em "Proximos", incluindo trabalhos ja concluidos.
  List<Widget> _buildSections(List<ServiceRequest> jobs, AppLocalizations l) {
    final hoje = _dayKey(DateTime.now());
    final deHoje = <ServiceRequest>[];
    final futuros = <ServiceRequest>[];
    final passados = <ServiceRequest>[];

    for (final j in jobs) {
      final d = _dayKey(_effectiveDate(j));
      if (d == hoje) {
        deHoje.add(j);
      } else if (d.isAfter(hoje)) {
        futuros.add(j);
      } else {
        passados.add(j);
      }
    }

    deHoje.sort((a, b) => _effectiveDate(a).compareTo(_effectiveDate(b)));
    futuros.sort((a, b) => _effectiveDate(a).compareTo(_effectiveDate(b)));
    // Passados do mais recente para o mais antigo - e o que se quer rever.
    passados.sort((a, b) => _effectiveDate(b).compareTo(_effectiveDate(a)));

    return [
      ..._section(l.todaySection, deHoje),
      ..._section(l.upcomingSection, futuros),
      ..._section(l.pastSection, passados),
    ];
  }

  List<Widget> _section(String titulo, List<ServiceRequest> itens) {
    if (itens.isEmpty) return const [];
    return [
      _SectionHeader(title: titulo, count: itens.length),
      const SizedBox(height: 10),
      for (final job in itens) ...[
        _JobCard(job: job),
        const SizedBox(height: 10),
      ],
      const SizedBox(height: 6),
    ];
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


/// Resumo do topo da agenda: quantos trabalhos hoje, quantos esta semana e
/// quantos ja concluidos no mes. Contado a partir da lista ja carregada, sem
/// pedidos extra ao servidor.
class _SummaryStrip extends StatelessWidget {
  final List<ServiceRequest> jobs;
  const _SummaryStrip({required this.jobs});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final agora = DateTime.now();
    final hoje = _dayKey(agora);
    // Semana a comecar a segunda, para coincidir com a grelha do calendario.
    final inicioSemana = hoje.subtract(Duration(days: agora.weekday - 1));
    final fimSemana = inicioSemana.add(const Duration(days: 6));

    var nHoje = 0, nSemana = 0, nConcluidos = 0;
    for (final j in jobs) {
      final d = _dayKey(_effectiveDate(j));
      if (d == hoje) nHoje++;
      if (!d.isBefore(inicioSemana) && !d.isAfter(fimSemana)) nSemana++;
      if (j.status == ServiceStatus.COMPLETED &&
          d.year == agora.year &&
          d.month == agora.month) {
        nConcluidos++;
      }
    }

    return Row(
      children: [
        Expanded(child: _SummaryCard(label: l.todaySection, value: '$nHoje', color: AppTheme.primary)),
        const SizedBox(width: 10),
        Expanded(child: _SummaryCard(label: l.thisWeekSection, value: '$nSemana', color: AppTheme.warning)),
        const SizedBox(width: 10),
        Expanded(child: _SummaryCard(label: l.completedSection, value: '$nConcluidos', color: AppTheme.success)),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _SummaryCard({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: color)),
          const SizedBox(height: 2),
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }
}
