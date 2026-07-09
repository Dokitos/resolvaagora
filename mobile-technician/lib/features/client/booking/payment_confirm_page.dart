import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_stripe/flutter_stripe.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/services/client_service.dart';
import '../../../core/services/settings_service.dart';
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
    final itemsTotal = ref.read(bookingProvider).total; // só os itens
    try {
      // 1) Cria o pedido.
      final sr = await ref.read(bookingProvider.notifier).submit(ref.read(clientServiceProvider));
      // 2) Cobra o total (itens + deslocação).
      final res = await ref.read(clientServiceProvider).payOrder(sr.id, itemsTotal);

      // Modo de teste / visita grátis → já ficou pago no servidor.
      if (res['simulated'] == true) {
        _done();
        return;
      }

      // Pagamento real → PaymentSheet nativa da Stripe.
      final clientSecret = res['clientSecret'] as String?;
      final pk = res['publishableKey'] as String?;
      if (clientSecret == null || pk == null || pk.isEmpty) {
        throw Exception('Pagamento indisponível de momento.');
      }
      Stripe.publishableKey = pk;
      await Stripe.instance.applySettings();
      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'ResolvaAgora',
          style: ThemeMode.light,
        ),
      );
      await Stripe.instance.presentPaymentSheet();
      // Sucesso — o webhook marca o pedido como PAGO no servidor.
      _done();
    } on StripeException catch (_) {
      // Utilizador fechou/cancelou a folha de pagamento.
      if (!mounted) return;
      setState(() => _processing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pagamento cancelado.')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _processing = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível concluir o pagamento. Tenta novamente.')),
      );
    }
  }

  void _done() {
    ref.invalidate(clientServiceRequestsProvider);
    if (!mounted) return;
    context.pushReplacement('/booking/confirmation');
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
    // Deslocação efetiva (já com o desconto da subscrição) — bate certo com o
    // valor cobrado pela Stripe.
    final displacement = ref.watch(effectiveDisplacementProvider).valueOrNull ??
        (ref.watch(appSettingsProvider).valueOrNull?.displacementFee ?? 25.0);
    final itemsTotal = booking.total;
    final total = itemsTotal + displacement;

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: AppTheme.brandBlack,
        foregroundColor: Colors.white,
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        title: const SizedBox.shrink(),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
        children: [
          // CTA principal
          SizedBox(
            height: 56,
            child: ElevatedButton(
              onPressed: _processing ? null : _confirm,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandYellow,
                foregroundColor: Colors.black,
                disabledBackgroundColor: Colors.grey[300],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: _processing
                  ? const SizedBox(
                      height: 24, width: 24,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                  : Text('PAGAR ${fmt.format(total)}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1)),
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

          // Cartão de preço (com deslocação sempre incluída)
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
                _row('Serviço', fmt.format(itemsTotal)),
                const Divider(height: 24),
                _row('Taxa de deslocação', fmt.format(displacement)),
                const Divider(height: 24),
                _row('IVA', 'incl.', muted: true),
                const Divider(height: 24),
                Row(
                  children: [
                    const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const Spacer(),
                    Text(fmt.format(total),
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.brandBlack)),
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Informação sobre pagamento', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                Text(
                  'O valor inclui a taxa de deslocação do técnico. Com o pagamento, confirma o '
                  'interesse na contratação de uma equipa profissional ResolvaAgora.',
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
