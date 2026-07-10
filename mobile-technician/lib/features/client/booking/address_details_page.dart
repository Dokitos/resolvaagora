import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class AddressDetailsPage extends ConsumerStatefulWidget {
  const AddressDetailsPage({super.key});

  @override
  ConsumerState<AddressDetailsPage> createState() => _AddressDetailsPageState();
}

class _AddressDetailsPageState extends ConsumerState<AddressDetailsPage> {
  final _streetCtrl = TextEditingController();
  final _doorCtrl = TextEditingController();
  final _floorCtrl = TextEditingController();
  final _obsCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final prev = ref.read(bookingProvider);
    _streetCtrl.text = prev.street;
    _doorCtrl.text = prev.doorNumber;
    _obsCtrl.text = prev.observations;
  }

  bool get _isValid =>
      _streetCtrl.text.trim().isNotEmpty && _doorCtrl.text.trim().isNotEmpty;

  void _save() {
    ref.read(bookingProvider.notifier).setAddressDetails(
          _streetCtrl.text.trim(),
          _doorCtrl.text.trim(),
          _obsCtrl.text.trim(),
          floor: _floorCtrl.text.trim(),
        );
  }

  @override
  void dispose() {
    _streetCtrl.dispose();
    _doorCtrl.dispose();
    _floorCtrl.dispose();
    _obsCtrl.dispose();
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
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
              children: [
                Text(
                  l.addressDetailsTitle,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                ),
                const SizedBox(height: 28),
                _buildField(
                  ctrl: _streetCtrl,
                  label: l.addrStreet,
                  hint: l.addrStreetHint,
                  icon: Icons.home_outlined,
                  required: true,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildField(
                        ctrl: _doorCtrl,
                        label: l.addrDoor,
                        hint: l.addrDoorHint,
                        icon: Icons.door_front_door_outlined,
                        required: true,
                        keyboardType: TextInputType.text,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildField(
                        ctrl: _floorCtrl,
                        label: l.addrFloor,
                        hint: l.addrFloorHint,
                        icon: Icons.layers_outlined,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _buildField(
                  ctrl: _obsCtrl,
                  label: l.addrObs,
                  hint: l.addrObsHint,
                  icon: Icons.notes_outlined,
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                // Postal code read-only display
                Consumer(builder: (_, ref, __) {
                  final postal = ref.watch(bookingProvider).postalCode;
                  final loc = ref.watch(bookingProvider).locationDescription;
                  if (postal.isEmpty) return const SizedBox.shrink();
                  return Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on, size: 18, color: Color(0xFF161616)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(postal, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                              if (loc.isNotEmpty)
                                Text(loc, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                            ],
                          ),
                        ),
                        TextButton(
                          onPressed: () => context.pop(),
                          child: Text(AppLocalizations.of(context).change, style: const TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: () {
              _save();
              context.push('/booking/summary');
            },
            nextEnabled: _isValid,
          ),
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController ctrl,
    required String label,
    required String hint,
    required IconData icon,
    bool required = false,
    int maxLines = 1,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextField(
      controller: ctrl,
      maxLines: maxLines,
      keyboardType: keyboardType,
      // Rebuild the page (not just this field) so the footer's "SEGUINTE"
      // re-evaluates _isValid as the user types.
      onChanged: (_) => setState(() {}),
      decoration: InputDecoration(
        labelText: required ? '$label *' : label,
        hintText: hint,
        prefixIcon: Icon(icon),
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
    );
  }
}
