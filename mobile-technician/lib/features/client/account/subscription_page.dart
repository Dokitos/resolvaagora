import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/models/client_profile.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';

class SubscriptionPage extends ConsumerWidget {
  const SubscriptionPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sub = ref.watch(mySubscriptionProvider);
    final plans = ref.watch(subscriptionPlansProvider);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Plano Premium'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: sub.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
        error: (e, _) => _error(ref),
        data: (active) {
          if (active != null && active.isActive) {
            return _ActiveView(subscription: active);
          }
          return plans.when(
            loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
            error: (e, _) => _error(ref),
            data: (list) {
              if (list.isEmpty) {
                return const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('Sem planos disponíveis de momento.')));
              }
              return _OfferView(plan: list.first);
            },
          );
        },
      ),
    );
  }

  Widget _error(WidgetRef ref) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Não foi possível carregar o plano', style: TextStyle(color: Colors.grey)),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {
                  ref.invalidate(mySubscriptionProvider);
                  ref.invalidate(subscriptionPlansProvider);
                },
                child: const Text('Tentar novamente'),
              ),
            ],
          ),
        ),
      );
}

List<({IconData icon, String text})> _benefits(SubscriptionPlan p) {
  // Se o admin definiu benefícios personalizados, usa-os; senão, deriva dos
  // atributos do plano.
  if (p.benefits.isNotEmpty) {
    return p.benefits.map((t) => (icon: Icons.check_circle_outline, text: t)).toList();
  }
  return [
    (icon: Icons.local_shipping_outlined, text: '${p.displacementDiscountPct.toInt()}% de desconto na taxa de deslocação'),
    (icon: Icons.card_giftcard_outlined, text: '${p.freeVisitsCount} visitas grátis por ano'),
    if (p.priorityScheduling) (icon: Icons.bolt_outlined, text: 'Agendamento prioritário'),
    (icon: Icons.verified_user_outlined, text: 'Apoio dedicado e garantia alargada'),
  ];
}

class _OfferView extends ConsumerStatefulWidget {
  final SubscriptionPlan plan;
  const _OfferView({required this.plan});

  @override
  ConsumerState<_OfferView> createState() => _OfferViewState();
}

class _OfferViewState extends ConsumerState<_OfferView> {
  bool _busy = false;

  Future<void> _subscribe() async {
    setState(() => _busy = true);
    try {
      await ref.read(clientServiceProvider).subscribe(widget.plan.id);
      ref.invalidate(mySubscriptionProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subscrição ativada! Bem-vindo ao Plano Premium 🎉')),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível subscrever. Tenta novamente.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.plan;
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final monthly = p.yearlyPrice / 12;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Imagem de destaque (definida pelo admin), se existir.
        if (p.imageUrl != null) ...[
          ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: AspectRatio(
              aspectRatio: 16 / 9,
              child: Image.network(
                p.imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => const SizedBox.shrink(),
              ),
            ),
          ),
          const SizedBox(height: 12),
        ],
        // Hero
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: AppTheme.brandGradient,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.workspace_premium, color: AppTheme.brandYellow, size: 28),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(p.name, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(p.description ?? 'Poupa em cada serviço e tem prioridade o ano todo.',
                  style: const TextStyle(color: Colors.white70, fontSize: 14, height: 1.4)),
              const SizedBox(height: 18),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(fmt.format(p.yearlyPrice),
                      style: const TextStyle(color: AppTheme.brandYellow, fontSize: 30, fontWeight: FontWeight.bold)),
                  const SizedBox(width: 6),
                  const Padding(
                    padding: EdgeInsets.only(bottom: 5),
                    child: Text('/ ano', style: TextStyle(color: Colors.white70, fontSize: 14)),
                  ),
                ],
              ),
              Text('≈ ${fmt.format(monthly)} / mês', style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 20),

        const Text('Vantagens do plano', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade200),
          ),
          padding: const EdgeInsets.all(8),
          child: Column(
            children: [
              for (final b in _benefits(p))
                ListTile(
                  leading: Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(color: AppTheme.brandYellowSoft, borderRadius: BorderRadius.circular(10)),
                    child: Icon(b.icon, color: AppTheme.brandBlack, size: 20),
                  ),
                  title: Text(b.text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                  trailing: const Icon(Icons.check_circle, color: Color(0xFF16A34A), size: 20),
                ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 54,
          child: ElevatedButton(
            onPressed: _busy ? null : _subscribe,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.brandYellow,
              foregroundColor: Colors.black,
              disabledBackgroundColor: Colors.grey[300],
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              elevation: 0,
            ),
            child: _busy
                ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.black))
                : Text('SUBSCREVER POR ${fmt.format(p.yearlyPrice)}/ANO',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 0.5)),
          ),
        ),
        const SizedBox(height: 10),
        Center(
          child: Text('Cancela quando quiseres.', style: TextStyle(color: Colors.grey[500], fontSize: 12)),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _ActiveView extends ConsumerStatefulWidget {
  final ClientSubscription subscription;
  const _ActiveView({required this.subscription});

  @override
  ConsumerState<_ActiveView> createState() => _ActiveViewState();
}

class _ActiveViewState extends ConsumerState<_ActiveView> {
  bool _busy = false;

  Future<void> _cancel() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Cancelar subscrição?'),
        content: const Text('Perderás os benefícios do Plano Premium no fim do período atual.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Não')),
          TextButton(onPressed: () => Navigator.pop(context, true),
              child: const Text('Cancelar', style: TextStyle(color: AppTheme.brandRed))),
        ],
      ),
    );
    if (ok != true) return;
    setState(() => _busy = true);
    try {
      await ref.read(clientServiceProvider).cancelSubscription();
      ref.invalidate(mySubscriptionProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Subscrição cancelada')));
    } catch (_) {
      if (!mounted) return;
      setState(() => _busy = false);
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Não foi possível cancelar')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.subscription;
    final p = s.plan;
    final dateFmt = DateFormat("d 'de' MMMM 'de' yyyy", 'pt_PT');

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF16A34A), Color(0xFF22C55E)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.workspace_premium, color: Colors.white, size: 26),
                  const SizedBox(width: 8),
                  Text(p?.name ?? 'Plano Premium', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(20)),
                    child: const Text('ATIVO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              if (s.expiresAt != null)
                Text('Válido até ${dateFmt.format(s.expiresAt!.toLocal())}',
                    style: const TextStyle(color: Colors.white, fontSize: 14)),
              if (p != null)
                Text('${(p.freeVisitsCount - s.freeVisitsUsed).clamp(0, p.freeVisitsCount)} de ${p.freeVisitsCount} visitas grátis disponíveis',
                    style: const TextStyle(color: Colors.white70, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        if (p != null) ...[
          const Text('Os teus benefícios', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
            padding: const EdgeInsets.all(8),
            child: Column(
              children: [
                for (final b in _benefits(p))
                  ListTile(
                    leading: const Icon(Icons.check_circle, color: Color(0xFF16A34A)),
                    title: Text(b.text, style: const TextStyle(fontSize: 14)),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
        OutlinedButton(
          onPressed: _busy ? null : _cancel,
          style: OutlinedButton.styleFrom(
            foregroundColor: AppTheme.brandRed,
            side: const BorderSide(color: AppTheme.brandRed),
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
          ),
          child: _busy
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.brandRed))
              : const Text('Cancelar subscrição', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
