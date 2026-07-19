import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

/// Papel do utilizador para o qual o tutorial inicial é mostrado.
enum OnboardingRole { client, technician, admin }

String _roleKey(OnboardingRole role) {
  switch (role) {
    case OnboardingRole.client:
      return 'client';
    case OnboardingRole.technician:
      return 'technician';
    case OnboardingRole.admin:
      return 'admin';
  }
}

/// Um passo do tutorial: ícone + título + descrição curta.
class _OnbStep {
  final IconData icon;
  final String title;
  final String description;
  const _OnbStep({required this.icon, required this.title, required this.description});
}

List<_OnbStep> _stepsFor(OnboardingRole role) {
  switch (role) {
    case OnboardingRole.client:
      return const [
        _OnbStep(
          icon: Icons.search,
          title: 'Encontra o serviço certo',
          description: 'Pesquisa por categoria — eletricidade, canalização, limpeza e muito mais.',
        ),
        _OnbStep(
          icon: Icons.calendar_today,
          title: 'Marca em segundos',
          description: 'Escolhe a data, a hora e a morada. Confirmas e está feito.',
        ),
        _OnbStep(
          icon: Icons.timeline,
          title: 'Acompanha o teu pedido',
          description: 'Vê o estado em tempo real, desde a marcação até à conclusão.',
        ),
        _OnbStep(
          icon: Icons.receipt_long,
          title: 'Aprova orçamentos',
          description: 'Recebes o orçamento do técnico e aprovas ou recusas quando quiseres.',
        ),
      ];
    case OnboardingRole.technician:
      return const [
        _OnbStep(
          icon: Icons.calendar_month,
          title: 'A tua agenda',
          description: 'Vê todos os trabalhos que te foram atribuídos, organizados por estado.',
        ),
        _OnbStep(
          icon: Icons.handshake_outlined,
          title: 'Aceita trabalhos',
          description: 'Fica disponível e aceita os pedidos que chegam perto de ti.',
        ),
        _OnbStep(
          icon: Icons.request_quote_outlined,
          title: 'Orçamento e fotos',
          description: 'Envia o orçamento ao cliente e junta fotos do diagnóstico e do trabalho.',
        ),
        _OnbStep(
          icon: Icons.euro,
          title: 'Os teus ganhos',
          description: 'Consulta o que já ganhaste e o histórico dos serviços concluídos.',
        ),
      ];
    case OnboardingRole.admin:
      return const [
        _OnbStep(
          icon: Icons.dashboard_outlined,
          title: 'Painel de controlo',
          description: 'Vê pedidos do dia, receita, técnicos ativos e alertas num só ecrã.',
        ),
        _OnbStep(
          icon: Icons.assignment_outlined,
          title: 'Gere os pedidos',
          description: 'Acompanha e atribui pedidos aos técnicos, do início ao fim.',
        ),
        _OnbStep(
          icon: Icons.notifications_none,
          title: 'Notificações',
          description: 'Fica a par de alertas de SLA e de tudo o que precisa de atenção.',
        ),
        _OnbStep(
          icon: Icons.insights_outlined,
          title: 'Financeiro',
          description: 'Consulta a receita e os indicadores do negócio a qualquer momento.',
        ),
      ];
  }
}

/// Widget invisível que, na primeira construção do ecrã de entrada, mostra uma
/// vez o tutorial do respetivo [role]. Fica protegido por uma flag em
/// SharedPreferences (`has_seen_onboarding_<role>`), pelo que só aparece uma
/// vez por papel. Basta colocá-lo em qualquer ponto da árvore do ecrã.
class OnboardingTrigger extends StatefulWidget {
  final OnboardingRole role;
  const OnboardingTrigger({super.key, required this.role});

  @override
  State<OnboardingTrigger> createState() => _OnboardingTriggerState();
}

class _OnboardingTriggerState extends State<OnboardingTrigger> {
  bool _handled = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeShow());
  }

  Future<void> _maybeShow() async {
    if (_handled) return;
    _handled = true;
    final prefs = await SharedPreferences.getInstance();
    final key = 'has_seen_onboarding_${_roleKey(widget.role)}';
    if (prefs.getBool(key) == true) return;
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      barrierColor: Colors.black.withOpacity(0.72),
      builder: (_) => _OnboardingCarousel(steps: _stepsFor(widget.role)),
    );
    await prefs.setBool(key, true);
  }

  @override
  Widget build(BuildContext context) => const SizedBox.shrink();
}

class _OnboardingCarousel extends StatefulWidget {
  final List<_OnbStep> steps;
  const _OnboardingCarousel({required this.steps});

  @override
  State<_OnboardingCarousel> createState() => _OnboardingCarouselState();
}

class _OnboardingCarouselState extends State<_OnboardingCarousel> {
  final _controller = PageController();
  int _index = 0;

  bool get _isLast => _index == widget.steps.length - 1;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _next() {
    if (_isLast) {
      Navigator.of(context).pop();
      return;
    }
    _controller.nextPage(
      duration: const Duration(milliseconds: 280),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Barra superior: "Saltar".
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Saltar', style: TextStyle(color: Colors.grey)),
              ),
            ),
            SizedBox(
              height: 300,
              child: PageView.builder(
                controller: _controller,
                itemCount: widget.steps.length,
                onPageChanged: (i) => setState(() => _index = i),
                itemBuilder: (_, i) => _StepView(step: widget.steps[i]),
              ),
            ),
            const SizedBox(height: 16),
            // Indicadores de página.
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (int i = 0; i < widget.steps.length; i++)
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    width: i == _index ? 22 : 8,
                    height: 8,
                    margin: const EdgeInsets.symmetric(horizontal: 3),
                    decoration: BoxDecoration(
                      color: i == _index ? AppTheme.brandRed : Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 52,
              child: ElevatedButton(
                onPressed: _next,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.brandRed,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  elevation: 0,
                ),
                child: Text(
                  _isLast ? 'Começar' : 'Seguinte',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, letterSpacing: 0.5),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StepView extends StatelessWidget {
  final _OnbStep step;
  const _StepView({required this.step});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          width: 96,
          height: 96,
          decoration: BoxDecoration(
            color: AppTheme.brandRed.withOpacity(0.10),
            shape: BoxShape.circle,
          ),
          child: Icon(step.icon, size: 46, color: AppTheme.brandRed),
        ),
        const SizedBox(height: 28),
        Text(
          step.title,
          textAlign: TextAlign.center,
          style: const TextStyle(fontSize: 21, fontWeight: FontWeight.bold, height: 1.25),
        ),
        const SizedBox(height: 12),
        Text(
          step.description,
          textAlign: TextAlign.center,
          style: TextStyle(fontSize: 14.5, height: 1.5, color: Colors.grey[700]),
        ),
      ],
    );
  }
}
