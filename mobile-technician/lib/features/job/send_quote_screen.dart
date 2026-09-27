import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/technician_service.dart';
import '../../core/utils/formatters.dart';
import '../../core/theme/app_theme.dart';
import '../../core/utils/input_formatters.dart';

/// Extrai uma mensagem amigável do erro, evitando expor detalhes técnicos
/// diretamente ao utilizador — segue o mesmo padrão usado em
/// `auth_service.dart`.
String _friendlyError(Object e) {
  if (e is DioException) {
    final msg = e.response?.data is Map ? e.response?.data['message'] : null;
    if (msg == null) return 'Erro de ligação, tenta novamente';
    return msg is List ? msg.join(', ') : msg.toString();
  }
  return 'Ocorreu um erro, tenta novamente';
}

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

  /// Nível de dificuldade escolhido pelo técnico ('GREEN' | 'YELLOW' | 'RED').
  /// Começa em 'GREEN' (o caso mais comum) para não obrigar a um clique
  /// extra em trabalhos simples, mas é fácil de mudar antes de enviar.
  String _difficultyTier = 'GREEN';

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
        difficultyTier: _difficultyTier,
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
          SnackBar(content: Text(_friendlyError(e)), backgroundColor: AppTheme.danger),
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
              inputFormatters: cleanTextFormatters(2000),
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
            const Text('Nível de dificuldade', style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(
              'Isto ajuda o cliente a saber se o orçamento pode ser pago com os créditos do plano dele.',
              style: TextStyle(fontSize: 12, color: Colors.grey[600]),
            ),
            const SizedBox(height: 12),
            _DifficultyOption(
              label: 'Simples',
              description: 'Trabalho simples e rápido',
              color: AppTheme.success,
              selected: _difficultyTier == 'GREEN',
              onTap: () => setState(() => _difficultyTier = 'GREEN'),
            ),
            const SizedBox(height: 8),
            _DifficultyOption(
              label: 'Intermédio',
              description: 'Dificuldade intermédia',
              color: AppTheme.warning,
              selected: _difficultyTier == 'YELLOW',
              onTap: () => setState(() => _difficultyTier = 'YELLOW'),
            ),
            const SizedBox(height: 8),
            _DifficultyOption(
              label: 'Especializado',
              description: 'Intervenção técnica ou especializada',
              color: AppTheme.danger,
              selected: _difficultyTier == 'RED',
              onTap: () => setState(() => _difficultyTier = 'RED'),
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

/// Cartão selecionável para escolher o nível de dificuldade do trabalho
/// (verde/amarelo/vermelho), reaproveitando as cores de estado do
/// `AppTheme` (success/warning/danger).
class _DifficultyOption extends StatelessWidget {
  final String label;
  final String description;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  const _DifficultyOption({
    required this.label,
    required this.description,
    required this.color,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      selected: selected,
      label: '$label. $description',
      child: Material(
        color: selected ? color.withOpacity(0.08) : Colors.white,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: selected ? color : AppTheme.border, width: selected ? 2 : 1),
            ),
            child: Row(
              children: [
                Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: TextStyle(fontWeight: FontWeight.w600, color: selected ? color : Colors.black87),
                      ),
                      Text(description, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                ),
                if (selected) Icon(Icons.check_circle, color: color, size: 20),
              ],
            ),
          ),
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
