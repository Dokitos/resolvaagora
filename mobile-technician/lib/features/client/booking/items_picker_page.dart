import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../data/catalog_i18n.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class ItemsPickerPage extends ConsumerWidget {
  const ItemsPickerPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingProvider);
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final sub = booking.subcategory;
    if (sub == null) {
      return Scaffold(body: Center(child: Text(l.subcategoryError)));
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color(0xFF161616),
        foregroundColor: Colors.white,
        title: Text(booking.category?.localizedName(locale) ?? ''),
        leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(0, 0, 0, 8),
              // Visita grátis → modo "diagnóstico": sem itens nem preços (o
              // pedido segue com total 0 para o backend descontar 1 visita).
              children: booking.useFreeVisit
                  ? const [_FreeVisitDiagnosis()]
                  : [
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                        child: Text(
                          sub.hasCustomQuote
                              ? l.describeWhatYouNeed
                              : l.componentsNeeding(sub.localizedName(locale).toLowerCase()),
                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                        ),
                      ),
                      if (sub.hasCustomQuote)
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Text(
                            l.customQuoteNote,
                            style: const TextStyle(color: Colors.grey, fontSize: 14),
                          ),
                        )
                      else
                        ...booking.items.map((bi) => _ItemRow(bookingItem: bi)),
                    ],
            ),
          ),
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: () => context.push('/booking/details'),
            nextEnabled: sub.hasCustomQuote || booking.hasItems || booking.useFreeVisit,
          ),
        ],
      ),
    );
  }
}

/// Cartão informativo do modo "visita de diagnóstico gratuita": não há itens
/// nem custos a escolher — o pedido segue com total 0 e o técnico diagnostica
/// no local, enviando um orçamento se for preciso avançar.
class _FreeVisitDiagnosis extends StatelessWidget {
  const _FreeVisitDiagnosis();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Visita de diagnóstico gratuita',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
          ),
          const SizedBox(height: 20),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFFFFF8E1),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFF5B301)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: const [
                Row(
                  children: [
                    Icon(Icons.card_giftcard, color: Color(0xFF161616)),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Estás a usar uma visita grátis do teu plano.',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Text(
                  'Não precisas de escolher itens: o técnico desloca-se sem qualquer '
                  'custo, avalia o problema no local e, se for preciso avançar com a '
                  'reparação, envia-te um orçamento para aprovares.',
                  style: TextStyle(fontSize: 14, height: 1.5, color: Colors.black87),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Continua para escolheres a data e a morada da visita.',
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
        ],
      ),
    );
  }
}

class _ItemRow extends ConsumerWidget {
  final BookingItem bookingItem;
  const _ItemRow({required this.bookingItem});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final item = bookingItem.item;
    final qty = bookingItem.qty;

    return Container(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: Colors.grey.shade200)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.localizedName(Localizations.localeOf(context)), style: const TextStyle(fontSize: 15)),
                if (item.unit != null)
                  Text(AppLocalizations.of(context).perUnit(item.unit!), style: TextStyle(color: Colors.grey[500], fontSize: 12)),
              ],
            ),
          ),
          // — 0 + row
          Row(
            children: [
              _CircleBtn(
                icon: Icons.remove,
                onTap: qty > 0
                    ? () => ref.read(bookingProvider.notifier).setItemQty(item.id, qty - 1)
                    : null,
              ),
              SizedBox(
                width: 32,
                child: Center(
                  child: Text('$qty', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              _CircleBtn(
                icon: Icons.add,
                filled: true,
                onTap: () => ref.read(bookingProvider.notifier).setItemQty(item.id, qty + 1),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final bool filled;
  final VoidCallback? onTap;
  const _CircleBtn({required this.icon, this.filled = false, this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: filled
              ? const Color(0xFFF5B301)
              : onTap != null
                  ? Colors.white
                  : Colors.grey[100],
          border: Border.all(
            color: filled
                ? const Color(0xFFF5B301)
                : Colors.grey.shade400,
          ),
        ),
        child: Icon(
          icon,
          size: 18,
          color: filled
              ? Colors.black
              : onTap != null
                  ? Colors.black54
                  : Colors.grey[300],
        ),
      ),
    );
  }
}
