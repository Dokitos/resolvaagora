import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'booking_provider.dart';

class SummaryPage extends ConsumerWidget {
  const SummaryPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final booking = ref.watch(bookingProvider);
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final dateFmt = DateFormat('dd/MM/yyyy', 'pt_PT');

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color(0xFFCC0000),
        foregroundColor: Colors.white,
        leading: const SizedBox.shrink(),
        title: const SizedBox.shrink(),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              children: [
                const Text(
                  'Confirma o teu pedido',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  'Verifica todos os detalhes antes de prosseguir para o pagamento.',
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
                const SizedBox(height: 24),

                // Service section
                _SectionCard(
                  title: 'Serviço',
                  onEdit: () => context.go('/client/home'),
                  children: [
                    if (booking.category != null)
                      _Row(label: 'Categoria', value: booking.category!.name),
                    if (booking.subcategory != null)
                      _Row(label: 'Subcategoria', value: booking.subcategory!.name),
                    ...booking.selectedItems.map((bi) => _Row(
                          label: bi.item.name,
                          value: '${bi.qty}x ${fmt.format(bi.item.price)}',
                        )),
                    if (booking.description.isNotEmpty)
                      _Row(label: 'Descrição', value: booking.description, wrap: true),
                  ],
                ),
                const SizedBox(height: 12),

                // Location section
                _SectionCard(
                  title: 'Localização',
                  onEdit: () => context.push('/booking/address'),
                  children: [
                    if (booking.street.isNotEmpty)
                      _Row(
                        label: 'Morada',
                        value: '${booking.street}, ${booking.doorNumber}',
                        wrap: true,
                      ),
                    if (booking.postalCode.isNotEmpty)
                      _Row(label: 'Código Postal', value: booking.postalCode),
                    if (booking.locationDescription.isNotEmpty)
                      _Row(label: 'Localidade', value: booking.locationDescription),
                    if (booking.observations.isNotEmpty)
                      _Row(label: 'Observações', value: booking.observations, wrap: true),
                  ],
                ),
                const SizedBox(height: 12),

                // Schedule section
                _SectionCard(
                  title: 'Agendamento',
                  onEdit: () => context.push('/booking/schedule'),
                  children: [
                    if (booking.scheduledDate != null)
                      _Row(label: 'Data', value: dateFmt.format(booking.scheduledDate!)),
                    if (booking.scheduledSlot != null)
                      _Row(label: 'Horário', value: booking.scheduledSlot!),
                  ],
                ),
                const SizedBox(height: 12),

                // Contact section
                _SectionCard(
                  title: 'Contacto',
                  onEdit: () => context.push('/booking/contact'),
                  children: [
                    _Row(label: 'Telefone', value: booking.phone),
                    _Row(
                      label: 'Verificado',
                      value: booking.phoneVerified ? 'Sim ✓' : 'Não',
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Price breakdown
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.grey[50],
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Resumo do preço', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      const SizedBox(height: 12),
                      ...booking.selectedItems.map((bi) => Padding(
                            padding: const EdgeInsets.symmetric(vertical: 3),
                            child: Row(
                              children: [
                                Expanded(child: Text('${bi.item.name} x${bi.qty}', style: const TextStyle(fontSize: 13))),
                                Text(fmt.format(bi.item.price * bi.qty), style: const TextStyle(fontSize: 13)),
                              ],
                            ),
                          )),
                      const Divider(height: 16),
                      Row(
                        children: [
                          const Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          const Spacer(),
                          Text(
                            fmt.format(booking.total),
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFFCC0000)),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Ao confirmar, aceitas os nossos Termos e Condições e Política de Privacidade.',
                  style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),

          // Bottom CTA
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () => context.push('/booking/payment'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFCC0000),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    elevation: 0,
                  ),
                  child: const Text(
                    'COMPLETA O AGENDAMENTO',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 1),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final VoidCallback onEdit;
  final List<Widget> children;
  const _SectionCard({required this.title, required this.onEdit, required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: Colors.grey.shade200),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              const Spacer(),
              GestureDetector(
                onTap: onEdit,
                child: const Text(
                  'Editar',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFFCC0000),
                    fontWeight: FontWeight.w600,
                    decoration: TextDecoration.underline,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ...children,
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label;
  final String value;
  final bool wrap;
  const _Row({required this.label, required this.value, this.wrap = false});

  @override
  Widget build(BuildContext context) {
    if (wrap) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
            const SizedBox(height: 2),
            Text(value, style: const TextStyle(fontSize: 13)),
          ],
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Text(label, style: TextStyle(color: Colors.grey[500], fontSize: 13)),
          const SizedBox(width: 8),
          Expanded(child: Text(value, style: const TextStyle(fontSize: 13), textAlign: TextAlign.end)),
        ],
      ),
    );
  }
}
