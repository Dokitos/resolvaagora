import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import '../../core/i18n/language_selector.dart';
import '../../core/i18n/locale_provider.dart';
import '../../core/services/auth_service.dart';
import '../../core/theme/app_theme.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String? _name;

  @override
  void initState() {
    super.initState();
    _loadName();
  }

  Future<void> _loadName() async {
    const storage = FlutterSecureStorage();
    final name = await storage.read(key: 'user_name');
    if (mounted) setState(() => _name = name);
  }

  Future<void> _logout() async {
    final confirm = await showDialog<bool>(
      context: context,
      // IMPORTANTE: usar o context do PRÓPRIO diálogo (dialogContext) para o
      // pop. Com o context do ecrã, o go_router intercepta o pop e esvazia a
      // lista de rotas (currentConfiguration vazio) → ecrã preto no logout.
      builder: (dialogContext) {
        final l = AppLocalizations.of(dialogContext);
        return AlertDialog(
          title: Text(l.accountLogout),
          content: Text(l.logoutConfirm),
          actions: [
            TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: Text(l.cancel)),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.danger),
              onPressed: () => Navigator.pop(dialogContext, true),
              child: Text(l.signOut),
            ),
          ],
        );
      },
    );
    if (confirm == true) {
      // Ao limpar a sessão, o redirect do router encaminha para /login.
      await ref.read(authProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final currentLang = (ref.watch(localeProvider)?.languageCode ??
                Localizations.localeOf(context).languageCode) ==
            'en'
        ? l.languageEnglish
        : l.languagePortuguese;
    return Scaffold(
      appBar: AppBar(title: Text(l.profileTitle)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppTheme.primaryLight,
                    child: const Icon(Icons.person, size: 32, color: AppTheme.primary),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _name ?? l.roleTechnician,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryLight,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(l.roleTechnician, style: const TextStyle(color: AppTheme.primary, fontSize: 12, fontWeight: FontWeight.w500)),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.edit_outlined, color: AppTheme.brandBlack),
                    tooltip: l.accountEditProfile,
                    onPressed: () => context.push('/profile/edit'),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.notifications_outlined, color: AppTheme.primary),
                  title: Text(l.pushNotifications),
                  subtitle: Text(l.pushNotificationsSub),
                  trailing: Switch.adaptive(value: true, onChanged: (_) {}),
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.language_outlined, color: AppTheme.primary),
                  title: Text(l.language),
                  onTap: () => showLanguageSelector(context, ref),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(currentLang, style: TextStyle(color: Colors.grey[500])),
                      const Icon(Icons.chevron_right, color: Colors.grey),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.help_outline, color: Colors.grey),
                  title: Text(l.accountHelp),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () {},
                ),
                const Divider(height: 1, indent: 56),
                ListTile(
                  leading: const Icon(Icons.info_outline, color: Colors.grey),
                  title: Text(l.appVersion),
                  trailing: Text('1.0.0', style: TextStyle(color: Colors.grey[500])),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: 50,
            child: OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.danger,
                side: const BorderSide(color: AppTheme.danger),
              ),
              onPressed: _logout,
              icon: const Icon(Icons.logout),
              label: Text(l.accountLogout),
            ),
          ),
        ],
      ),
    );
  }
}
