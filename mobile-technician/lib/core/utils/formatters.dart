import 'package:intl/intl.dart';

final _currency = NumberFormat.currency(locale: 'pt_PT', symbol: '€', decimalDigits: 2);
final _date = DateFormat('dd/MM/yyyy HH:mm', 'pt_PT');
final _dateShort = DateFormat('dd MMM', 'pt_PT');

/// Safely parses a numeric value that may arrive as a String (e.g. Prisma
/// Decimal fields serialize to strings in JSON), a num, or null.
double parseAmount(dynamic v) =>
    v == null ? 0 : (v is num ? v.toDouble() : double.tryParse(v.toString()) ?? 0);

String formatCurrency(double amount) => _currency.format(amount);
String formatDate(DateTime date) => _date.format(date.toLocal());
String formatDateShort(DateTime date) => _dateShort.format(date.toLocal());

const Map<String, String> specialtyLabels = {
  'ELECTRICITY': 'Eletricidade',
  'PLUMBING': 'Canalização',
  'HVAC': 'AVAC',
  'APPLIANCES': 'Eletrodomésticos',
  'PAINTING': 'Pintura',
  'FURNITURE': 'Montagem de Móveis',
  'CLEANING': 'Limpeza',
  'LOCKSMITH': 'Serralharia',
  'GARDEN': 'Jardinagem',
  'FLOORING': 'Revestimentos',
  'TV_ANTENNA': 'TV e Antenas',
};

const Map<String, String> specialtyIcons = {
  'ELECTRICITY': '⚡',
  'PLUMBING': '🔧',
  'HVAC': '❄️',
  'APPLIANCES': '🏠',
  'PAINTING': '🎨',
  'FURNITURE': '🪑',
  'CLEANING': '🧹',
  'LOCKSMITH': '🔑',
  'GARDEN': '🌳',
  'FLOORING': '🧱',
  'TV_ANTENNA': '📺',
};

// Rótulos de estado consistentes com [ServiceStatusUi] (ecrãs do cliente).
// Cobre TODOS os estados para nunca mostrar o nome cru do enum (ex.: um pedido
// em IN_DISTRIBUTION mostrava 'IN_DISTRIBUTION' e divergia do detalhe).
const Map<String, String> statusLabels = {
  'DRAFT': 'Rascunho',
  'AWAITING_PAYMENT': 'Aguarda pagamento',
  'PAID': 'Pago',
  'IN_DISTRIBUTION': 'A procurar técnico',
  'ASSIGNED': 'Atribuído',
  'IN_TRANSIT': 'Em trânsito',
  'ARRIVED': 'No local',
  'IN_DIAGNOSIS': 'Em diagnóstico',
  'QUOTE_SENT': 'Orçamento enviado',
  'QUOTE_APPROVED': 'Orçamento aprovado',
  'IN_EXECUTION': 'Em execução',
  'COMPLETED': 'Concluído',
  'CANCELLED': 'Cancelado',
  'QUOTE_REJECTED': 'Orçamento rejeitado',
  'EXPIRED': 'Expirado',
};

const Map<String, Map<String, String>> nextStatusOptions = {
  'ASSIGNED':      {'status': 'IN_TRANSIT',   'label': 'Iniciar Deslocação'},
  'IN_TRANSIT':    {'status': 'ARRIVED',       'label': 'Cheguei ao Local'},
  'ARRIVED':       {'status': 'IN_DIAGNOSIS',  'label': 'Iniciar Diagnóstico'},
  'IN_DIAGNOSIS':  {'status': 'QUOTE_SENT',    'label': 'Enviar Orçamento'},
  'QUOTE_APPROVED':{'status': 'IN_EXECUTION',  'label': 'Iniciar Execução'},
  'IN_EXECUTION':  {'status': 'COMPLETED',     'label': 'Marcar Concluído'},
};
