import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/input_formatters.dart';
import '../../../core/widgets/service_photo.dart';
import '../../../data/catalog_i18n.dart';
import '../../../data/services_data.dart';

/// Retira acentos e passa a minúsculas: "Máquina" e "maquina" têm de dar o
/// mesmo resultado, porque é assim que as pessoas escrevem no telemóvel.
String _fold(String s) {
  const from = 'áàâãäéèêëíìîïóòôõöúùûüçñ';
  const to = 'aaaaaeeeeiiiiooooouuuucn';
  final lower = s.toLowerCase();
  final b = StringBuffer();
  for (final ch in lower.split('')) {
    final i = from.indexOf(ch);
    b.write(i >= 0 ? to[i] : ch);
  }
  return b.toString();
}

class _Hit {
  final ServiceCategory category;
  final ServiceSubcategory sub;

  /// Itens do serviço que correspondem à pesquisa, para mostrar porque é que
  /// o resultado apareceu ("Máquina de lavar roupa" dentro de Reparação).
  final List<ServiceItem> matchedItems;
  final int score;
  const _Hit(this.category, this.sub, this.matchedItems, this.score);
}

/// Pesquisa no catálogo: categorias, serviços e itens.
///
/// Corre localmente sobre o catálogo que a app já tem — sem pedidos ao
/// servidor, por isso responde a cada letra e funciona sem rede.
class SearchPage extends ConsumerStatefulWidget {
  final String initialQuery;
  const SearchPage({super.key, this.initialQuery = ''});

  @override
  ConsumerState<SearchPage> createState() => _SearchPageState();
}

class _SearchPageState extends ConsumerState<SearchPage> {
  late final _ctrl = TextEditingController(text: widget.initialQuery);

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  List<_Hit> _search(String raw, Locale locale) {
    final terms = _fold(raw).split(RegExp(r'\s+')).where((t) => t.length >= 2).toList();
    if (terms.isEmpty) return const [];

    final hits = <_Hit>[];
    for (final cat in kServiceCategories.where((c) => !c.hidden)) {
      final catText = _fold('${cat.name} ${cat.localizedName(locale)} ${cat.description}');
      for (final sub in cat.subcategories) {
        final subText = _fold('${sub.name} ${sub.localizedName(locale)} ${sub.description}');
        final items = sub.items.where((i) => !i.hidden).toList();

        var score = 0;
        final matched = <ServiceItem>[];
        for (final t in terms) {
          var found = false;
          if (subText.contains(t)) {
            score += 3;
            found = true;
          }
          for (final item in items) {
            if (_fold('${item.name} ${item.localizedName(locale)}').contains(t)) {
              if (!matched.contains(item)) matched.add(item);
              score += 2;
              found = true;
            }
          }
          if (catText.contains(t)) {
            score += 1;
            found = true;
          }
          // Todas as palavras têm de aparecer algures: "fuga cozinha" não deve
          // devolver tudo o que tenha só "cozinha".
          if (!found) {
            score = 0;
            break;
          }
        }
        if (score > 0) hits.add(_Hit(cat, sub, matched, score));
      }
    }
    hits.sort((a, b) => b.score.compareTo(a.score));
    return hits;
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(catalogPricesLoadedProvider); // preços e serviços ocultos do admin
    final locale = Localizations.localeOf(context);
    final query = _ctrl.text.trim();
    final hits = _search(query, locale);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: AppTheme.brandBlack,
        foregroundColor: Colors.white,
        titleSpacing: 0,
        title: TextField(
          controller: _ctrl,
          autofocus: widget.initialQuery.isEmpty,
          textInputAction: TextInputAction.search,
          inputFormatters: cleanTextFormatters(80),
          onChanged: (_) => setState(() {}),
          style: const TextStyle(color: Colors.white, fontSize: 16),
          cursorColor: AppTheme.brandYellow,
          decoration: InputDecoration(
            hintText: 'Do que precisas?',
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
            border: InputBorder.none,
            suffixIcon: query.isEmpty
                ? null
                : IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70),
                    onPressed: () => setState(_ctrl.clear),
                  ),
          ),
        ),
      ),
      body: query.length < 2
          ? _Hint(
              onPick: (e) => setState(() {
                _ctrl.text = e;
                _ctrl.selection = TextSelection.collapsed(offset: e.length);
              }),
            )
          : hits.isEmpty
              ? _NoResults(query: query)
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: hits.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (context, i) => _HitCard(hit: hits[i]),
                ),
    );
  }
}

class _HitCard extends StatelessWidget {
  final _Hit hit;
  const _HitCard({required this.hit});

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final items = hit.sub.items.where((i) => !i.hidden).toList();
    final from = items.isEmpty ? null : items.map((i) => i.price).reduce((a, b) => a < b ? a : b);

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => context.push('/booking/category/${hit.category.id}'),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppTheme.brandYellowSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(categoryIcon(hit.category.id), color: AppTheme.brandBlack, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      hit.category.localizedName(locale).toUpperCase(),
                      style: TextStyle(fontSize: 10.5, letterSpacing: 0.6, color: Colors.grey[500]),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      hit.sub.localizedName(locale),
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
                    ),
                    if (hit.matchedItems.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        hit.matchedItems.take(3).map((i) => i.localizedName(locale)).join(' · '),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12.5, color: Colors.grey[700]),
                      ),
                    ],
                  ],
                ),
              ),
              if (from != null) ...[
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('desde', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                    Text('€${from.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Hint extends StatelessWidget {
  final ValueChanged<String> onPick;
  const _Hint({required this.onPick});

  @override
  Widget build(BuildContext context) {
    const examples = ['Máquina de lavar', 'Fuga de água', 'Tomada', 'Montar roupeiro', 'Ar condicionado'];
    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Text('Experimenta procurar', style: TextStyle(fontSize: 13, color: Colors.grey[600])),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final e in examples)
              ActionChip(
                label: Text(e),
                backgroundColor: Colors.white,
                side: BorderSide(color: Colors.grey.shade300),
                onPressed: () => onPick(e),
              ),
          ],
        ),
      ],
    );
  }
}

class _NoResults extends StatelessWidget {
  final String query;
  const _NoResults({required this.query});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off_rounded, size: 52, color: Colors.grey[300]),
          const SizedBox(height: 14),
          Text(
            'Não encontrámos "$query"',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 6),
          Text(
            'Experimenta outra palavra, ou vê todas as categorias no início.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }
}
