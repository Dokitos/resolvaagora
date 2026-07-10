import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/utils/pt_postal.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class LocationPage extends ConsumerStatefulWidget {
  const LocationPage({super.key});

  @override
  ConsumerState<LocationPage> createState() => _LocationPageState();
}

class _LocationPageState extends ConsumerState<LocationPage> {
  final _postalCtrl = TextEditingController();
  String _locationDisplay = '';
  bool _isValid = false;

  void _onPostalChanged(String v) {
    final city = lookupPostalDisplay(v);
    if (city != null) {
      setState(() {
        _locationDisplay = city;
        _isValid = true;
      });
      ref.read(bookingProvider.notifier).setLocation(v, city);
      return;
    }
    setState(() {
      _locationDisplay = '';
      _isValid = false;
    });
  }

  @override
  void initState() {
    super.initState();
    final prev = ref.read(bookingProvider).postalCode;
    if (prev.isNotEmpty) {
      _postalCtrl.text = prev;
      _onPostalChanged(prev);
    }
  }

  @override
  void dispose() {
    _postalCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
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
            child: ListView(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
                  child: Text(
                    l.locationTitle,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                  ),
                ),
                // Location preview
                Container(
                  margin: const EdgeInsets.symmetric(horizontal: 16),
                  padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFEAF1FE), Color(0xFFD6E4FF)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: _isValid ? Colors.green.shade300 : Colors.grey.shade200,
                    ),
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10)],
                        ),
                        child: Icon(
                          _isValid ? Icons.location_pin : Icons.location_searching,
                          color: _isValid ? const Color(0xFF161616) : Colors.grey,
                          size: 32,
                        ),
                      ),
                      const SizedBox(height: 14),
                      Text(
                        _isValid ? _locationDisplay : l.enterPostalCode,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: _isValid ? Colors.black87 : Colors.grey[600],
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _isValid
                            ? l.locationConfirmed
                            : l.findProfessionalNear,
                        style: TextStyle(
                          fontSize: 13,
                          color: _isValid ? Colors.green[700] : Colors.grey[500],
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: TextField(
                    controller: _postalCtrl,
                    keyboardType: TextInputType.number,
                    onChanged: _onPostalChanged,
                    decoration: InputDecoration(
                      prefixIcon: const Icon(Icons.location_on_outlined),
                      hintText: l.postalHint,
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: _isValid ? Colors.green : Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: BorderSide(color: _isValid ? Colors.green : Colors.black, width: 2),
                      ),
                      suffixIcon: _isValid ? const Icon(Icons.check_circle, color: Colors.green) : null,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text(
                    l.postalFormat,
                    style: TextStyle(color: Colors.grey[500], fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: () => context.push('/booking/schedule'),
            nextEnabled: _isValid,
          ),
        ],
      ),
    );
  }
}

