import 'package:flutter/material.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../data/services_data.dart';
import '../../../data/catalog_i18n.dart';
import '../../../core/services/catalog_content_service.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/service_photo.dart';
import 'booking_provider.dart';

class CategoryDetailPage extends ConsumerWidget {
  final ServiceCategory category;
  const CategoryDetailPage({super.key, required this.category});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(catalogPricesLoadedProvider); // rebuild quando os preços do admin chegarem
    final locale = Localizations.localeOf(context);
    final content = ref.watch(catalogContentProvider).valueOrNull ?? const {};

    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F8),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 210,
            backgroundColor: AppTheme.brandBlack,
            foregroundColor: Colors.white,
            leading: IconButton(icon: const Icon(Icons.arrow_back), onPressed: () => context.pop()),
            flexibleSpace: FlexibleSpaceBar(
              titlePadding: const EdgeInsetsDirectional.only(start: 56, bottom: 14, end: 16),
              title: Text(
                category.localizedName(locale),
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 18),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  ServicePhoto(
                    categoryId: category.id,
                    imageUrl: content.category(category.id).imageUrl,
                    iconSize: 72,
                  ),
                  // Escurece a base para o título ler bem sobre qualquer fotografia.
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Color(0xCC000000)],
                        stops: [0.45, 1],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      category.localizedDescription(locale),
                      style: TextStyle(color: Colors.grey[700], fontSize: 14, height: 1.45),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Desde', style: TextStyle(fontSize: 12, color: Colors.grey[500])),
                      Text(
                        '€${category.basePrice.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                      ),
                    ],
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
                content: content.service(category.id, category.subcategories[i].id),
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

/// Cartão de um serviço: ícone, preço de partida, nome, descrição, e as duas
/// ações lado a lado — o formato da página de subcategorias da referência.
class _SubcategoryCard extends ConsumerWidget {
  final ServiceCategory category;
  final ServiceSubcategory sub;
  final CatalogContent content;
  const _SubcategoryCard({required this.category, required this.sub, required this.content});

  void _request(BuildContext context, WidgetRef ref) {
    ref.read(bookingProvider.notifier).selectCategory(category);
    ref.read(bookingProvider.notifier).selectSubcategory(sub);
    context.push('/booking/items');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final visibleItems = sub.items.where((i) => !i.hidden).toList();
    final from = visibleItems.isEmpty
        ? null
        : visibleItems.map((i) => i.price).reduce((a, b) => a < b ? a : b);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: const BoxDecoration(color: AppTheme.brandYellowSoft, shape: BoxShape.circle),
                child: Icon(categoryIcon(category.id), color: AppTheme.brandBlack, size: 25),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text.rich(
                      TextSpan(children: [
                        TextSpan(
                          text: sub.hasCustomQuote ? 'Orçamento no local' : 'Desde ',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                        if (!sub.hasCustomQuote && from != null)
                          TextSpan(
                            text: '€${from.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w800, color: AppTheme.brandBlack),
                          ),
                      ]),
                      style: const TextStyle(fontSize: 13),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      sub.localizedName(locale),
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      sub.localizedDescription(locale),
                      style: TextStyle(color: Colors.grey[600], fontSize: 13, height: 1.35),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              TextButton(
                onPressed: () => _showDetails(context, ref, visibleItems),
                style: TextButton.styleFrom(
                  foregroundColor: AppTheme.brandBlack,
                  padding: const EdgeInsets.symmetric(horizontal: 4),
                ),
                child: Text(
                  l.learnMore,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w700,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
              const Spacer(),
              ElevatedButton(
                onPressed: () => _request(context, ref),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandBlack,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  elevation: 0,
                ),
                child: Text(l.requestService, style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// "Saber mais": o que inclui, o que não inclui e o preço de cada item.
  void _showDetails(BuildContext context, WidgetRef ref, List<ServiceItem> items) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (sheetContext) => _DetailsSheet(
        sub: sub,
        items: items,
        content: content,
        onRequest: () {
          Navigator.of(sheetContext).pop();
          _request(context, ref);
        },
      ),
    );
  }
}

class _DetailsSheet extends StatefulWidget {
  final ServiceSubcategory sub;
  final List<ServiceItem> items;
  final CatalogContent content;
  final VoidCallback onRequest;
  const _DetailsSheet({required this.sub, required this.items, required this.content, required this.onRequest});

  @override
  State<_DetailsSheet> createState() => _DetailsSheetState();
}

class _DetailsSheetState extends State<_DetailsSheet> {
  /// 0 = inclui, 1 = não inclui, 2 = preços.
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    // Sem texto de "inclui" (serviço editado e esvaziado no painel), abre
    // diretamente nos preços em vez de num separador vazio.
    if (widget.content.includes.isEmpty) _tab = widget.content.excludes.isEmpty ? 2 : 1;
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final locale = Localizations.localeOf(context);
    final c = widget.content;
    final tabs = [
      if (c.includes.isNotEmpty) (0, 'Inclui'),
      if (c.excludes.isNotEmpty) (1, 'Não inclui'),
      if (widget.items.isNotEmpty) (2, l.learnMorePrices),
    ];

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.65,
      minChildSize: 0.4,
      maxChildSize: 0.92,
      builder: (_, scroll) => Column(
        children: [
          Expanded(
            child: ListView(
              controller: scroll,
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              children: [
                Text(widget.sub.localizedName(locale),
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Text(
                  widget.sub.localizedDescription(locale),
                  style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.4),
                ),
                const SizedBox(height: 18),
                if (tabs.length > 1)
                  Row(
                    children: [
                      for (final (id, label) in tabs)
                        Padding(
                          padding: const EdgeInsets.only(right: 22),
                          child: InkWell(
                            onTap: () => setState(() => _tab = id),
                            child: Container(
                              padding: const EdgeInsets.only(bottom: 6),
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    color: _tab == id ? AppTheme.brandBlack : Colors.transparent,
                                    width: 2.5,
                                  ),
                                ),
                              ),
                              child: Text(
                                label,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: _tab == id ? AppTheme.brandBlack : Colors.grey[500],
                                ),
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                const SizedBox(height: 12),
                if (_tab == 0)
                  for (final t in c.includes) _Bullet(text: t, included: true)
                else if (_tab == 1)
                  for (final t in c.excludes) _Bullet(text: t, included: false)
                else
                  for (final item in widget.items) _ItemPriceRow(item: item),
                const SizedBox(height: 14),
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
                          widget.sub.hasCustomQuote ? l.learnMoreCustomQuote : l.learnMoreFinalPrice,
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
                  onPressed: widget.onRequest,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.brandBlack,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(25)),
                    elevation: 0,
                  ),
                  child: Text(l.requestService,
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Bullet extends StatelessWidget {
  final String text;
  final bool included;
  const _Bullet({required this.text, required this.included});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            included ? Icons.check_rounded : Icons.close_rounded,
            size: 19,
            color: included ? AppTheme.success : Colors.grey[500],
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: const TextStyle(fontSize: 14, height: 1.35))),
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
              Text('€${item.price.toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              if (item.unit != null)
                Text(l.perUnit(item.unit!), style: TextStyle(fontSize: 11, color: Colors.grey[500])),
            ],
          ),
        ],
      ),
    );
  }
}
