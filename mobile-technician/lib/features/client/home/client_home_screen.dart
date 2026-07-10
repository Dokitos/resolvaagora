import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/i18n/language_selector.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/settings_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/pressable.dart';
import '../../../data/services_data.dart';

const _red = Color(0xFF161616);
const _blue = Color(0xFF161616); // acento em fundo claro → preto (legível)
const _yellow = Color(0xFFF5B301); // amarelo de marca (preenchimentos/destaques)

class ClientHomeScreen extends StatelessWidget {
  const ClientHomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      body: CustomScrollView(
        slivers: [
          _buildAppBar(context),
          SliverToBoxAdapter(child: Consumer(builder: (context, ref, _) {
            final settings = ref.watch(appSettingsProvider).valueOrNull;
            if (settings == null || !settings.maintenanceMode) return const SizedBox.shrink();
            return Container(
              width: double.infinity,
              color: const Color(0xFFFFF3CD),
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              child: Row(
                children: [
                  const Icon(Icons.build_circle_outlined, color: Color(0xFFB45309), size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      settings.maintenanceMessage?.isNotEmpty == true
                          ? settings.maintenanceMessage!
                          : 'Estamos em manutenção. Novos pedidos podem estar temporariamente indisponíveis.',
                      style: const TextStyle(color: Color(0xFF92400E), fontSize: 13, height: 1.3),
                    ),
                  ),
                ],
              ),
            );
          })),
          SliverToBoxAdapter(child: _HeroSection()),
          SliverToBoxAdapter(child: _StatsChips()),
          SliverToBoxAdapter(child: _SubscriptionBanner()),
          SliverToBoxAdapter(child: _FeaturedServices()),
          SliverToBoxAdapter(child: _CategoryGrid()),
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
      backgroundColor: _red,
      surfaceTintColor: _red,
      foregroundColor: Colors.white,
      flexibleSpace: const DecoratedBox(decoration: BoxDecoration(gradient: AppTheme.brandGradient)),
      title: Row(
        children: [
          const Text(
            'ResolvaAgora',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 18,
            ),
          ),
          const Spacer(),
          Consumer(
            builder: (context, ref, _) => IconButton(
              icon: const Icon(Icons.language, color: Colors.white),
              tooltip: 'Idioma / Language',
              onPressed: () => showLanguageSelector(context, ref),
            ),
          ),
          Consumer(
            builder: (context, ref, _) {
              final isAuth = ref.watch(authProvider).valueOrNull?.isAuthenticated ?? false;
              if (isAuth) {
                return IconButton(
                  icon: const Icon(Icons.person_outline, color: Colors.white),
                  onPressed: () => context.go('/client/account'),
                );
              }
              return TextButton(
                onPressed: () => context.push('/login'),
                style: TextButton.styleFrom(
                  foregroundColor: _red,
                  backgroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
                child: const Text('Entrar', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
    final auth = ref.watch(authProvider).valueOrNull;
    final firstName = (auth?.isAuthenticated == true && (auth?.name?.isNotEmpty ?? false))
        ? auth!.name!.split(' ').first
        : null;
    final greeting = firstName != null ? 'Olá, $firstName 👋' : 'Bem-vindo 👋';

    return Container(
      decoration: const BoxDecoration(gradient: AppTheme.brandGradient),
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            greeting,
            style: const TextStyle(color: Colors.white70, fontSize: 15, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 10),
          const Text(
            'Num só sítio,',
            style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w300, height: 1.05),
          ),
          const Text(
            'resolvemos tudo.',
            style: TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w800, height: 1.05),
          ),
          const SizedBox(height: 10),
          const Text(
            'Reparações, instalações, manutenções e limpezas com técnicos certificados.',
            style: TextStyle(color: Colors.white70, fontSize: 14, height: 1.4),
          ),
          const SizedBox(height: 22),
          // Barra de pesquisa flutuante — sombra dá a sensação de "sobreposta" ao hero.
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.18),
                  blurRadius: 18,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Ex: Máquina lavar avariada',
                hintStyle: TextStyle(color: Colors.grey[400]),
                prefixIcon: const Icon(Icons.search, color: _red),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(30),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              ),
              onSubmitted: (_) {},
            ),
          ),
        ],
      ),
    );
  }
}

// ── Subscription banner ─────────────────────────────────────────────────────
class _SubscriptionBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
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
            boxShadow: [BoxShadow(color: _yellow.withOpacity(0.30), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          child: Row(
            children: [
              const Icon(Icons.workspace_premium, color: Colors.black87, size: 36),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text('Plano Premium',
                        style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 17)),
                    SizedBox(height: 3),
                    Text('Desconto na deslocação, visitas grátis e prioridade.',
                        style: TextStyle(color: Colors.black87, fontSize: 13, height: 1.3)),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(20)),
                child: const Text('Ver', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Stats chips ───────────────────────────────────────────────────────────────
class _StatsChips extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.verified_outlined, '100% Técnicos certificados'),
      (Icons.shield_outlined, 'Serviços com garantia'),
      (Icons.location_on_outlined, '+300 Municípios cobertos'),
      (Icons.bolt_outlined, '100% online'),
      (Icons.people_outline, '+700 técnicos'),
    ];
    return Container(
      color: Colors.white,
      height: 56,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (_, i) => _Chip(icon: items[i].$1, label: items[i].$2),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _Chip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(20),
        color: Colors.grey[50],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: _blue),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

// ── Featured services (horizontal scroll) ────────────────────────────────────
class _FeaturedServices extends StatelessWidget {
  static const _featured = [
    (color: Color(0xFFFFF3E0), icon: Icons.electrical_services, name: 'Eletricidade', sub: 'Reparações, instalações e substituições', price: '€30,00'),
    (color: Color(0xFFE3F2FD), icon: Icons.ac_unit, name: 'Ar Condicionado', sub: 'Instalação, manutenção e recarga de gás', price: '€60,00'),
    (color: Color(0xFFE8F5E9), icon: Icons.plumbing, name: 'Canalização', sub: 'Fugas, entupimentos e instalações', price: '€30,00'),
    (color: Color(0xFFFCE4EC), icon: Icons.chair, name: 'Montagem Móveis', sub: 'IKEA, Leroy Merlin e outras marcas', price: '€15,00'),
    (color: Color(0xFFF3E5F5), icon: Icons.cleaning_services, name: 'Limpeza', sub: 'Geral, pós-obra e vidros', price: '€35,00'),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 24, 20, 12),
          child: Text(
            'Explora alguns dos nossos serviços',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        SizedBox(
          height: 200,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: _featured.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, i) {
              final f = _featured[i];
              return Pressable(
                onTap: () {
                  final cat = kServiceCategories.firstWhere(
                    (c) => c.name == f.name,
                    orElse: () => kServiceCategories.first,
                  );
                  context.push('/booking/category/${cat.id}');
                },
                child: Container(
                  width: 200,
                  decoration: BoxDecoration(
                    color: f.color,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(f.icon, size: 36, color: _blue),
                      const Spacer(),
                      Text(f.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 4),
                      Text(f.sub, style: const TextStyle(fontSize: 12, color: Colors.black54), maxLines: 2),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.black87,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          'desde ${f.price}',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

// ── Category grid ──────────────────────────────────────────────────────────────
class _CategoryGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 28, 20, 4),
          child: Text('Serviços por categoria', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
          child: Text('Vê todos os serviços disponíveis em cada área.',
              style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        ),
        const SizedBox(height: 16),
        GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 1.2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
          ),
          itemCount: kServiceCategories.length,
          itemBuilder: (context, i) {
            final cat = kServiceCategories[i];
            return _CategoryCard(category: cat);
          },
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
    final (accent, tint) = AppTheme.categoryColors(category.id);
    return Pressable(
      onTap: () => context.push('/booking/category/${category.id}'),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 46,
              height: 46,
              decoration: BoxDecoration(
                color: tint,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(
                child: Text(category.emoji, style: const TextStyle(fontSize: 22)),
              ),
            ),
            const Spacer(),
            Text(
              category.name,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
              maxLines: 2,
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text('Ver serviços',
                    style: TextStyle(color: accent, fontSize: 12, fontWeight: FontWeight.w600)),
                const SizedBox(width: 2),
                Icon(Icons.arrow_forward, size: 13, color: accent),
              ],
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
    const steps = [
      (Icons.search, 'Escolhe', 'Encontra o serviço certo para ti.'),
      (Icons.calendar_today, 'Marca', 'Escolhe o dia e a hora que preferires.'),
      (Icons.access_time, 'Confirma', 'Paga online e deixa o resto connosco.'),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 28, 20, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Text('Como funciona', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
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
                      Text(s.$2, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 2),
                      Text(s.$3, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
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
    const points = [
      (Icons.public, 'Cobertura nacional'),
      (Icons.shield_outlined, 'Serviços com garantia'),
      (Icons.bolt, '100% online, sem complicações'),
      (Icons.people_outline, '+700 técnicos especializados'),
      (Icons.home_repair_service_outlined, '+50 serviços disponíveis'),
      (Icons.euro_symbol, 'Preço justo e transparente'),
    ];
    return Container(
      margin: const EdgeInsets.fromLTRB(20, 24, 20, 0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Porquê escolher-nos?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 6),
          Text(
            'Garantimos a tua total satisfação com compromissos que nos diferenciam no mercado.',
            style: TextStyle(color: Colors.grey[600], fontSize: 13, height: 1.4),
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
                Text(p.$2, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
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
          const Text(
            'Queres prestar serviços com a ResolvaAgora?',
            style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, height: 1.3),
          ),
          const SizedBox(height: 8),
          const Text(
            'Junta-te à nossa rede de técnicos certificados e começa a receber pedidos de clientes de todo o país.',
            style: TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandYellow,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: const Text('COMEÇAR AGORA', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ],
      ),
    );
  }
}
