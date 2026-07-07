import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/models/service_request.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/shimmer.dart';
import 'service_status_ui.dart';

class ServiceRequestDetailPage extends ConsumerWidget {
  final String id;
  const ServiceRequestDetailPage({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(serviceRequestDetailProvider(id));

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Detalhes do pedido'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: detail.when(
        loading: () => ListView(
          padding: const EdgeInsets.all(16),
          children: const [ListCardsSkeleton(count: 4)],
        ),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off_outlined, size: 48, color: Colors.grey),
                const SizedBox(height: 12),
                const Text('Não foi possível carregar este pedido', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: () => ref.invalidate(serviceRequestDetailProvider(id)),
                  child: const Text('Tentar novamente'),
                ),
              ],
            ),
          ),
        ),
        data: (sr) => _Detail(request: sr),
      ),
    );
  }
}

class _Detail extends ConsumerWidget {
  final ServiceRequest request;
  const _Detail({required this.request});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final dateFmt = DateFormat("d 'de' MMMM 'de' yyyy", 'pt_PT');
    final label = specialtyLabels[request.specialty.name] ?? 'Serviço';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status header
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                    const SizedBox(height: 4),
                    Text('#${request.id.substring(0, 8).toUpperCase()}',
                        style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                  ],
                ),
              ),
              statusChip(request.status),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Status timeline
        if (request.statusHistory.isNotEmpty) ...[
          _Card(
            title: 'Acompanhamento',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var i = 0; i < request.statusHistory.length; i++)
                  _TimelineRow(
                    entry: request.statusHistory[i],
                    isLast: i == request.statusHistory.length - 1,
                  ),
              ],
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Requested date
        _Card(
          title: 'Data solicitada',
          child: _IconLine(
            icon: Icons.calendar_today_outlined,
            text: request.scheduledDate != null
                ? dateFmt.format(request.scheduledDate!.toLocal())
                : 'Sem data definida',
          ),
        ),
        const SizedBox(height: 12),

        // Address
        if (request.address != null) ...[
          _Card(
            title: 'Morada',
            child: _IconLine(
              icon: Icons.location_on_outlined,
              text: '${request.address!.street}, ${request.address!.number}'
                  '${request.address!.floor != null ? ' ${request.address!.floor}' : ''}\n'
                  '${request.address!.postalCode} ${request.address!.city}',
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Contact
        if (request.client?.phone != null) ...[
          _Card(
            title: 'Dados de contacto',
            child: _IconLine(icon: Icons.phone_outlined, text: request.client!.phone!),
          ),
          const SizedBox(height: 12),
        ],

        // Technician
        if (request.technicianName != null) ...[
          _Card(
            title: 'Técnico',
            child: _IconLine(icon: Icons.engineering_outlined, text: request.technicianName!),
          ),
          const SizedBox(height: 12),
        ],

        // Description / details
        _Card(
          title: 'Detalhes do serviço',
          child: Text(request.description, style: const TextStyle(fontSize: 14, height: 1.5)),
        ),
        const SizedBox(height: 12),

        // Avaliação — mostra a existente ou permite avaliar quando concluído
        if (request.review != null) ...[
          _Card(
            title: 'A tua avaliação',
            child: _ReviewView(review: request.review!),
          ),
          const SizedBox(height: 12),
        ] else if (request.status == ServiceStatus.COMPLETED) ...[
          _Card(
            title: 'Avaliar serviço',
            child: _ReviewForm(requestId: request.id),
          ),
          const SizedBox(height: 12),
        ],

        // Price
        _Card(
          title: 'Pagamento',
          child: Column(
            children: [
              if (request.quote != null) ...[
                _PriceRow('Mão de obra', fmt.format(request.quote!.laborCost)),
                _PriceRow('Materiais', fmt.format(request.quote!.materialsCost)),
                const Divider(height: 18),
                _PriceRow('Total', fmt.format(request.quote!.totalCost), bold: true),
              ] else ...[
                _PriceRow('Taxa de deslocação', fmt.format(request.displacementFee)),
                const SizedBox(height: 4),
                Text(
                  'O orçamento final é determinado no local após levantamento das tarefas.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),

        // Recibo por email — disponível assim que há pagamento/serviço
        if (request.status != ServiceStatus.DRAFT &&
            request.status != ServiceStatus.AWAITING_PAYMENT &&
            request.status != ServiceStatus.CANCELLED) ...[
          OutlinedButton.icon(
            onPressed: () => _emailReceipt(context, ref),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.brandBlue,
              side: const BorderSide(color: AppTheme.brandBlue),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            icon: const Icon(Icons.receipt_long_outlined),
            label: const Text('Enviar recibo por email', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 12),
        ],

        // Cancel
        if (ServiceStatusUi.cancellable(request.status))
          OutlinedButton.icon(
            onPressed: () => _confirmCancel(context, ref),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppTheme.brandRed,
              side: const BorderSide(color: AppTheme.brandRed),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            icon: const Icon(Icons.cancel_outlined),
            label: const Text('Cancelar pedido', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        const SizedBox(height: 12),
        Center(
          child: TextButton(
            onPressed: () => context.push('/client/account/terms'),
            child: const Text('Termos e condições'),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Future<void> _emailReceipt(BuildContext context, WidgetRef ref) async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('A enviar recibo...')),
    );
    try {
      final email = await ref.read(clientServiceProvider).emailReceipt(request.id);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Recibo enviado para $email')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível enviar o recibo.')),
        );
      }
    }
  }

  Future<void> _confirmCancel(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancelar pedido?'),
        content: const Text('Tens a certeza que queres cancelar este pedido? Esta ação não pode ser revertida.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Não')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Sim, cancelar', style: TextStyle(color: AppTheme.brandRed)),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(clientServiceProvider).cancelServiceRequest(request.id);
      ref.invalidate(clientServiceRequestsProvider);
      ref.invalidate(serviceRequestDetailProvider(request.id));
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pedido cancelado')),
        );
      }
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível cancelar o pedido')),
        );
      }
    }
  }
}

class _Card extends StatelessWidget {
  final String title;
  final Widget child;
  const _Card({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _IconLine extends StatelessWidget {
  final IconData icon;
  final String text;
  const _IconLine({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey[600]),
        const SizedBox(width: 10),
        Expanded(child: Text(text, style: const TextStyle(fontSize: 14, height: 1.4))),
      ],
    );
  }
}

class _PriceRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _PriceRow(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: bold ? 16 : 14,
      fontWeight: bold ? FontWeight.bold : FontWeight.normal,
      color: bold ? AppTheme.brandRed : Colors.black87,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(fontSize: bold ? 16 : 14, fontWeight: bold ? FontWeight.bold : FontWeight.normal))),
          Text(value, style: style),
        ],
      ),
    );
  }
}

class _Stars extends StatelessWidget {
  final int rating;
  final double size;
  const _Stars({required this.rating, this.size = 20});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
        5,
        (i) => Icon(i < rating ? Icons.star_rounded : Icons.star_border_rounded,
            color: const Color(0xFFF59E0B), size: size),
      ),
    );
  }
}

class _ReviewView extends StatelessWidget {
  final ReviewInfo review;
  const _ReviewView({required this.review});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Stars(rating: review.rating, size: 24),
        if (review.comment != null && review.comment!.isNotEmpty) ...[
          const SizedBox(height: 8),
          Text(review.comment!, style: const TextStyle(fontSize: 14, height: 1.4)),
        ],
      ],
    );
  }
}

class _ReviewForm extends ConsumerStatefulWidget {
  final String requestId;
  const _ReviewForm({required this.requestId});

  @override
  ConsumerState<_ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends ConsumerState<_ReviewForm> {
  int _rating = 0;
  final _commentCtrl = TextEditingController();
  bool _submitting = false;

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_rating == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Escolhe uma classificação de 1 a 5 estrelas.')),
      );
      return;
    }
    setState(() => _submitting = true);
    try {
      await ref.read(clientServiceProvider).submitReview(
            widget.requestId,
            _rating,
            comment: _commentCtrl.text.trim(),
          );
      ref.invalidate(serviceRequestDetailProvider(widget.requestId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Obrigado pela tua avaliação!')),
        );
      }
    } catch (_) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível enviar a avaliação.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Como correu o serviço?', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        const SizedBox(height: 10),
        Row(
          children: List.generate(5, (i) {
            final filled = i < _rating;
            return IconButton(
              padding: const EdgeInsets.symmetric(horizontal: 2),
              constraints: const BoxConstraints(),
              onPressed: _submitting ? null : () => setState(() => _rating = i + 1),
              icon: Icon(
                filled ? Icons.star_rounded : Icons.star_border_rounded,
                color: const Color(0xFFF59E0B),
                size: 38,
              ),
            );
          }),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _commentCtrl,
          maxLines: 3,
          maxLength: 1000,
          enabled: !_submitting,
          decoration: const InputDecoration(
            hintText: 'Deixa um comentário (opcional)',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: _submitting ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.brandRed,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
            ),
            child: _submitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('ENVIAR AVALIAÇÃO', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ),
      ],
    );
  }
}

class _TimelineRow extends StatelessWidget {
  final StatusHistoryEntry entry;
  final bool isLast;
  const _TimelineRow({required this.entry, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final ui = ServiceStatusUi.of(entry.newStatus);
    final timeFmt = DateFormat('dd/MM/yyyy HH:mm', 'pt_PT');
    // O último registo é o estado atual — nó maior, com ícone e anel de destaque.
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: ui.color.withOpacity(isLast ? 1 : 0.14),
                  shape: BoxShape.circle,
                  border: Border.all(color: ui.color, width: isLast ? 0 : 1.5),
                  boxShadow: isLast
                      ? [BoxShadow(color: ui.color.withOpacity(0.35), blurRadius: 8, spreadRadius: 1)]
                      : null,
                ),
                child: Icon(ui.icon, size: 15, color: isLast ? Colors.white : ui.color),
              ),
              if (!isLast) Expanded(child: Container(width: 2, color: Colors.grey.shade300)),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(top: 4, bottom: isLast ? 0 : 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(ui.label,
                      style: TextStyle(
                          fontWeight: isLast ? FontWeight.bold : FontWeight.w600,
                          fontSize: 14,
                          color: isLast ? ui.color : Colors.black87)),
                  Text(timeFmt.format(entry.createdAt.toLocal()),
                      style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                  if (entry.notes != null && entry.notes!.isNotEmpty)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(entry.notes!, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
