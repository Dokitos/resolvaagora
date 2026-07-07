import 'package:flutter/material.dart';

class AppTheme {
  // ResolvaAgora brand colours (shared across the client area).
  static const Color brandRed = Color(0xFFCC0000);
  static const Color brandRedDark = Color(0xFF8B0000);
  static const Color brandRedLight = Color(0xFFFFEBEB);
  static const Color brandBlue = Color(0xFF1A56DB);

  static const Color primary = Color(0xFF2563EB);
  static const Color primaryLight = Color(0xFFEFF6FF);
  static const Color success = Color(0xFF16A34A);
  static const Color warning = Color(0xFFD97706);
  static const Color danger = Color(0xFFDC2626);
  static const Color surface = Color(0xFFF9FAFB);
  static const Color border = Color(0xFFE5E7EB);

  /// Gradiente vermelho da marca (topo → hero da home, cabeçalhos de destaque).
  static const LinearGradient brandGradient = LinearGradient(
    colors: [brandRed, brandRedDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  /// Cor de acento por categoria de ofício — usada nos ícones e realces.
  /// Devolve um par (tinta forte, fundo suave) para cada `category.id`.
  static (Color, Color) categoryColors(String id) {
    switch (id) {
      case 'ELECTRICITY':
        return (const Color(0xFFF59E0B), const Color(0xFFFFF7E6)); // âmbar
      case 'PLUMBING':
        return (const Color(0xFF2563EB), const Color(0xFFEAF1FF)); // azul
      case 'AC':
        return (const Color(0xFF06B6D4), const Color(0xFFE6FAFD)); // ciano
      case 'PAINTING':
        return (const Color(0xFFEC4899), const Color(0xFFFDECF5)); // rosa
      case 'FURNITURE':
        return (const Color(0xFF9333EA), const Color(0xFFF5EBFE)); // roxo
      case 'APPLIANCES':
        return (const Color(0xFF0EA5E9), const Color(0xFFE7F5FE)); // azul-céu
      case 'CLEANING':
        return (const Color(0xFF10B981), const Color(0xFFE7F8F1)); // verde
      case 'LOCKSMITH':
        return (const Color(0xFF64748B), const Color(0xFFEEF1F5)); // ardósia
      case 'GARDEN':
        return (const Color(0xFF65A30D), const Color(0xFFF1F8E4)); // verde-lima
      case 'FLOORING':
        return (const Color(0xFFB45309), const Color(0xFFFBF0E4)); // castanho
      case 'TV_ANTENNA':
        return (const Color(0xFF7C3AED), const Color(0xFFF1EBFD)); // violeta
      default:
        return (brandBlue, const Color(0xFFEEF2FF));
    }
  }

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: primary,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: surface,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF111827),
          elevation: 0,
          scrolledUnderElevation: 1,
          titleTextStyle: TextStyle(
            color: Color(0xFF111827),
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
        ),
        cardTheme: CardTheme(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: border),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: primary,
            side: const BorderSide(color: primary),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: primary, width: 2),
          ),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      );
}
