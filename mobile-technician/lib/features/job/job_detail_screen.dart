import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/services/technician_service.dart';
import '../../core/models/service_request.dart';
import '../../core/utils/formatters.dart';
import '../../core/theme/app_theme.dart';

class JobDetailScreen extends ConsumerWidget {
  final String id;
  const JobDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final jobAsync = ref.watch(jobDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Detalhes do Serviço'),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: jobAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text(e.toString())),
        data: (job) => _JobDetailBody(job: job),
      ),
    );
  }
}

class _JobDetailBody extends ConsumerStatefulWidget {
  final ServiceRequest job;
  const _JobDetailBody({required this.job});

  @override
  ConsumerState<_JobDetailBody> createState() => _JobDetailBodyState();
}

class _JobDetailBodyState extends ConsumerState<_JobDetailBody> {
  bool _updating = false;

  Future<void> _updateStatus(String newStatus) async {
    final next = nextStatusOptions[widget.job.status.name];
    if (next == null || next['status'] != newStatus) return;

    if (newStatus == 'COMPLETED') {
      final proofs = widget.job.proofPhotos;
      if (proofs.length < 2) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('São necessárias pelo menos 2 fotos de prova antes de concluir.'),
            backgroundColor: AppTheme.danger,
          ),
        );
        return;
      }
    }

    if (newStatus == 'QUOTE_SENT') {
      context.push('/jobs/${widget.job.id}/quote');
      return;
    }

    setState(() => _updating = true);
    try {
      await ref.read(technicianServiceProvider).updateStatus(widget.job.id, newStatus);
      ref.invalidate(jobDetailProvider(widget.job.id));
      ref.invalidate(assignedJobsProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _updating = false);
    }
  }

  Future<void> _openMaps() async {
    final addr = widget.job.address;
    if (addr == null) return;
    final lat = addr.latitude;
    final lng = addr.longitude;
    Uri uri;
    if (lat != null && lng != null) {
      uri = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    } else {
      final q = Uri.encodeComponent('${addr.street} ${addr.number}, ${addr.city}');
      uri = Uri.parse('https://www.google.com/maps/search/?api=1&query=$q');
    }
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    final job = widget.job;
    final nextAction = nextStatusOptions[job.status.name];
    final icon = specialtyIcons[job.specialty.name] ?? '🔧';
    final label = specialtyLabels[job.specialty.name] ?? job.specialty.name;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Text(icon, style: const TextStyle(fontSize: 40)),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                        const SizedBox(height: 4),
                        _StatusChip(status: job.status.name),
                        if (job.isPriority)
                          const Padding(
                            padding: EdgeInsets.only(top: 4),
                            child: Text('⚡ Prioritário', style: TextStyle(color: AppTheme.warning, fontSize: 13)),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Client & Address
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Cliente', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 8),
                  if (job.client != null) ...[
                    Row(
                      children: [
                        const Icon(Icons.person_outline, size: 18, color: Colors.grey),
                        const SizedBox(width: 8),
                        Text(job.client!.fullName, style: const TextStyle(fontWeight: FontWeight.w500)),
                      ],
                    ),
                    if (job.client!.phone != null) ...[
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () => launchUrl(Uri.parse('tel:${job.client!.phone}')),
                        child: Row(
                          children: [
                            const Icon(Icons.phone_outlined, size: 18, color: AppTheme.primary),
                            const SizedBox(width: 8),
                            Text(job.client!.phone!, style: const TextStyle(color: AppTheme.primary)),
                          ],
                        ),
                      ),
                    ],
                  ],
                  if (job.address != null) ...[
                    const Divider(height: 20),
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 18, color: Colors.grey),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            '${job.address!.street} ${job.address!.number}${job.address!.floor != null ? ', ${job.address!.floor}' : ''}\n${job.address!.postalCode} ${job.address!.city}',
                            style: const TextStyle(fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    OutlinedButton.icon(
                      onPressed: _openMaps,
                      icon: const Icon(Icons.navigation_outlined, size: 18),
                      label: const Text('Navegar para o local'),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Description
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Descrição do Problema', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 8),
                  Text(job.description, style: const TextStyle(fontSize: 15, height: 1.5)),
                ],
              ),
            ),
          ),

          // Quote info (if exists)
          if (job.quote != null) ...[
            const SizedBox(height: 12),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Orçamento', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey, fontSize: 13)),
                    const SizedBox(height: 8),
                    _InfoRow('Mão de obra', formatCurrency(job.quote!.laborCost)),
                    _InfoRow('Materiais', formatCurrency(job.quote!.materialsCost)),
                    _InfoRow('IVA (23%)', formatCurrency(job.quote!.totalCost - job.quote!.laborCost - job.quote!.materialsCost)),
                    const Divider(),
                    _InfoRow('Total', formatCurrency(job.quote!.totalCost), bold: true),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: job.quote!.status == 'APPROVED'
                                ? AppTheme.success.withOpacity(0.1)
                                : job.quote!.status == 'REJECTED'
                                    ? AppTheme.danger.withOpacity(0.1)
                                    : Colors.orange.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            job.quote!.status == 'APPROVED' ? '✓ Aprovado'
                                : job.quote!.status == 'REJECTED' ? '✗ Rejeitado'
                                : '⏳ Aguarda resposta',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: job.quote!.status == 'APPROVED' ? AppTheme.success
                                  : job.quote!.status == 'REJECTED' ? AppTheme.danger
                                  : Colors.orange[700],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],

          // Proof photos
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Fotos de Prova', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.grey, fontSize: 13)),
                            Text(
                              '${job.proofPhotos.length} / 2 mínimas',
                              style: TextStyle(
                                fontSize: 12,
                                color: job.proofPhotos.length >= 2 ? AppTheme.success : AppTheme.danger,
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (['IN_DIAGNOSIS', 'QUOTE_APPROVED', 'IN_EXECUTION'].contains(job.status.name))
                        TextButton.icon(
                          onPressed: () => context.push('/jobs/${job.id}/photos'),
                          icon: const Icon(Icons.add_a_photo_outlined, size: 18),
                          label: const Text('Adicionar'),
                        ),
                    ],
                  ),
                  if (job.proofPhotos.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 90,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: job.proofPhotos.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (_, i) => ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            job.proofPhotos[i].url,
                            width: 90,
                            height: 90,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 90, height: 90,
                              color: Colors.grey[200],
                              child: const Icon(Icons.image_not_supported_outlined, color: Colors.grey),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),

          // Action button
          if (nextAction != null) ...[
            const SizedBox(height: 20),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _updating ? null : () => _updateStatus(nextAction['status']!),
                child: _updating
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(nextAction['label']!, style: const TextStyle(fontSize: 16)),
              ),
            ),
          ],
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final label = statusLabels[status] ?? status;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppTheme.primaryLight,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(label, style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w500)),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  const _InfoRow(this.label, this.value, {this.bold = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 14))),
          Text(value, style: TextStyle(fontWeight: bold ? FontWeight.bold : FontWeight.normal, fontSize: 14)),
        ],
      ),
    );
  }
}
