import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/technician_service.dart';
import '../../core/utils/formatters.dart';
import '../../core/theme/app_theme.dart';

class SendQuoteScreen extends ConsumerStatefulWidget {
  final String jobId;
  const SendQuoteScreen({super.key, required this.jobId});

  @override
  ConsumerState<SendQuoteScreen> createState() => _SendQuoteScreenState();
}

class _SendQuoteScreenState extends ConsumerState<SendQuoteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _descCtrl = TextEditingController();
  final _laborCtrl = TextEditingController(text: '0');
  final _materialsCtrl = TextEditingController(text: '0');
  bool _submitting = false;

  static const double _vatRate = 0.23;

  double get _labor => double.tryParse(_laborCtrl.text.replaceAll(',', '.')) ?? 0;
  double get _materials => double.tryParse(_materialsCtrl.text.replaceAll(',', '.')) ?? 0;
  double get _subtotal => _labor + _materials;
  double get _vat => _subtotal * _vatRate;
  double get _total => _subtotal + _vat;

  @override
  void dispose() {
    _descCtrl.dispose();
    _laborCtrl.dispose();
    _materialsCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await ref.read(technicianServiceProvider).sendQuote(
        widget.jobId,
        description: _descCtrl.text.trim(),
        laborCost: _labor,
        materialsCost: _materials,
      );
      ref.invalidate(jobDetailProvider(widget.jobId));
      ref.invalidate(assignedJobsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Orçamento enviado com sucesso'), backgroundColor: AppTheme.success),
        );
        context.pop();
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enviar Orçamento'),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _descCtrl,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Descrição do trabalho',
                alignLabelWithHint: true,
              ),
              validator: (v) => (v?.trim().length ?? 0) >= 10 ? null : 'Mínimo 10 caracteres',
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    controller: _laborCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Mão de obra (€)',
                      prefixText: '€ ',
                    ),
                    onChanged: (_) => setState(() {}),
                    validator: (v) {
                      final n = double.tryParse(v?.replaceAll(',', '.') ?? '');
                      return (n != null && n >= 0) ? null : 'Valor inválido';
                    },
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    controller: _materialsCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Materiais (€)',
                      prefixText: '€ ',
                    ),
                    onChanged: (_) => setState(() {}),
                    validator: (v) {
                      final n = double.tryParse(v?.replaceAll(',', '.') ?? '');
                      return (n != null && n >= 0) ? null : 'Valor inválido';
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Resumo', style: TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 12),
                    _SummaryRow('Mão de obra', formatCurrency(_labor)),
                    _SummaryRow('Materiais', formatCurrency(_materials)),
                    _SummaryRow('IVA (23%)', formatCurrency(_vat)),
                    const Divider(height: 16),
                    _SummaryRow('Total cliente paga', formatCurrency(_total), bold: true, color: AppTheme.primary),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppTheme.border),
                      ),
                      child: Text(
                        'O orçamento expira em 48h. O cliente receberá uma notificação.',
                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Enviar Orçamento', style: TextStyle(fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? color;
  const _SummaryRow(this.label, this.value, {this.bold = false, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 14))),
          Text(
            value,
            style: TextStyle(
              fontWeight: bold ? FontWeight.bold : FontWeight.w500,
              fontSize: bold ? 16 : 14,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
