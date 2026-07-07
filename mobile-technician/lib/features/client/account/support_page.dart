import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/theme/app_theme.dart';

class SupportPage extends StatelessWidget {
  const SupportPage({super.key});

  static const _phone = '+351210000000';
  static const _phoneDisplay = '+351 21 000 0000';
  static const _email = 'suporte@resolvaagora.pt';
  static const _whatsapp = '351910000000';

  static const _faq = [
    (
      'Como funciona o agendamento?',
      'Escolhe o serviço, indica a morada e a data preferida, e confirma o pagamento. '
          'Um técnico certificado é atribuído ao teu pedido.'
    ),
    (
      'O valor apresentado é final?',
      'O valor é um orçamento estimado. O orçamento final é determinado no local após '
          'levantamento das tarefas e está sujeito a confirmação.'
    ),
    (
      'Posso cancelar um pedido?',
      'Sim. Podes cancelar gratuitamente enquanto o pedido estiver por confirmar, '
          'diretamente em "Os meus serviços".'
    ),
    (
      'Os serviços têm garantia?',
      'Todos os serviços têm 6 meses de garantia sobre a mão de obra realizada.'
    ),
  ];

  Future<void> _launch(BuildContext context, Uri uri) async {
    final ok = await canLaunchUrl(uri) && await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível abrir a aplicação')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Ajuda e suporte'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Fala connosco',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 4),
          Text('A nossa equipa está disponível de 2ª a 6ª, das 9h às 19h.',
              style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          const SizedBox(height: 16),
          _ContactTile(
            icon: Icons.forum_outlined,
            color: AppTheme.brandRed,
            title: 'Chat com o suporte',
            subtitle: 'Falar com a nossa equipa dentro da app',
            onTap: () => context.push('/client/account/support/chat'),
          ),
          const SizedBox(height: 10),
          _ContactTile(
            icon: Icons.phone_outlined,
            color: const Color(0xFF16A34A),
            title: 'Ligar',
            subtitle: _phoneDisplay,
            onTap: () => _launch(context, Uri(scheme: 'tel', path: _phone)),
          ),
          const SizedBox(height: 10),
          _ContactTile(
            icon: Icons.chat_outlined,
            color: const Color(0xFF25D366),
            title: 'WhatsApp',
            subtitle: 'Resposta rápida por mensagem',
            onTap: () => _launch(context, Uri.parse('https://wa.me/$_whatsapp')),
          ),
          const SizedBox(height: 10),
          _ContactTile(
            icon: Icons.mail_outline,
            color: AppTheme.brandBlue,
            title: 'Email',
            subtitle: _email,
            onTap: () => _launch(
              context,
              Uri(scheme: 'mailto', path: _email, queryParameters: {'subject': 'Pedido de apoio'}),
            ),
          ),
          const SizedBox(height: 28),
          const Text('Perguntas frequentes',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Column(
              children: [
                for (var i = 0; i < _faq.length; i++) ...[
                  if (i > 0) const Divider(height: 1),
                  Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      tilePadding: const EdgeInsets.symmetric(horizontal: 16),
                      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      title: Text(_faq[i].$1, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      children: [
                        Align(
                          alignment: Alignment.centerLeft,
                          child: Text(_faq[i].$2,
                              style: TextStyle(color: Colors.grey[700], fontSize: 13, height: 1.5)),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

class _ContactTile extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _ContactTile({
    required this.icon,
    required this.color,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
              child: Icon(icon, color: color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
