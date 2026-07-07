import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/models/service_request.dart';
import '../../core/services/admin_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/formatters.dart';
import '../client/services/service_status_ui.dart';

const _statusOptions = ['ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'IN_DIAGNOSIS', 'IN_EXECUTION', 'COMPLETED', 'CANCELLED'];

class AdminRequestDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const AdminRequestDetailScreen({super.key, required this.id});

  @override
  ConsumerState<AdminRequestDetailScreen> createState() => _AdminRequestDetailScreenState();
}

class _AdminRequestDetailScreenState extends ConsumerState<AdminRequestDetailScreen> {
  bool _busy = false;

  Future<void> _run(Future<void> Function() action, String okMsg) async {
    setState(() => _busy = true);
    try {
      await action();
      ref.invalidate(adminRequestDetailProvider(widget.id));
      ref.invalidate(adminRequestsProvider(null));
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(okMsg)));
    } catch (_) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Operação falhou')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(adminRequestDetailProvider(widget.id));
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final dateFmt = DateFormat("d 'de' MMM 'de' yyyy", 'pt_PT');

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(title: const Text('Pedido'), backgroundColor: AppTheme.brandRed, foregroundColor: Colors.white, elevation: 0),
      body: detail.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
        error: (e, _) => Center(child: TextButton(onPressed: () => ref.invalidate(adminRequestDetailProvider(widget.id)), child: const Text('Tentar novamente'))),
        data: (d) {
          final status = ServiceStatus.values.firstWhere((e) => e.name == d['status'], orElse: () => ServiceStatus.ASSIGNED);
          final specialty = (d['specialty'] as String?) ?? '';
          final client = (d['client'] as Map?) ?? {};
          final clientUserId = client['userId'] as String?;
          final phone = client['phone'] as String?;
          final address = (d['address'] as Map?);
          final payments = (d['payments'] as List?) ?? [];
          final quote = (d['quote'] as Map?);
          final photos = (d['photos'] as List?) ?? [];
          final history = (d['statusHistory'] as List?) ?? [];
          final paidTotal = payments.where((p) => p['status'] == 'COMPLETED').fold<double>(0, (a, p) => a + parseAmount(p['amount']));

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _card(child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(specialtyLabels[specialty] ?? 'Serviço', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  Text('#${widget.id.substring(0, 8).toUpperCase()}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                ])),
                statusChip(status),
              ])),
              const SizedBox(height: 12),

              // Moderation
              _card(
                title: 'Moderação',
                child: Column(children: [
                  Row(children: [
                    Expanded(child: _StatusDropdown(current: d['status'] as String? ?? 'ASSIGNED', onChanged: _busy ? null : (s) => _run(() => ref.read(adminServiceProvider).editStatus(widget.id, s), 'Estado atualizado'))),
                  ]),
                  const SizedBox(height: 10),
                  Row(children: [
                    Expanded(child: OutlinedButton.icon(
                      onPressed: _busy ? null : () async {
                        final reason = await _prompt(context, 'Motivo do cancelamento');
                        if (reason != null) _run(() => ref.read(adminServiceProvider).cancelRequest(widget.id, reason), 'Pedido cancelado');
                      },
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFD97706), side: const BorderSide(color: Color(0xFFD97706))),
                      icon: const Icon(Icons.cancel_outlined, size: 18), label: const Text('Cancelar'),
                    )),
                    const SizedBox(width: 10),
                    Expanded(child: OutlinedButton.icon(
                      onPressed: _busy ? null : () async {
                        final ok = await _confirm(context, 'Eliminar este pedido definitivamente?');
                        if (ok) { await _run(() => ref.read(adminServiceProvider).deleteRequest(widget.id), 'Pedido eliminado'); if (mounted) context.pop(); }
                      },
                      style: OutlinedButton.styleFrom(foregroundColor: AppTheme.brandRed, side: const BorderSide(color: AppTheme.brandRed)),
                      icon: const Icon(Icons.delete_outline, size: 18), label: const Text('Eliminar'),
                    )),
                  ]),
                ]),
              ),
              const SizedBox(height: 12),

              // Assign technician
              Consumer(builder: (context, ref, _) {
                final techs = ref.watch(adminTechniciansProvider);
                return _card(
                  title: 'Atribuir técnico',
                  child: techs.when(
                    loading: () => const Padding(padding: EdgeInsets.all(8), child: LinearProgressIndicator()),
                    error: (e, _) => const Text('Erro a carregar técnicos'),
                    data: (list) => _TechAssign(
                      technicians: list,
                      onAssign: _busy ? null : (techId) => _run(() => ref.read(adminServiceProvider).reassign(widget.id, techId), 'Técnico atribuído'),
                    ),
                  ),
                );
              }),
              const SizedBox(height: 12),

              // Valores
              _card(title: 'Valores', child: Column(children: [
                _row('Taxa de deslocação', fmt.format(parseAmount(d['displacementFee']))),
                if (quote != null) _row('Trabalho (orçamento)', fmt.format(parseAmount(quote['totalCost']))),
                for (final p in payments)
                  _row(p['type'] == 'DISPLACEMENT' ? 'Pgto deslocação' : 'Pgto serviço',
                      '${fmt.format(parseAmount(p['amount']))}  (${p['status']})'),
                const Divider(),
                _row('Total pago', fmt.format(paidTotal), bold: true),
              ])),
              const SizedBox(height: 12),

              // Cliente + contacto + chat
              _card(title: 'Cliente', child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${client['firstName'] ?? ''} ${client['lastName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.w600)),
                if (phone != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(phone, style: TextStyle(color: Colors.grey[600]))),
                const SizedBox(height: 10),
                Row(children: [
                  if (phone != null) ...[
                    _miniBtn(Icons.phone, 'Ligar', const Color(0xFF16A34A), () => launchUrl(Uri(scheme: 'tel', path: phone))),
                    const SizedBox(width: 8),
                    _miniBtn(Icons.chat, 'WhatsApp', const Color(0xFF25D366), () => launchUrl(Uri.parse('https://wa.me/${phone.replaceAll(RegExp(r"\D"), "")}'), mode: LaunchMode.externalApplication)),
                    const SizedBox(width: 8),
                  ],
                  if (clientUserId != null)
                    _miniBtn(Icons.forum, 'Chat', AppTheme.brandBlue, () => context.push('/admin/chat', extra: {'userId': clientUserId, 'name': '${client['firstName'] ?? ''} ${client['lastName'] ?? ''}'})),
                ]),
              ])),
              const SizedBox(height: 12),

              if (address != null)
                _card(title: 'Morada', child: Text(
                  '${address['street'] ?? ''}, ${address['number'] ?? ''}\n${address['postalCode'] ?? ''} ${address['city'] ?? ''}',
                  style: const TextStyle(height: 1.4),
                )),
              const SizedBox(height: 12),

              _card(title: 'Detalhes', child: Text((d['description'] as String?) ?? '', style: const TextStyle(height: 1.5))),
              const SizedBox(height: 12),

              if (photos.isNotEmpty)
                _card(title: 'Fotos', child: GridView.count(
                  crossAxisCount: 4, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 6, mainAxisSpacing: 6,
                  children: photos.map((p) => ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.network('${p['url']}', fit: BoxFit.cover))).toList(),
                )),
              if (history.isNotEmpty) ...[
                const SizedBox(height: 12),
                _card(title: 'Histórico', child: Column(children: history.map<Widget>((h) {
                  final st = ServiceStatus.values.firstWhere((e) => e.name == h['newStatus'], orElse: () => ServiceStatus.DRAFT);
                  return Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
                    statusChip(st), const Spacer(),
                    Text(dateFmt.format(DateTime.parse(h['createdAt']).toLocal()), style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                  ]));
                }).toList())),
              ],
              const SizedBox(height: 24),
            ],
          );
        },
      ),
    );
  }

  Widget _card({String? title, required Widget child}) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14), border: Border.all(color: Colors.grey.shade200)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          if (title != null) ...[Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)), const SizedBox(height: 12)],
          child,
        ]),
      );

  Widget _row(String label, String value, {bool bold = false}) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13))),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.w500, color: bold ? AppTheme.brandRed : Colors.black87, fontSize: bold ? 15 : 13)),
        ]),
      );

  Widget _miniBtn(IconData icon, String label, Color color, VoidCallback onTap) => OutlinedButton.icon(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(foregroundColor: color, side: BorderSide(color: color.withOpacity(0.5)), padding: const EdgeInsets.symmetric(horizontal: 10)),
        icon: Icon(icon, size: 16), label: Text(label, style: const TextStyle(fontSize: 12)),
      );
}

class _StatusDropdown extends StatelessWidget {
  final String current;
  final void Function(String)? onChanged;
  const _StatusDropdown({required this.current, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final value = _statusOptions.contains(current) ? current : null;
    return InputDecorator(
      decoration: const InputDecoration(labelText: 'Alterar estado', border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: value,
          hint: Text(statusLabels[current] ?? current),
          items: _statusOptions.map((s) => DropdownMenuItem(value: s, child: Text(ServiceStatusUi.of(ServiceStatus.values.firstWhere((e) => e.name == s)).label))).toList(),
          onChanged: onChanged == null ? null : (v) { if (v != null && v != current) onChanged!(v); },
        ),
      ),
    );
  }
}

class _TechAssign extends StatefulWidget {
  final List<Map<String, dynamic>> technicians;
  final void Function(String)? onAssign;
  const _TechAssign({required this.technicians, required this.onAssign});

  @override
  State<_TechAssign> createState() => _TechAssignState();
}

class _TechAssignState extends State<_TechAssign> {
  String? _selected;

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(
        child: InputDecorator(
          decoration: const InputDecoration(border: OutlineInputBorder(), contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8)),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              isExpanded: true,
              value: _selected,
              hint: const Text('Selecionar técnico'),
              items: widget.technicians.map((t) => DropdownMenuItem(value: t['id'] as String, child: Text('${t['firstName']} ${t['lastName']}'))).toList(),
              onChanged: (v) => setState(() => _selected = v),
            ),
          ),
        ),
      ),
      const SizedBox(width: 8),
      ElevatedButton(
        onPressed: (_selected == null || widget.onAssign == null) ? null : () => widget.onAssign!(_selected!),
        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.brandRed, foregroundColor: Colors.white),
        child: const Text('Atribuir'),
      ),
    ]);
  }
}

Future<String?> _prompt(BuildContext context, String title) async {
  final ctrl = TextEditingController();
  return showDialog<String>(
    context: context,
    builder: (_) => AlertDialog(
      title: Text(title),
      content: TextField(controller: ctrl, autofocus: true),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        TextButton(onPressed: () => Navigator.pop(context, ctrl.text.trim()), child: const Text('Confirmar')),
      ],
    ),
  );
}

Future<bool> _confirm(BuildContext context, String msg) async {
  final r = await showDialog<bool>(
    context: context,
    builder: (_) => AlertDialog(
      content: Text(msg),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Não')),
        TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Sim', style: TextStyle(color: AppTheme.brandRed))),
      ],
    ),
  );
  return r ?? false;
}
