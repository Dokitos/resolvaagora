import 'package:flutter/material.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../data/services_data.dart';
import '../../../data/catalog_i18n.dart';
import '../../../core/services/client_service.dart';
import 'booking_provider.dart';

class CategoryDetailPage extends ConsumerWidget {
  final ServiceCategory category;
  const CategoryDetailPage({super.key, required this.category});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = Localizations.localeOf(context);
    return Scaffold(
      backgroundColor: Colors.white,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            backgroundColor: const Color(0xFF161616),
            foregroundColor: Colors.white,
            title: Text(category.localizedName(locale)),
            leading: IconButton(
              icon: const Icon(Icons.arrow_back),
              onPressed: () => context.pop(),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    category.localizedName(locale),
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Color(0xFF161616)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    category.localizedDescription(locale),
                    style: TextStyle(color: Colors.grey[600], fontSize: 14, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, i) => _SubcategoryCard(
                category: category,
                sub: category.subcategories[i],
              ),
              childCount: category.subcategories.length,
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }
}

class _SubcategoryCard extends ConsumerWidget {
  final ServiceCategory category;
  final ServiceSubcategory sub;
  const _SubcategoryCard({required this.category, required this.sub});

  void _request(BuildContext context, WidgetRef ref) {
    ref.read(bookingProvider.notifier).selectCategory(category);
    ref.read(bookingProvider.notifier).selectSubcategory(sub);
    context.push('/booking/items');
  }

  /// "Saber mais": descrição completa e o preço de cada item, que o cartão só
  /// resume num "Desde". O botão existia desde o início mas não fazia nada.
  void _showDetails(BuildContext context, WidgetRef ref, List<ServiceItem> items) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        builder: (_, scroll) => Column(
          children: [
            Expanded(
              child: ListView(
                controller: scroll,
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                children: [
                  Text(
                    sub.localizedName(locale),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    sub.localizedDescription(locale),
                    style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.4),
                  ),
                  const SizedBox(height: 20),
                  if (items.isNotEmpty) ...[
                    Text(
                      l.learnMorePrices,
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 8),
                    for (final item in items) _ItemPriceRow(item: item),
                    const SizedBox(height: 12),
                  ],
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF8E1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_outline, size: 18, color: Colors.orange),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            sub.hasCustomQuote ? l.learnMoreCustomQuote : l.learnMoreFinalPrice,
                            style: TextStyle(fontSize: 12, color: Colors.grey[800], height: 1.35),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(sheetContext).pop();
                      _request(context, ref);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black87,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 0,
                    ),
                    child: Text(
                      l.requestService,
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(catalogPricesLoadedProvider); // rebuild quando os preços do admin chegarem
    final locale = Localizations.localeOf(context);
    final visibleItems = sub.items.where((i) => !i.hidden).toList();
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(sub.localizedName(locale), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text(sub.localizedDescription(locale), style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (visibleItems.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
              child: Text(
                AppLocalizations.of(context).priceFrom(
                    '€${visibleItems.map((i) => i.price).reduce((a, b) => a < b ? a : b).toStringAsFixed(2)}'),
                style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => _showDetails(context, ref, visibleItems),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.black87,
                      side: const BorderSide(color: Colors.black26),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    child: Text(AppLocalizations.of(context).learnMore, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _request(context, ref),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.black87,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                      elevation: 0,
                    ),
                    child: Text(AppLocalizations.of(context).requestService, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Linha de preço de um item na janela "Saber mais".
class _ItemPriceRow extends StatelessWidget {
  final ServiceItem item;
  const _ItemPriceRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final notes = item.notes?.trim() ?? '';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.localizedName(locale), style: const TextStyle(fontSize: 14)),
                if (notes.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(notes, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '€${item.price.toStringAsFixed(2)}',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
              ),
              if (item.unit != null)
                Text(l.perUnit(item.unit!), style: TextStyle(fontSize: 11, color: Colors.grey[500])),
            ],
          ),
        ],
      ),
    );
  }
}
