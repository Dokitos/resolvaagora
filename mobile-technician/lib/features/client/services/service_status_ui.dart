import 'package:flutter/material.dart';
import '../../../core/models/service_request.dart';

/// Customer-friendly label + colour for each [ServiceStatus].
class ServiceStatusUi {
  final String label;
  final Color color;
  final IconData icon;
  const ServiceStatusUi(this.label, this.color, this.icon);

  static ServiceStatusUi of(ServiceStatus status) {
    switch (status) {
      case ServiceStatus.DRAFT:
        return const ServiceStatusUi('Rascunho', Color(0xFF6B7280), Icons.edit_note);
      case ServiceStatus.AWAITING_PAYMENT:
        return const ServiceStatusUi('Aguarda pagamento', Color(0xFFD97706), Icons.payments_outlined);
      case ServiceStatus.PAID:
        return const ServiceStatusUi('Pago', Color(0xFF2563EB), Icons.check_circle_outline);
      case ServiceStatus.IN_DISTRIBUTION:
        return const ServiceStatusUi('A procurar técnico', Color(0xFF2563EB), Icons.travel_explore);
      case ServiceStatus.ASSIGNED:
        return const ServiceStatusUi('Técnico atribuído', Color(0xFF2563EB), Icons.person_pin_circle_outlined);
      case ServiceStatus.IN_TRANSIT:
        return const ServiceStatusUi('Em trânsito', Color(0xFF2563EB), Icons.directions_car_outlined);
      case ServiceStatus.ARRIVED:
        return const ServiceStatusUi('No local', Color(0xFF2563EB), Icons.location_on_outlined);
      case ServiceStatus.IN_DIAGNOSIS:
        return const ServiceStatusUi('Em diagnóstico', Color(0xFF2563EB), Icons.search);
      case ServiceStatus.QUOTE_SENT:
        return const ServiceStatusUi('Orçamento enviado', Color(0xFFD97706), Icons.request_quote_outlined);
      case ServiceStatus.QUOTE_APPROVED:
        return const ServiceStatusUi('Orçamento aprovado', Color(0xFF16A34A), Icons.thumb_up_outlined);
      case ServiceStatus.IN_EXECUTION:
        return const ServiceStatusUi('Em execução', Color(0xFF2563EB), Icons.handyman_outlined);
      case ServiceStatus.COMPLETED:
        return const ServiceStatusUi('Concluído', Color(0xFF16A34A), Icons.task_alt);
      case ServiceStatus.CANCELLED:
        return const ServiceStatusUi('Cancelado', Color(0xFFDC2626), Icons.cancel_outlined);
      case ServiceStatus.QUOTE_REJECTED:
        return const ServiceStatusUi('Orçamento rejeitado', Color(0xFFDC2626), Icons.thumb_down_outlined);
      case ServiceStatus.EXPIRED:
        return const ServiceStatusUi('Expirado', Color(0xFF6B7280), Icons.timer_off_outlined);
    }
  }

  /// Whether the customer can still cancel a request in this status.
  static bool cancellable(ServiceStatus status) =>
      status == ServiceStatus.DRAFT || status == ServiceStatus.AWAITING_PAYMENT;
}

Widget statusChip(ServiceStatus status) {
  final ui = ServiceStatusUi.of(status);
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: ui.color.withOpacity(0.12),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(ui.icon, size: 14, color: ui.color),
        const SizedBox(width: 5),
        Text(
          ui.label,
          style: TextStyle(color: ui.color, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ],
    ),
  );
}
