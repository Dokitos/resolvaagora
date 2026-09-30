import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

/// Conteúdo de apresentação de uma categoria ou serviço, editável no painel
/// de admin (`GET /service-content`): fotografia, selo e "Inclui / Não inclui".
class CatalogContent {
  final String? imageUrl;
  final String? badge;
  final List<String> includes;
  final List<String> excludes;

  const CatalogContent({
    this.imageUrl,
    this.badge,
    this.includes = const [],
    this.excludes = const [],
  });

  static const empty = CatalogContent();

  factory CatalogContent.fromJson(Map<String, dynamic> j) => CatalogContent(
        imageUrl: j['imageUrl'] as String?,
        badge: j['badge'] as String?,
        includes: (j['includes'] as List? ?? const []).cast<String>(),
        excludes: (j['excludes'] as List? ?? const []).cast<String>(),
      );
}

/// Mapa completo, chaveado por `CAT` (categoria) e `CAT:sub` (serviço).
///
/// Falha em silêncio para um mapa vazio: é conteúdo de apresentação, e sem ele
/// a app mostra os cartões com o fundo da marca e sem separadores — nunca
/// deve impedir alguém de pedir um serviço.
final catalogContentProvider = FutureProvider<Map<String, CatalogContent>>((ref) async {
  try {
    final r = await ref.read(dioProvider).get('/service-content');
    final data = r.data as Map<String, dynamic>;
    return data.map((k, v) => MapEntry(k, CatalogContent.fromJson(v as Map<String, dynamic>)));
  } catch (_) {
    return const {};
  }
});

extension CatalogContentLookup on Map<String, CatalogContent> {
  CatalogContent category(String categoryId) => this[categoryId] ?? CatalogContent.empty;

  CatalogContent service(String categoryId, String subcategoryId) =>
      this['$categoryId:$subcategoryId'] ?? CatalogContent.empty;
}
