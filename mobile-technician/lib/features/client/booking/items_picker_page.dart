import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class ItemsPickerPage extends ConsumerWidget {
  const ItemsPickerPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingProvider);
    final sub = booking.subcategory;
    if (sub == null) {
      return const Scaffold(body: Center(child: Text('Erro: subcategoria não seleccionada')));
    }

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color(0xFF161616),
        foregroundColor: Colors.white,
        title: Text(booking.category?.name ?? ''),
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
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                  child: Text(
                    sub.hasCustomQuote
                        ? 'Descreve o que precisas'
                        : 'Quais são os componentes que precisam de ${sub.name.toLowerCase()}?',
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                  ),
                ),
                if (sub.hasCustomQuote)
                  const Padding(
                    padding: EdgeInsets.all(20),
                    child: Text(
                      'Este serviço é orçamentado no local pelo técnico. Avança para descrever o que precisas.',
                      style: TextStyle(color: Colors.grey, fontSize: 14),
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
            nextEnabled: sub.hasCustomQuote || booking.hasItems,
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
                Text(item.name, style: const TextStyle(fontSize: 15)),
                if (item.unit != null)
                  Text('por ${item.unit}', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
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
