import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/client_service.dart';
import '../../../core/services/settings_service.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class OtpPage extends ConsumerStatefulWidget {
  const OtpPage({super.key});

  @override
  ConsumerState<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends ConsumerState<OtpPage> {
  final List<TextEditingController> _ctrls = List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focus = List.generate(6, (_) => FocusNode());
  bool _verifying = false;
  bool _otpSent = false;

  @override
  void initState() {
    super.initState();
    // Se a verificação por SMS está ativa e a Twilio configurada, envia já o código.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final settings = ref.read(appSettingsProvider).valueOrNull;
      if (settings?.otpRequired == true && !_otpSent) {
        _sendOtp(silent: true);
      }
    });
  }

  Future<void> _sendOtp({bool silent = false}) async {
    final phone = ref.read(bookingProvider).phone.replaceAll(' ', '');
    try {
      await ref.read(clientServiceProvider).sendOtp(phone);
      _otpSent = true;
      if (!silent && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(AppLocalizations.of(context).codeResent)),
        );
      }
    } catch (_) {
      // silencioso
    }
  }

  void _onDigit(int index, String val) {
    if (val.length == 1 && index < 5) {
      _focus[index + 1].requestFocus();
    } else if (val.isEmpty && index > 0) {
      _focus[index - 1].requestFocus();
    }
  }

  Future<void> _advance() async {
    final settings = ref.read(appSettingsProvider).valueOrNull;
    final l = AppLocalizations.of(context);
    if (settings?.otpRequired == true) {
      final code = _ctrls.map((c) => c.text).join();
      if (code.length < 6) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.otpEnterCode)));
        return;
      }
      setState(() => _verifying = true);
      bool ok = false;
      try {
        ok = await ref.read(clientServiceProvider).verifyOtp(code);
      } catch (_) {}
      if (!mounted) return;
      setState(() => _verifying = false);
      if (!ok) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(l.otpInvalid)));
        return;
      }
    }
    ref.read(bookingProvider.notifier).setPhoneVerified();
    if (mounted) context.push('/booking/address');
  }

  @override
  void dispose() {
    for (final c in _ctrls) c.dispose();
    for (final f in _focus) f.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final phone = ref.watch(bookingProvider).phone;
    final l = AppLocalizations.of(context);
    final otpRequired = ref.watch(appSettingsProvider).valueOrNull?.otpRequired ?? false;

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
                  Text(
                    l.otpTitle,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                  ),
                  const SizedBox(height: 32),
                  // 6 OTP boxes
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(6, (i) {
                      return SizedBox(
                        width: 46,
                        child: TextField(
                          controller: _ctrls[i],
                          focusNode: _focus[i],
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          maxLength: 1,
                          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                          onChanged: (v) => _onDigit(i, v),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                          decoration: InputDecoration(
                            counterText: '',
                            contentPadding: const EdgeInsets.symmetric(vertical: 14),
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
                      );
                    }),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    l.otpSentTo(phone),
                    style: TextStyle(color: Colors.grey[600], fontSize: 13),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      _TextBtn(l.edit, () => context.pop()),
                      const SizedBox(width: 16),
                      _TextBtn(l.resend, () => _sendOtp()),
                      const SizedBox(width: 16),
                      _TextBtn(l.clientDidntReceiveSms, () {}),
                    ],
                  ),
                  const SizedBox(height: 24),
                  if (!otpRequired)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF8E1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline, size: 18, color: Colors.orange),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              l.smsDisabledTestMode,
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
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: _verifying ? null : _advance,
            nextEnabled: !_verifying,
          ),
        ],
      ),
    );
  }
}

class _TextBtn extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const _TextBtn(this.label, this.onTap);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Text(
        label,
        style: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 12,
          decoration: TextDecoration.underline,
        ),
      ),
    );
  }
}
