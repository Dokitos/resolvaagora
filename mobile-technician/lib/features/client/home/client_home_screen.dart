import 'package:flutter/material.dart';
import '../../../core/widgets/onboarding_overlay.dart';
import 'package:moura_technician/l10n/generated/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/i18n/language_selector.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/client_service.dart';
import '../../../core/services/settings_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/services/catalog_content_service.dart';
import '../../../core/models/service_request.dart' show ServiceStatus;
import '../../../core/utils/formatters.dart';
import '../services/service_status_ui.dart';
import '../../../core/widgets/service_photo.dart';
import '../../../core/widgets/pressable.dart';
import '../../../data/services_data.dart';
import '../../../data/catalog_i18n.dart';

const _red = Color(0xFF161616);
const _blue = Color(0xFF161616); // acento em fundo claro → preto (legível)
const _yellow =
    Color(0xFFF5B301); // amarelo de marca (preenchimentos/destaques)

class ClientHomeScreen extends StatelessWidget {
  const ClientHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      body: CustomScrollView(
        slivers: [
          const SliverToBoxAdapter(
              child: OnboardingTrigger(role: OnboardingRole.client)),
          _buildAppBar(context),
          SliverToBoxAdapter(child: Consumer(builder: (context, ref, _) {
            final settings = ref.watch(appSettingsProvider).valueOrNull;
            if (settings == null || !settings.maintenanceMode)
              return const SizedBox.shrink();
            return Container(
              width: double.infinity,
              color: const Color(0xFFFFF3CD),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  const Icon(Icons.build_circle_outlined,
                      color: Color(0xFFB45309), size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      settings.maintenanceMessage?.isNotEmpty == true
                          ? settings.maintenanceMessage!
                          : 'Estamos em manutenção. Novos pedidos podem estar temporariamente indisponíveis.',
                      style: const TextStyle(
                          color: Color(0xFF92400E), fontSize: 13, height: 1.3),
                    ),
                  ),
                ],
              ),
            );
          })),
          SliverToBoxAdapter(child: _HeroSection()),
          const SliverToBoxAdapter(child: _ActiveService()),
          SliverToBoxAdapter(child: _CategoryGrid()),
          SliverToBoxAdapter(child: _FeaturedServices()),
          SliverToBoxAdapter(child: _BannersCarousel()),
          SliverToBoxAdapter(child: _StatsChips()),
          SliverToBoxAdapter(child: _SubscriptionBanner()),
          SliverToBoxAdapter(child: _HowItWorks()),
          SliverToBoxAdapter(child: _WhyChooseUs()),
          SliverToBoxAdapter(child: _JoinProviderBanner()),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }

  SliverAppBar _buildAppBar(BuildContext context) {
    return SliverAppBar(
      pinned: true,
      backgroundColor: AppTheme.surface,
      surfaceTintColor: AppTheme.surface,
      foregroundColor: AppTheme.ink,
      scrolledUnderElevation: 0,
      title: Row(
        children: [
          const Text.rich(
              TextSpan(children: [
                TextSpan(
                    text: 'Resolva', style: TextStyle(color: AppTheme.ink)),
                TextSpan(
                    text: 'Agora',
                    style: TextStyle(color: AppTheme.brandYellowDark)),
              ]),
              style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.8)),
          const Spacer(),
          Consumer(
            builder: (context, ref, _) => IconButton(
              icon: const Icon(Icons.language, color: AppTheme.ink),
              tooltip: 'Idioma / Language',
              onPressed: () => showLanguageSelector(context, ref),
            ),
          ),
          Consumer(
            builder: (context, ref, _) {
              final isAuth =
                  ref.watch(authProvider).valueOrNull?.isAuthenticated ?? false;
              if (isAuth) {
                return IconButton(
                  icon: const Icon(Icons.person_outline, color: AppTheme.ink),
                  onPressed: () => context.go('/client/account'),
                );
              }
              return TextButton(
                onPressed: () => context.push('/login'),
                style: TextButton.styleFrom(
                  foregroundColor: _red,
                  backgroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20)),
                ),
                child: Text(AppLocalizations.of(context).signInShort,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 13)),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      automaticallyImplyLeading: false,
    );
  }
}

// ── Hero ──────────────────────────────────────────────────────────────────────
class _HeroSection extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    final auth = ref.watch(authProvider).valueOrNull;
    final firstName =
        (auth?.isAuthenticated == true && (auth?.name?.isNotEmpty ?? false))
            ? auth!.name!.split(' ').first
            : null;
    final greeting =
        firstName != null ? l.homeGreetingNamed(firstName) : l.homeGreeting;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(greeting,
              style: const TextStyle(color: AppTheme.muted, fontSize: 15)),
          const SizedBox(height: 8),
          Text(l.premiumHomeTitle,
              style: Theme.of(context).textTheme.headlineLarge),
          const SizedBox(height: 10),
          Text(l.premiumHomeSubtitle,
              style: const TextStyle(
                  color: AppTheme.muted, fontSize: 14, height: 1.5)),
          const SizedBox(height: 24),
          TextField(
            decoration: InputDecoration(
              hintText: l.homeSearchHint,
              prefixIcon: const Icon(Icons.search, color: AppTheme.ink),
              suffixIcon: const Icon(Icons.arrow_forward,
                  size: 20, color: AppTheme.muted),
            ),
            textInputAction: TextInputAction.search,
            onSubmitted: (q) {
              if (q.trim().isEmpty) return;
              context.push(
                  '/booking/search?q=${Uri.encodeQueryComponent(q.trim())}');
            },
          ),
        ],
      ),
    );
  }
}

/// Auth is checked before watching the protected endpoint, so visitors never
/// trigger a 401 just by browsing the public home page.
class _ActiveService extends ConsumerWidget {
  const _ActiveService();
  static const _closed = {
    ServiceStatus.COMPLETED,
    ServiceStatus.CANCELLED,
    ServiceStatus.QUOTE_REJECTED,
    ServiceStatus.EXPIRED,
    ServiceStatus.DRAFT,
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).valueOrNull;
    if (auth?.isClient != true || auth?.isAuthenticated != true)
      return const SizedBox.shrink();
    final l = AppLocalizations.of(context);
    final requests = ref.watch(clientServiceRequestsProvider);
    return requests.when(
      loading: () => Padding(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
        child: Semantics(
            label: l.premiumLoadingRequest,
            child: const LinearProgressIndicator(minHeight: 2)),
      ),
      error: (_, __) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
        child: Card(
            child: ListTile(
          leading: const Icon(Icons.info_outline),
          title: Text(l.premiumRequestError),
          trailing: IconButton(
              tooltip: l.retry,
              icon: const Icon(Icons.refresh),
              onPressed: () => ref.invalidate(clientServiceRequestsProvider)),
        )),
      ),
      data: (data) {
        final jobs = data.where((r) => !_closed.contains(r.status)).toList()
          ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
        if (jobs.isEmpty) return const SizedBox.shrink();
        final job = jobs.first;
        final ui = ServiceStatusUi.of(job.status);
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 16,
                children: [
                  Text(l.premiumActiveService,
                      style: Theme.of(context).textTheme.titleMedium),
                  TextButton(
                      onPressed: () => context.go('/client/services'),
                      child: Text(l.premiumAllRequests)),
                ]),
            Card(
                margin: EdgeInsets.zero,
                child: Padding(
                  padding: const EdgeInsets.all(18),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                  color: AppTheme.brandYellowSoft,
                                  borderRadius: BorderRadius.circular(12)),
                              child: Icon(
                                  categoryIcon(job.specialty.name == 'HVAC'
                                      ? 'AC'
                                      : job.specialty.name),
                                  color: AppTheme.brandYellowDark)),
                          const SizedBox(width: 12),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text(
                                    job.address?.city ?? l.premiumActiveService,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600,
                                        fontSize: 16)),
                                if (job.scheduledDate != null)
                                  Text(
                                      '${formatDateShort(job.scheduledDate!)} · ${formatTime(job.scheduledDate!)}',
                                      style: const TextStyle(
                                          color: AppTheme.muted, fontSize: 13)),
                                if (job.technicianName != null)
                                  Text(job.technicianName!,
                                      style: const TextStyle(
                                          color: AppTheme.muted, fontSize: 13)),
                              ])),
                        ]),
                        const SizedBox(height: 16),
                        Row(children: [
                          Icon(ui.icon, size: 16, color: ui.color),
                          const SizedBox(width: 8),
                          Expanded(
                              child: Text(ui.label,
                                  style: TextStyle(
                                      color: ui.color,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600)))
                        ]),
                        const SizedBox(height: 16),
                        SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: () =>
                                  context.push('/client/services/${job.id}'),
                              icon: const Icon(Icons.arrow_forward, size: 18),
                              label: Text(l.premiumTrackRequest),
                            )),
                      ]),
                )),
          ]),
        );
      },
    );
  }
}

// ── Home banners carousel (configuráveis no admin) ──────────────────────────
class _BannersCarousel extends ConsumerStatefulWidget {
  @override
  ConsumerState<_BannersCarousel> createState() => _BannersCarouselState();
}

class _BannersCarouselState extends ConsumerState<_BannersCarousel> {
  final _controller = PageController();
  int _current = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTap(BuildContext context, HomeBanner b) {
    switch (b.actionType) {
      case 'category':
        if (b.actionTarget != null && b.actionTarget!.isNotEmpty) {
          context.push('/booking/category/${b.actionTarget}');
        }
        break;
      case 'subscription':
        context.push('/client/subscription');
        break;
      case 'url':
        final t = b.actionTarget;
        if (t != null && t.isNotEmpty) {
          launchUrl(Uri.parse(t), mode: LaunchMode.externalApplication);
        }
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final banners =
        ref.watch(homeBannersProvider).valueOrNull ?? const <HomeBanner>[];
    if (banners.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: Column(
        children: [
          SizedBox(
            height: 160,
            child: PageView.builder(
              controller: _controller,
              itemCount: banners.length,
              onPageChanged: (i) => setState(() => _current = i),
              itemBuilder: (_, i) {
                final b = banners[i];
                return GestureDetector(
                  onTap: () => _onTap(context, b),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        Image.network(b.imageUrl,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) =>
                                Container(color: Colors.grey[200])),
                        if (b.title != null || b.subtitle != null)
                          Positioned(
                            left: 0,
                            right: 0,
                            bottom: 0,
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  begin: Alignment.topCenter,
                                  end: Alignment.bottomCenter,
                                  colors: [
                                    Colors.transparent,
                                    Colors.black.withOpacity(0.65)
                                  ],
                                ),
                              ),
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (b.title != null)
                                    Text(b.title!,
                                        style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 16)),
                                  if (b.subtitle != null)
                                    Text(b.subtitle!,
                                        style: const TextStyle(
                                            color: Colors.white70,
                                            fontSize: 12)),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          if (banners.length > 1)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  for (int i = 0; i < banners.length; i++)
                    Container(
                      width: 8,
                      height: 8,
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i == _current ? _yellow : Colors.grey[300],
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

// ── Subscription banner ─────────────────────────────────────────────────────
class _SubscriptionBanner extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = AppLocalizations.of(context);
    // Nome/descrição do plano vêm do admin (1.º plano ativo); fallback à tradução.
    final plans = ref.watch(subscriptionPlansProvider).valueOrNull;
    final plan = (plans != null && plans.isNotEmpty) ? plans.first : null;
    final title = plan?.name ?? l.premiumBannerTitle;
    final desc = plan?.description ?? l.premiumBannerDesc;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
      child: GestureDetector(
        onTap: () => context.push('/client/subscription'),
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [_yellow, Color(0xFFFFCE3A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            boxShadow: [
              BoxShadow(
                  color: _yellow.withOpacity(0.30),
                  blurRadius: 12,
                  offset: const Offset(0, 4))
            ],
          ),
          child: Row(
            children: [
              const Icon(Icons.workspace_premium,
                  color: Colors.black87, size: 36),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            color: Colors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 17),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 3),
                    Text(desc,
                        style: const TextStyle(
                            color: Colors.black87, fontSize: 13, height: 1.3),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                    color: Colors.black,
                    borderRadius: BorderRadius.circular(20)),
                child: Text(l.seeAction,
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Faixa de confiança ────────────────────────────────────────────────────────
class _StatsChips extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final items = [
      (Icons.info_outline, l.premiumClearScope),
      (Icons.calendar_today_outlined, l.premiumEasyBooking),
      (Icons.bolt_outlined, l.statOnline),
    ];
    return SizedBox(
      height: 76,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (_, i) =>
            _TrustCard(icon: items[i].$1, label: items[i].$2),
      ),
    );
  }
}

class _TrustCard extends StatelessWidget {
  final IconData icon;
  final String label;
  const _TrustCard({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(10, 8, 14, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppTheme.brandYellowSoft,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 19, color: AppTheme.brandBlack),
          ),
          const SizedBox(width: 10),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 120),
            child: Text(
              label,
              maxLines: 2,
              style: const TextStyle(
                  fontSize: 12.5, fontWeight: FontWeight.w600, height: 1.2),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Destaques com fotografia ─────────────────────────────────────────────────
class _FeaturedServices extends ConsumerWidget {
  // `id` tem de corresponder a ServiceCategory.id em services_data.dart — a
  // categoria real dá o nome, a descrição e o preço, sempre sincronizados.
  static const _featuredIds = [
    'APPLIANCES',
    'PLUMBING',
    'AC',
    'ELECTRICITY',
    'FURNITURE',
    'CLEANING'
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(
        catalogPricesLoadedProvider); // rebuild quando os preços do admin chegarem
    final content = ref.watch(catalogContentProvider).valueOrNull ?? const {};
    final l = AppLocalizations.of(context);
    final featured = [
      for (final id in _featuredIds)
        ...kServiceCategories.where((c) => c.id == id && !c.hidden),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
          child: Text(l.exploreServices,
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        SizedBox(
          height: 262,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: featured.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, i) => _PhotoServiceCard(
              category: featured[i],
              content: content.category(featured[i].id),
            ),
          ),
        ),
      ],
    );
  }
}

/// Cartão de serviço com fotografia, selo e preço — o formato principal do
/// novo visual.
class _PhotoServiceCard extends StatelessWidget {
  final ServiceCategory category;
  final CatalogContent content;
  const _PhotoServiceCard({required this.category, required this.content});

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context);
    final badge = content.badge;

    return Pressable(
      onTap: () => context.push('/booking/category/${category.id}'),
      child: Container(
        width: 250,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withValues(alpha: 0.07),
                blurRadius: 14,
                offset: const Offset(0, 4)),
          ],
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 140,
              width: double.infinity,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ServicePhoto(
                      categoryId: category.id, imageUrl: content.imageUrl),
                  if (badge != null && badge.isNotEmpty)
                    Positioned(
                      left: 10,
                      top: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.brandYellow,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          badge,
                          style: const TextStyle(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.black),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 12, 14, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      category.localizedName(locale),
                      maxLines: 2,
                      style: const TextStyle(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w700,
                          height: 1.2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  _PricePill(price: category.basePrice),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 6, 14, 12),
              child: Text(
                category.localizedDescription(locale),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                    fontSize: 12.5, color: Colors.grey[600], height: 1.3),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PricePill extends StatelessWidget {
  final double price;
  const _PricePill({required this.price});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(
          color: AppTheme.brandBlack, borderRadius: BorderRadius.circular(20)),
      child: Text.rich(
        TextSpan(
          children: [
            const TextSpan(
                text: 'desde ', style: TextStyle(fontWeight: FontWeight.w400)),
            TextSpan(
              text: '€${price.toStringAsFixed(2)}',
              style: const TextStyle(
                  fontWeight: FontWeight.w800, color: AppTheme.brandYellow),
            ),
          ],
        ),
        style: const TextStyle(color: Colors.white, fontSize: 11.5),
      ),
    );
  }
}

// ── Grelha de categorias ──────────────────────────────────────────────────────
class _CategoryGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final visible = kServiceCategories.where((c) => !c.hidden).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 28, 20, 4),
          child: Text(l.servicesByCategory,
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
          child: Text(l.servicesByCategorySub,
              style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        ),
        const SizedBox(height: 14),
        GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            childAspectRatio: 0.95,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
          ),
          itemCount: visible.length,
          itemBuilder: (context, i) => _CategoryCard(category: visible[i]),
        ),
      ],
    );
  }
}

class _CategoryCard extends StatelessWidget {
  final ServiceCategory category;
  const _CategoryCard({required this.category});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: () => context.push('/booking/category/${category.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppTheme.border),
        ),
        padding: const EdgeInsets.fromLTRB(12, 14, 12, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppTheme.brandYellowSoft,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(categoryIcon(category.id),
                  color: AppTheme.brandBlack, size: 23),
            ),
            const Spacer(),
            Text(
              category.localizedName(Localizations.localeOf(context)),
              maxLines: 2,
              style: const TextStyle(
                  fontWeight: FontWeight.w700, fontSize: 13, height: 1.2),
            ),
          ],
        ),
      ),
    );
  }
}

// ── How it works ──────────────────────────────────────────────────────────────
class _HowItWorks extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final steps = [
      (Icons.search, l.step1Title, l.step1Desc),
      (Icons.calendar_today, l.step2Title, l.step2Desc),
      (Icons.access_time, l.step3Title, l.step3Desc),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Text(l.howItWorks,
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          ...steps.map((s) => Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(s.$1, color: _blue, size: 26),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(s.$2,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 15)),
                          const SizedBox(height: 2),
                          Text(s.$3,
                              style: TextStyle(
                                  color: Colors.grey[600], fontSize: 13)),
                        ],
                      ),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

// ── Why choose us ─────────────────────────────────────────────────────────────
class _WhyChooseUs extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    final points = [
      (Icons.public, l.whyNationalCoverage),
      (Icons.shield_outlined, l.whyWarranty),
      (Icons.bolt, l.whyOnline),
      (Icons.people_outline, l.whySpecialists),
      (Icons.home_repair_service_outlined, l.whyManyServices),
      (Icons.euro_symbol, l.whyFairPrice),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l.whyChooseUs,
              style:
                  const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(
            l.whyChooseUsSub,
            style:
                TextStyle(color: Colors.grey[600], fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 20),
          ...points.map((p) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEF2FF),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(p.$1, color: _blue, size: 22),
                    ),
                    const SizedBox(width: 14),
                    Text(p.$2,
                        style: const TextStyle(
                            fontSize: 14, fontWeight: FontWeight.w500)),
                  ],
                ),
              )),
        ],
      ),
    );
  }
}

// ── Join provider banner ──────────────────────────────────────────────────────
class _JoinProviderBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      decoration: BoxDecoration(
        gradient: AppTheme.brandGradient,
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.handyman, color: AppTheme.brandYellow, size: 40),
          const SizedBox(height: 16),
          Text(
            AppLocalizations.of(context).joinProviderTitle,
            style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
                height: 1.3),
          ),
          const SizedBox(height: 8),
          Text(
            AppLocalizations.of(context).joinProviderDesc,
            style: const TextStyle(
                color: Colors.white70, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => _applyAsProvider(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandYellow,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(30)),
              ),
              child: Text(AppLocalizations.of(context).joinProviderButton,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Endereço para onde vão as candidaturas de técnicos. Provisório: quando
/// houver um formulário de candidatura no painel, o botão passa a abri-lo.
const _providerApplicationEmail = 'geral@resolvaagora.pt';

/// Abre o email com o assunto e um guião do que a candidatura deve trazer —
/// sem isto chegavam mensagens soltas e era preciso pedir tudo de volta.
Future<void> _applyAsProvider(BuildContext context) async {
  final uri = Uri(
    scheme: 'mailto',
    path: _providerApplicationEmail,
    // `query` à mão em vez de `queryParameters`: este último codifica os
    // espaços como "+", que a maioria das apps de email mostra literalmente.
    query: [
      'subject=${Uri.encodeComponent('Candidatura a técnico ResolvaAgora')}',
      'body=${Uri.encodeComponent('Olá,\n\n'
          'Gostaria de prestar serviços com a ResolvaAgora.\n\n'
          'Nome:\n'
          'Telemóvel:\n'
          'Especialidade(s):\n'
          'Distrito(s) onde trabalho:\n'
          'Anos de experiência:\n'
          'Tenho atividade aberta nas Finanças (sim/não):\n')}',
    ].join('&'),
  );

  // Sem `canLaunchUrl`: no iOS exigia declarar "mailto" no Info.plist e
  // devolvia falso mesmo com o Mail instalado.
  final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
  if (!opened && context.mounted) {
    // Sem app de email configurada: mostra o endereço para copiar à mão.
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
          content:
              Text('Envie a sua candidatura para $_providerApplicationEmail')),
    );
  }
}
