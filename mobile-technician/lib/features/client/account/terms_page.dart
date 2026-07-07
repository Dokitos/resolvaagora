import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class TermsPage extends StatelessWidget {
  const TermsPage({super.key});

  static const _sections = [
    (
      'Condições do serviço',
      'Qualquer serviço não inclui peças/materiais adicionais não selecionados.\n\n'
          '1) O valor apresentado é um orçamento estimado com base no valor médio para os '
          'serviços selecionados.\n'
          '2) O orçamento final do serviço será determinado no local após levantamento das '
          'tarefas a realizar e está sujeito a confirmação.\n'
          '3) Serviço com custo mínimo de 30,00€.\n'
          '4) Em todos os casos, o agendamento está sujeito ao pagamento do valor apresentado.\n'
          '5) Serviço com 6 meses de garantia.'
    ),
    (
      'Política de cancelamento',
      'O cancelamento é gratuito e com reembolso completo até à data e hora agendadas para o '
          'serviço. Após esse período, poderão aplicar-se custos de deslocação.'
    ),
    (
      'Pagamentos',
      'Os pagamentos são processados de forma segura. Com o pagamento deste serviço, está a '
          'confirmar o seu interesse na contratação de uma equipa profissional ResolvaAgora '
          'para a execução do serviço.'
    ),
    (
      'Privacidade',
      'Os teus dados pessoais são tratados de acordo com a legislação aplicável e utilizados '
          'apenas para a prestação e gestão dos serviços contratados.'
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Termos e condições'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          for (final s in _sections) ...[
            Text(s.$1, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Text(s.$2, style: TextStyle(color: Colors.grey[800], fontSize: 14, height: 1.6)),
            const SizedBox(height: 24),
          ],
        ],
      ),
    );
  }
}
