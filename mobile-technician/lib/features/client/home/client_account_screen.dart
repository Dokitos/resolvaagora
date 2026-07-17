import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/i18n/language_selector.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';

class ClientAccountScreen extends ConsumerWidget {
  const ClientAccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).valueOrNull;
    final profile = ref.watch(clientProfileProvider);
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;
    final l = AppLocalizations.of(context);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: ListView(
        padding: EdgeInsets.zero,
        children: [
          // ── Header ──
          Container(
            color: AppTheme.brandRed,
            padding: EdgeInsets.fromLTRB(20, MediaQuery.of(context).padding.top + 24, 20, 24),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white,
                  child: Text(
                    profile.valueOrNull?.initials ?? '?',
                    style: const TextStyle(color: AppTheme.brandRed, fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        profile.valueOrNull?.fullName ?? auth?.name ?? l.accountRoleClient,
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        profile.valueOrNull?.email ?? l.accountClientAccount,
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => context.push('/client/account/edit'),
                  icon: const Icon(Icons.edit_outlined, color: Colors.white),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Aviso suave de confirmação de email (não bloqueia o uso).
          if (profile.valueOrNull?.emailVerified == false)
            const _EmailVerifyBanner(),

          // ── Conta ──
          _SectionTitle(l.accountSectionAccount),
          _MenuGroup(children: [
            _MenuTile(
              icon: Icons.workspace_premium_outlined,
              label: l.accountSubscription,
              onTap: () => context.push('/client/subscription'),
            ),
            _MenuTile(
              icon: Icons.person_outline,
              label: l.accountEditProfile,
              onTap: () => context.push('/client/account/edit'),
            ),
            _MenuTile(
              icon: Icons.location_on_outlined,
              label: l.accountAddresses,
              onTap: () => context.push('/client/account/addresses'),
            ),
            _MenuTile(
              icon: Icons.receipt_long_outlined,
              label: l.accountMyOrders,
              onTap: () => context.go('/client/services'),
            ),
            _MenuTile(
              icon: Icons.notifications_outlined,
              label: l.accountNotifications,
              badge: unread,
              onTap: () => context.push('/client/account/notifications'),
            ),
            _MenuTile(
              icon: Icons.card_giftcard_outlined,
              label: l.accountReferral,
              onTap: () => context.push('/client/referral'),
            ),
          ]),
          const SizedBox(height: 20),

          // ── Apoio ──
          _SectionTitle(l.accountSectionSupport),
          _MenuGroup(children: [
            _MenuTile(
              icon: Icons.language,
              label: l.language,
              onTap: () => showLanguageSelector(context, ref),
            ),
            _MenuTile(
              icon: Icons.help_outline,
              label: l.accountHelp,
              onTap: () => context.push('/client/account/support'),
            ),
            _MenuTile(
              icon: Icons.description_outlined,
              label: l.accountTerms,
              onTap: () => context.push('/client/account/terms'),
            ),
          ]),
          const SizedBox(height: 20),

          // ── Logout ──
          _MenuGroup(children: [
            _MenuTile(
              icon: Icons.logout,
              label: l.accountLogout,
              color: AppTheme.brandRed,
              showChevron: false,
              onTap: () {
                // O redirect do router encaminha ao limpar a sessão.
                ref.read(authProvider.notifier).logout();
              },
            ),
          ]),
          const SizedBox(height: 24),
          Center(
            child: Text('ResolvaAgora · v1.0.0', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _EmailVerifyBanner extends ConsumerStatefulWidget {
  const _EmailVerifyBanner();
  @override
  ConsumerState<_EmailVerifyBanner> createState() => _EmailVerifyBannerState();
}

class _EmailVerifyBannerState extends ConsumerState<_EmailVerifyBanner> {
  bool _sending = false;

  Future<void> _resend() async {
    final l = AppLocalizations.of(context);
    setState(() => _sending = true);
    try {
      await ref.read(clientServiceProvider).resendVerificationEmail();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.emailVerifySent)));
    } catch (_) {
      // silencioso
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.brandYellowSoft,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.brandYellow),
      ),
      child: Row(
        children: [
          const Icon(Icons.mark_email_unread_outlined, color: AppTheme.brandBlack),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l.emailVerifyTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                const SizedBox(height: 2),
                Text(l.emailVerifyDesc, style: TextStyle(color: Colors.grey[800], fontSize: 12, height: 1.3)),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _sending
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.brandBlack))
              : TextButton(
                  onPressed: _resend,
                  style: TextButton.styleFrom(foregroundColor: AppTheme.brandBlack),
                  child: Text(l.emailVerifyResend, style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle(this.title);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
      child: Text(title,
          style: TextStyle(color: Colors.grey[500], fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
    );
  }
}

class _MenuGroup extends StatelessWidget {
  final List<Widget> children;
  const _MenuGroup({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 56),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;
  final int badge;
  final bool showChevron;

  const _MenuTile({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
    this.badge = 0,
    this.showChevron = true,
  });

  @override
  Widget build(BuildContext context) {
    final c = color ?? Colors.black87;
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: color ?? Colors.grey[700]),
      title: Text(label, style: TextStyle(color: c, fontWeight: FontWeight.w500)),
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (badge > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: const BoxDecoration(color: AppTheme.brandRed, borderRadius: BorderRadius.all(Radius.circular(20))),
              child: Text('$badge', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
            ),
          if (showChevron) ...[
            const SizedBox(width: 6),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ],
      ),
    );
  }
}
