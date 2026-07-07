import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';
import 'booking_provider.dart';

class PaymentConfirmPage extends ConsumerStatefulWidget {
  const PaymentConfirmPage({super.key});

  @override
  ConsumerState<PaymentConfirmPage> createState() => _PaymentConfirmPageState();
}

class _PaymentConfirmPageState extends ConsumerState<PaymentConfirmPage> {
  bool _processing = false;

  Future<void> _confirm() async {
    setState(() => _processing = true);
    try {
      await ref.read(bookingProvider.notifier).submit(ref.read(clientServiceProvider));
      ref.invalidate(clientServiceRequestsProvider);
      if (!mounted) return;
      context.pushReplacement('/booking/confirmation');
    } catch (_) {
      if (!mounted) return;
      setState(() => _processing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível concluir o pagamento. Tenta novamente.')),
      );
    }
  }

  String _cancellationDeadline(DateTime? date, String? slot) {
    if (date == null) return 'à data agendada do serviço';
    final dateFmt = DateFormat("d 'de' MMMM 'de' yyyy", 'pt_PT');
    final hour = slot != null
        ? (RegExp(r'(\d{1,2}:\d{2})').firstMatch(slot)?.group(1) ?? '')
        : '';
    final base = dateFmt.format(date.toLocal());
    return hour.isEmpty ? base : '$base, às $hour';
  }

  @override
  Widget build(BuildContext context) {
    final booking = ref.watch(bookingProvider);
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final categoryName = booking.category?.name ?? 'Serviço';

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        title: const SizedBox.shrink(),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          // Primary CTA at top (matches print)
          SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: _processing ? null : _confirm,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandRed,
                foregroundColor: Colors.white,
                disabledBackgroundColor: const Color(0xFFF3B5B5),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: _processing
                  ? const SizedBox(
                      height: 24, width: 24,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : const Text('CONFIRMAR PAGAMENTO',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1)),
            ),
          ),
          const SizedBox(height: 28),

          const Text('Política de Cancelamento',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Text(
              'Cancelamento grátis e com reembolso completo até '
              '${_cancellationDeadline(booking.scheduledDate, booking.scheduledSlot)}.',
              style: const TextStyle(fontSize: 15, height: 1.5),
            ),
          ),
          const SizedBox(height: 16),

          // Price card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(categoryName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
                const SizedBox(height: 16),
                _row('Valor a pagar', fmt.format(booking.total)),
                const Divider(height: 24),
                _row('IVA', 'incl.', muted: true),
                const Divider(height: 24),
                Row(
                  children: [
                    const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const Spacer(),
                    Text(fmt.format(booking.total),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.brandBlue)),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Informação sobre pagamento', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                Text(
                  'Com o pagamento deste serviço, está a confirmar o seu interesse na contratação '
                  'de uma equipa profissional ResolvaAgora para a execução do serviço.',
                  style: TextStyle(color: Colors.grey[600], fontSize: 13, height: 1.5),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Center(
            child: TextButton(
              onPressed: () => context.push('/client/account/terms'),
              child: const Text('Termos e condições'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {bool muted = false}) {
    return Row(
      children: [
        Text(label, style: const TextStyle(fontSize: 15)),
        const Spacer(),
        Text(value,
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w600,
                color: muted ? Colors.grey[600] : Colors.black87)),
      ],
    );
  }
}
