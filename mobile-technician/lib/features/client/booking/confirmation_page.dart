import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'booking_provider.dart';

class ConfirmationPage extends ConsumerWidget {
  const ConfirmationPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingProvider);
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final dateFmt = DateFormat("d 'de' MMMM 'de' yyyy", 'pt_PT');

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    // Success checkmark
                    Container(
                      width: 90,
                      height: 90,
                      decoration: const BoxDecoration(
                        color: Color(0xFFE8F5E9),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check_circle_outline, color: Color(0xFF2E7D32), size: 52),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Pedido confirmado!',
                      style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'O teu agendamento foi realizado com sucesso. Em breve receberás uma confirmação por SMS.',
                      style: TextStyle(color: Colors.grey[600], fontSize: 14, height: 1.5),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 32),

                    // Booking summary card
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(18),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Detalhes do agendamento',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          const SizedBox(height: 14),
                          if (booking.category != null)
                            _DetailRow(
                              icon: Icons.build_outlined,
                              label: booking.category!.name,
                              sub: booking.subcategory?.name ?? '',
                            ),
                          const SizedBox(height: 8),
                          if (booking.scheduledDate != null)
                            _DetailRow(
                              icon: Icons.calendar_today_outlined,
                              label: dateFmt.format(booking.scheduledDate!),
                              sub: booking.scheduledSlot ?? '',
                            ),
                          const SizedBox(height: 8),
                          if (booking.street.isNotEmpty)
                            _DetailRow(
                              icon: Icons.location_on_outlined,
                              label: '${booking.street}, ${booking.doorNumber}',
                              sub: '${booking.postalCode} ${booking.locationDescription}',
                            ),
                          const Divider(height: 20),
                          Row(
                            children: [
                              const Text('Total pago', style: TextStyle(color: Colors.grey, fontSize: 13)),
                              const Spacer(),
                              Text(
                                fmt.format(booking.total),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF161616)),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Whatsapp/Notification note
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF3CD),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.notifications_none, size: 20, color: Colors.orange),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Irás receber uma notificação quando um técnico aceitar o teu pedido.',
                              style: TextStyle(fontSize: 12, color: Colors.grey[800]),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Footer buttons
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
              child: Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: () {
                        ref.read(bookingProvider.notifier).reset();
                        context.go('/client/services');
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF161616),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        elevation: 0,
                      ),
                      child: const Text(
                        'VER OS MEUS PEDIDOS',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 1),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: OutlinedButton(
                      onPressed: () {
                        ref.read(bookingProvider.notifier).reset();
                        context.go('/client/home');
                      },
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.black87,
                        side: const BorderSide(color: Colors.black26),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      ),
                      child: const Text(
                        'VOLTAR AO INÍCIO',
                        style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, letterSpacing: 0.5),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String sub;
  const _DetailRow({required this.icon, required this.label, required this.sub});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey[600]),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
              if (sub.isNotEmpty)
                Text(sub, style: TextStyle(fontSize: 12, color: Colors.grey[500])),
            ],
          ),
        ),
      ],
    );
  }
}
