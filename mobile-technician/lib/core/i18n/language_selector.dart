import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_theme.dart';
import 'locale_provider.dart';

/// Abre um seletor de idioma (PT/EN) em bottom sheet e persiste a escolha.
Future<void> showLanguageSelector(BuildContext context, WidgetRef ref) {
  final l = AppLocalizations.of(context);
  final current = ref.read(localeProvider)?.languageCode ??
      Localizations.localeOf(context).languageCode;

  return showModalBottomSheet(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 16),
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 16),
          Text(l.chooseLanguage, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          _LangTile(
            flag: '🇵🇹', label: l.languagePortuguese, code: 'pt',
            selected: current == 'pt',
            onTap: () { ref.read(localeProvider.notifier).setLocale(const Locale('pt')); Navigator.pop(ctx); },
          ),
          _LangTile(
            flag: '🇬🇧', label: l.languageEnglish, code: 'en',
            selected: current == 'en',
            onTap: () { ref.read(localeProvider.notifier).setLocale(const Locale('en')); Navigator.pop(ctx); },
          ),
          const SizedBox(height: 12),
        ],
      ),
    ),
  );
}

class _LangTile extends StatelessWidget {
  final String flag;
  final String label;
  final String code;
  final bool selected;
  final VoidCallback onTap;
  const _LangTile({
    required this.flag,
    required this.label,
    required this.code,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Text(flag, style: const TextStyle(fontSize: 24)),
      title: Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
      trailing: selected
          ? const Icon(Icons.check_circle, color: AppTheme.brandYellow)
          : const Icon(Icons.circle_outlined, color: Colors.grey),
      onTap: onTap,
    );
  }
}
