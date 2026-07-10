import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../core/models/client_profile.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';
import 'booking_provider.dart';

class PaymentPage extends ConsumerStatefulWidget {
  const PaymentPage({super.key});

  @override
  ConsumerState<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends ConsumerState<PaymentPage> {
  final _phoneCtrl = TextEditingController();
  final _promoCtrl = TextEditingController();
  final _nifCtrl = TextEditingController();
  final _billStreetCtrl = TextEditingController();
  final _billNumberCtrl = TextEditingController();
  final _billPostalCtrl = TextEditingController();
  final _billCityCtrl = TextEditingController();
  bool _usePromo = false;
  PromoResult? _promo;
  bool _validatingPromo = false;

  @override
  void initState() {
    super.initState();
    final b = ref.read(bookingProvider);
    final phone = b.phone.replaceAll('+351', '').trim();
    _phoneCtrl.text = phone;
    _promoCtrl.text = b.promoCode;
    _nifCtrl.text = b.nif;
    _billStreetCtrl.text = b.billingStreet;
    _billNumberCtrl.text = b.billingNumber;
    _billPostalCtrl.text = b.billingPostalCode;
    _billCityCtrl.text = b.billingCity;
    _usePromo = b.promoCode.isNotEmpty;
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _promoCtrl.dispose();
    _nifCtrl.dispose();
    _billStreetCtrl.dispose();
    _billNumberCtrl.dispose();
    _billPostalCtrl.dispose();
    _billCityCtrl.dispose();
    super.dispose();
  }

  Future<void> _applyPromo() async {
    final code = _promoCtrl.text.trim();
    if (code.isEmpty) return;
    setState(() => _validatingPromo = true);
    try {
      // Valida contra o TOTAL do pedido (itens + deslocação) — o desconto
      // aplica-se ao total, tal como o backend faz no pagamento.
      final displacement = ref.read(effectiveDisplacementProvider).valueOrNull ?? 0;
      final orderTotal = ref.read(bookingProvider).total + displacement;
      final res = await ref.read(clientServiceProvider).validatePromo(code, orderTotal);
      final notifier = ref.read(bookingProvider.notifier);
      if (res.valid) {
        notifier.setPromo(code, res.discount);
      } else {
        notifier.clearPromo();
      }
      setState(() { _promo = res; _validatingPromo = false; });
    } catch (_) {
      setState(() {
        _promo = const PromoResult(valid: false, message: 'Não foi possível validar o código.');
        _validatingPromo = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final booking = ref.watch(bookingProvider);
    final notifier = ref.read(bookingProvider.notifier);
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final method = booking.paymentMethod;

    return Scaffold(
      backgroundColor: Colors.white,
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
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              children: [
                const Text(
                  'Escolhe o teu método de pagamento',
                  style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, height: 1.2),
                ),
                const SizedBox(height: 24),
                const Text('Dados de pagamento',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Text('MÉTODO DE PAGAMENTO',
                    style: TextStyle(color: Colors.grey[500], fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _MethodCard(
                        selected: method == 'mbway',
                        onTap: () => notifier.setPaymentMethod('mbway'),
                        child: const _MbWayLogo(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      flex: 2,
                      child: _MethodCard(
                        selected: method == 'card',
                        onTap: () => notifier.setPaymentMethod('card'),
                        child: const _CardBrands(),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _MethodCard(
                        selected: method == 'multibanco',
                        onTap: () => notifier.setPaymentMethod('multibanco'),
                        child: const _MultibancoLogo(),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // MB Way → phone number
                if (method == 'mbway') ...[
                  Text('NÚMERO DE TELEMÓVEL',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                  const SizedBox(height: 10),
                  _PhoneField(
                    controller: _phoneCtrl,
                    onChanged: (v) => notifier.setPhone('+351 $v'),
                  ),
                  const SizedBox(height: 16),
                ],

                // Cartão → os dados são pedidos de forma segura no passo seguinte
                // (folha de pagamento nativa da Stripe). Não recolhemos aqui o
                // número do cartão.
                if (method == 'card') ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.brandYellowSoft,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppTheme.brandYellow.withOpacity(0.5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.lock_outline, size: 20, color: AppTheme.brandBlack),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Os dados do cartão são pedidos no passo seguinte, de forma '
                            'segura, através da Stripe.',
                            style: TextStyle(color: Colors.grey[800], fontSize: 13, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Multibanco info
                if (method == 'multibanco') ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0F4FF),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      'Será gerada uma referência Multibanco após a confirmação, válida por 24h.',
                      style: TextStyle(color: Colors.grey[700], fontSize: 13, height: 1.4),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],

                // Promo code
                CheckboxListTile(
                  value: _usePromo,
                  onChanged: (v) {
                    final on = v ?? false;
                    if (!on) {
                      ref.read(bookingProvider.notifier).clearPromo();
                      _promo = null;
                    }
                    setState(() => _usePromo = on);
                  },
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  activeColor: AppTheme.brandRed,
                  title: const Text('Usar código promocional'),
                ),
                if (_usePromo) ...[
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _promoCtrl,
                          textCapitalization: TextCapitalization.characters,
                          decoration: _inputDecoration('Código promocional', Icons.local_offer_outlined),
                        ),
                      ),
                      const SizedBox(width: 8),
                      SizedBox(
                        height: 52,
                        child: ElevatedButton(
                          onPressed: _validatingPromo ? null : _applyPromo,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.brandBlue,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: _validatingPromo
                              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('Aplicar'),
                        ),
                      ),
                    ],
                  ),
                  if (_promo != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(
                        children: [
                          Icon(_promo!.valid ? Icons.check_circle : Icons.error_outline,
                              size: 16, color: _promo!.valid ? const Color(0xFF16A34A) : AppTheme.brandRed),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              _promo!.valid
                                  ? 'Código aplicado — poupas ${fmt.format(_promo!.discount)}'
                                  : (_promo!.message ?? 'Código inválido'),
                              style: TextStyle(fontSize: 12, color: _promo!.valid ? const Color(0xFF16A34A) : AppTheme.brandRed),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 8),
                ],
                const SizedBox(height: 8),

                // NIF
                Text('NIF',
                    style: TextStyle(color: Colors.grey[500], fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
                const SizedBox(height: 10),
                TextField(
                  controller: _nifCtrl,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  onChanged: notifier.setNif,
                  decoration: _inputDecoration('Adicionar NIF', Icons.badge_outlined),
                ),
                const SizedBox(height: 8),

                // Billing address
                CheckboxListTile(
                  value: booking.useDifferentBillingAddress,
                  onChanged: (v) => notifier.setUseDifferentBillingAddress(v ?? false),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  activeColor: AppTheme.brandRed,
                  title: const Text('Usar morada de faturação diferente da morada do serviço.'),
                ),
                if (booking.useDifferentBillingAddress) ...[
                  const SizedBox(height: 4),
                  TextField(
                    controller: _billStreetCtrl,
                    onChanged: (v) => notifier.setBillingAddress(street: v),
                    textCapitalization: TextCapitalization.words,
                    decoration: _inputDecoration('Rua / Morada', Icons.location_on_outlined),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _billNumberCtrl,
                          onChanged: (v) => notifier.setBillingAddress(number: v),
                          decoration: _inputDecoration('Nº / Andar', Icons.tag),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _billPostalCtrl,
                          keyboardType: TextInputType.number,
                          onChanged: (v) => notifier.setBillingAddress(postalCode: v),
                          decoration: _inputDecoration('Cód. postal', Icons.markunread_mailbox_outlined),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _billCityCtrl,
                    onChanged: (v) => notifier.setBillingAddress(city: v),
                    textCapitalization: TextCapitalization.words,
                    decoration: _inputDecoration('Localidade', Icons.location_city_outlined),
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),

          // Bottom bar
          SafeArea(
            top: false,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              decoration: BoxDecoration(
                color: Colors.white,
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, -2))],
              ),
              child: Column(
                children: [
                  Builder(builder: (_) {
                    final displacement =
                        ref.watch(effectiveDisplacementProvider).valueOrNull ?? 0;
                    final discount = _promo?.valid == true ? _promo!.discount : 0.0;
                    final grandTotal =
                        (booking.total + displacement - discount).clamp(0, double.infinity);
                    return Column(
                      children: [
                        _totalRow('Serviço', fmt.format(booking.total), muted: true),
                        const SizedBox(height: 4),
                        _totalRow('Taxa de deslocação', fmt.format(displacement), muted: true),
                        if (discount > 0) ...[
                          const SizedBox(height: 4),
                          _totalRow('Desconto', '- ${fmt.format(discount)}', muted: true),
                        ],
                        const Divider(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total', style: TextStyle(fontSize: 14, color: Colors.grey)),
                            Text(fmt.format(grandTotal),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: AppTheme.brandBlack)),
                          ],
                        ),
                      ],
                    );
                  }),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () => context.push('/booking/payment-confirm'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.brandRed,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        elevation: 0,
                      ),
                      child: const Text('AVANÇAR',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 1)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String hint, IconData icon) => InputDecoration(
        hintText: hint,
        prefixIcon: Icon(icon),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.brandRed, width: 2),
        ),
      );

  Widget _totalRow(String label, String value, {bool muted = false}) => Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 13, color: Colors.grey[600])),
          Text(value,
              style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: muted ? Colors.grey[700] : Colors.black87)),
        ],
      );
}

class _MethodCard extends StatelessWidget {
  final bool selected;
  final VoidCallback onTap;
  final Widget child;
  const _MethodCard({required this.selected, required this.onTap, required this.child});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        height: 64,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected ? AppTheme.brandBlue : Colors.grey.shade300,
            width: selected ? 2 : 1,
          ),
        ),
        child: Center(child: child),
      ),
    );
  }
}

class _MbWayLogo extends StatelessWidget {
  const _MbWayLogo();
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
          decoration: BoxDecoration(
            border: Border.all(color: AppTheme.brandRed, width: 1.5),
            borderRadius: BorderRadius.circular(4),
          ),
          child: const Text('MB', style: TextStyle(color: AppTheme.brandRed, fontWeight: FontWeight.w900, fontSize: 13)),
        ),
        const SizedBox(width: 4),
        const Text('WAY', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12)),
      ],
    );
  }
}

class _CardBrands extends StatelessWidget {
  const _CardBrands();
  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: const [
        _Brand('VISA', Color(0xFF1A1F71)),
        SizedBox(width: 6),
        _Brand('MC', Color(0xFFEB001B)),
        SizedBox(width: 6),
        _Brand('AMEX', Color(0xFF2E77BC)),
      ],
    );
  }
}

class _Brand extends StatelessWidget {
  final String label;
  final Color color;
  const _Brand(this.label, this.color);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
      child: Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
    );
  }
}

class _MultibancoLogo extends StatelessWidget {
  const _MultibancoLogo();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
      decoration: BoxDecoration(
        border: Border.all(color: AppTheme.brandBlue, width: 1.5),
        borderRadius: BorderRadius.circular(4),
      ),
      child: const Text('MB', style: TextStyle(color: AppTheme.brandBlue, fontWeight: FontWeight.w900, fontSize: 14)),
    );
  }
}

class _PhoneField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  const _PhoneField({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade300),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            child: Row(
              children: [
                Text('🇵🇹', style: TextStyle(fontSize: 18)),
                SizedBox(width: 6),
                Text('+351', style: TextStyle(fontWeight: FontWeight.w600)),
              ],
            ),
          ),
          Container(width: 1, height: 28, color: Colors.grey.shade300),
          Expanded(
            child: TextField(
              controller: controller,
              keyboardType: TextInputType.phone,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              onChanged: onChanged,
              decoration: const InputDecoration(
                hintText: 'Telefone',
                prefixIcon: Icon(Icons.phone_outlined),
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

