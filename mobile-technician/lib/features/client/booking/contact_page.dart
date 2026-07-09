import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class ContactPage extends ConsumerStatefulWidget {
  const ContactPage({super.key});

  @override
  ConsumerState<ContactPage> createState() => _ContactPageState();
}

class _ContactPageState extends ConsumerState<ContactPage> {
  final _phoneCtrl = TextEditingController();
  String _countryCode = '+351';
  bool _isValid = false;

  @override
  void initState() {
    super.initState();
    final prev = ref.read(bookingProvider).phone;
    if (prev.isNotEmpty) {
      // Remove country code prefix
      final number = prev.startsWith('+351') ? prev.substring(4) : prev;
      _phoneCtrl.text = number.trim();
      _validate(number.trim());
    }
  }

  void _validate(String v) {
    final digits = v.replaceAll(RegExp(r'\D'), '');
    setState(() => _isValid = digits.length >= 9);
  }

  @override
  void dispose() {
    _phoneCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color(0xFF161616),
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
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Indica o teu número de telefone',
                    style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold, height: 1.3),
                  ),
                  const SizedBox(height: 32),
                  Row(
                    children: [
                      // Country code
                      Container(
                        decoration: BoxDecoration(
                          border: Border.all(color: Colors.grey.shade300),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                        child: Row(
                          children: [
                            const Text('🇵🇹', style: TextStyle(fontSize: 20)),
                            const SizedBox(width: 8),
                            Text(_countryCode, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                            const SizedBox(width: 4),
                            const Icon(Icons.keyboard_arrow_down, size: 18),
                          ],
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: _phoneCtrl,
                          keyboardType: TextInputType.phone,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          onChanged: (v) {
                            _validate(v);
                            ref.read(bookingProvider.notifier).setPhone('$_countryCode $v');
                          },
                          decoration: InputDecoration(
                            prefixIcon: const Icon(Icons.phone_outlined),
                            hintText: 'Telefone',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.black26),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(8),
                              borderSide: const BorderSide(color: Colors.black, width: 2),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Irás receber um código de confirmação por SMS.',
                    style: TextStyle(color: Colors.grey[500], fontSize: 13),
                  ),
                ],
              ),
            ),
          ),
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: () => context.push('/booking/otp'),
            nextEnabled: _isValid,
          ),
        ],
      ),
    );
  }
}
