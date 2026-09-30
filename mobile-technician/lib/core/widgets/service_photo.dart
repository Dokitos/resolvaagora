import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Ícone Material de cada categoria, para os cartões sem fotografia e para as
/// grelhas. Os emojis do catálogo ficam para os sítios onde já eram usados.
IconData categoryIcon(String categoryId) {
  switch (categoryId) {
    case 'ELECTRICITY':
      return Icons.electrical_services_rounded;
    case 'PLUMBING':
      return Icons.plumbing_rounded;
    case 'PAINTING':
      return Icons.format_paint_rounded;
    case 'FURNITURE':
      return Icons.chair_rounded;
    case 'AC':
      return Icons.ac_unit_rounded;
    case 'APPLIANCES':
      return Icons.local_laundry_service_rounded;
    case 'CLEANING':
      return Icons.cleaning_services_rounded;
    case 'LOCKSMITH':
      return Icons.key_rounded;
    case 'GARDEN':
      return Icons.yard_rounded;
    case 'FLOORING':
      return Icons.grid_view_rounded;
    case 'TV_ANTENNA':
      return Icons.tv_rounded;
    default:
      return Icons.handyman_rounded;
  }
}

/// Fotografia de uma categoria, com o fundo da marca e o ícone enquanto não
/// houver fotografia carregada no painel — ou se ela falhar a carregar.
///
/// O fundo não é um "espaço vazio à espera": foi desenhado para aguentar a
/// app sozinho, porque as fotografias podem demorar a chegar.
class ServicePhoto extends StatelessWidget {
  final String categoryId;
  final String? imageUrl;
  final double iconSize;

  const ServicePhoto({
    super.key,
    required this.categoryId,
    this.imageUrl,
    this.iconSize = 56,
  });

  @override
  Widget build(BuildContext context) {
    final fallback = _BrandFallback(categoryId: categoryId, iconSize: iconSize);
    final url = imageUrl;
    if (url == null || url.isEmpty) return fallback;

    return CachedNetworkImage(
      imageUrl: url,
      fit: BoxFit.cover,
      fadeInDuration: const Duration(milliseconds: 200),
      placeholder: (_, __) => fallback,
      errorWidget: (_, __, ___) => fallback,
    );
  }
}

class _BrandFallback extends StatelessWidget {
  final String categoryId;
  final double iconSize;
  const _BrandFallback({required this.categoryId, required this.iconSize});

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1C1C1C), Color(0xFF2E2E2E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // Faixa diagonal amarela: dá ritmo ao cartão sem competir com o ícone.
          Positioned(
            right: -40,
            top: -30,
            child: Transform.rotate(
              angle: -0.5,
              child: Container(
                width: 160,
                height: 60,
                color: AppTheme.brandYellow.withValues(alpha: 0.18),
              ),
            ),
          ),
          Center(
            child: Icon(categoryIcon(categoryId), size: iconSize, color: AppTheme.brandYellow),
          ),
        ],
      ),
    );
  }
}
