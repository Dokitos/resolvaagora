import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/models/service_request.dart';
import '../../core/services/admin_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../client/services/service_status_ui.dart';

class AdminRequestsScreen extends ConsumerStatefulWidget {
  const AdminRequestsScreen({super.key});

  @override
  ConsumerState<AdminRequestsScreen> createState() => _AdminRequestsScreenState();
}

class _AdminRequestsScreenState extends ConsumerState<AdminRequestsScreen> {
  String _status = '';

  static const _filters = [
    ('', 'Todos'),
    ('IN_DISTRIBUTION', 'A distribuir'),
    ('ASSIGNED', 'Atribuídos'),
    ('IN_EXECUTION', 'Em execução'),
    ('COMPLETED', 'Concluídos'),
    ('CANCELLED', 'Cancelados'),
  ];

  @override
  Widget build(BuildContext context) {
    final requests = ref.watch(adminRequestsProvider(_status.isEmpty ? null : _status));
    final dateFmt = DateFormat('d MMM', 'pt_PT');

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Pedidos'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          SizedBox(
            height: 52,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemCount: _filters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final f = _filters[i];
                final sel = _status == f.$1;
                return ChoiceChip(
                  label: Text(f.$2),
                  selected: sel,
                  onSelected: (_) => setState(() => _status = f.$1),
                  selectedColor: AppTheme.brandRed,
                  labelStyle: TextStyle(color: sel ? Colors.white : Colors.black87, fontSize: 13),
                  backgroundColor: Colors.white,
                  shape: StadiumBorder(side: BorderSide(color: Colors.grey.shade300)),
                );
              },
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              color: AppTheme.brandRed,
              onRefresh: () async => ref.invalidate(adminRequestsProvider(_status.isEmpty ? null : _status)),
              child: requests.when(
                loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
                error: (e, _) => ListView(children: [
                  const SizedBox(height: 120),
                  const Center(child: Text('Não foi possível carregar', style: TextStyle(color: Colors.grey))),
                ]),
                data: (list) {
                  if (list.isEmpty) {
                    return ListView(children: const [SizedBox(height: 140), Center(child: Text('Sem pedidos', style: TextStyle(color: Colors.grey)))]);
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: list.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) => _card(context, list[i], dateFmt),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _card(BuildContext context, ServiceRequest r, DateFormat dateFmt) {
    final label = specialtyLabels[r.specialty.name] ?? 'Serviço';
    final emoji = specialtyIcons[r.specialty.name] ?? '🛠️';
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => context.push('/admin/requests/${r.id}'),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
        child: Row(
          children: [
            Container(
              width: 44, height: 44,
              decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(10)),
              child: Center(child: Text(emoji, style: const TextStyle(fontSize: 22))),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 2),
                  Text(
                    '${r.client?.fullName ?? 'Cliente'}'
                    '${r.scheduledDate != null ? ' · ${dateFmt.format(r.scheduledDate!.toLocal())}' : ''}',
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                  const SizedBox(height: 2),
                  Text(r.technicianName ?? 'Não atribuído',
                      style: TextStyle(color: r.technicianName != null ? Colors.black87 : Colors.grey[400], fontSize: 12, fontStyle: r.technicianName != null ? FontStyle.normal : FontStyle.italic)),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                statusChip(r.status),
                if (r.isPriority) ...[
                  const SizedBox(height: 4),
                  const Text('⭐ Prioritário', style: TextStyle(fontSize: 10, color: Colors.amber)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
