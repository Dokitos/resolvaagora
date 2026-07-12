import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../data/catalog_i18n.dart';
import '../booking_provider.dart';

class BookingFooterBar extends ConsumerWidget {
  final VoidCallback? onNext;
  final VoidCallback? onBack;
  final String? nextLabel;
  final bool nextEnabled;

  const BookingFooterBar({
    super.key,
    this.onNext,
    this.onBack,
    this.nextLabel,
    this.nextEnabled = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingProvider);
    final l = AppLocalizations.of(context);
    final total = booking.total;

    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, -2))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (total > 0)
            GestureDetector(
              onTap: () => _showPriceSheet(context, ref),
              child: Container(
                color: Colors.grey[50],
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                child: Row(
                  children: [
                    Text(
                      '${total.toStringAsFixed(2)}€',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${l.bookingSeeDetails} ↑',
                      style: TextStyle(color: Colors.grey[700], fontWeight: FontWeight.w600, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Row(
              children: [
                if (onBack != null)
                  Expanded(
                    child: OutlinedButton(
                      onPressed: onBack,
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        side: const BorderSide(color: Colors.black26),
                        foregroundColor: Colors.black,
                      ),
                      child: Text(l.bookingBack.toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                if (onBack != null) const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: nextEnabled ? onNext : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF161616),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey[300],
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: Text((nextLabel ?? l.bookingNext).toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showPriceSheet(BuildContext context, WidgetRef ref) {
    final booking = ref.read(bookingProvider);
    showModalBottomSheet(
      context: context,
      builder: (_) => _PriceDetailsSheet(booking: booking),
    );
  }
}

class _PriceDetailsSheet extends StatelessWidget {
  final BookingState booking;
  const _PriceDetailsSheet({required this.booking});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final selected = booking.selectedItems;
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            booking.subcategory?.localizedName(locale) ?? booking.category?.localizedName(locale) ?? l.priceService,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 16),
          if (selected.isNotEmpty) ...[
            Text(l.priceService, style: const TextStyle(color: Colors.grey, fontSize: 13)),
            const SizedBox(height: 8),
            ...selected.map((bi) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(child: Text(bi.item.localizedName(locale))),
                  Text('${(bi.item.price * bi.qty).toStringAsFixed(2)}€',
                      style: const TextStyle(fontWeight: FontWeight.w500)),
                ],
              ),
            )),
            const Divider(),
          ],
          Row(
            children: [
              Text(l.priceVat),
              const Spacer(),
              Text(l.priceIncluded, style: const TextStyle(color: Colors.grey)),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(l.priceTotal, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const Spacer(),
              Text(
                '${booking.total.toStringAsFixed(2)}€',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(l.serviceConditions, style: const TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(
            l.serviceConditionsText,
            style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.5),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }
}
