import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/models/client_profile.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/pt_postal.dart';

class AddressFormPage extends ConsumerStatefulWidget {
  final ClientAddress? address;
  const AddressFormPage({super.key, this.address});

  @override
  ConsumerState<AddressFormPage> createState() => _AddressFormPageState();
}

class _AddressFormPageState extends ConsumerState<AddressFormPage> {
  late final TextEditingController _label;
  late final TextEditingController _street;
  late final TextEditingController _number;
  late final TextEditingController _floor;
  late final TextEditingController _postal;
  late final TextEditingController _city;
  late final TextEditingController _district;
  late bool _isDefault;
  bool _saving = false;

  bool get _isEdit => widget.address != null;

  @override
  void initState() {
    super.initState();
    final a = widget.address;
    _label = TextEditingController(text: a?.label ?? '');
    _street = TextEditingController(text: a?.street ?? '');
    _number = TextEditingController(text: a?.number ?? '');
    _floor = TextEditingController(text: a?.floor ?? '');
    _postal = TextEditingController(text: a?.postalCode ?? '');
    _city = TextEditingController(text: a?.city ?? '');
    _district = TextEditingController(text: a?.district ?? '');
    _isDefault = a?.isDefault ?? false;
  }

  @override
  void dispose() {
    for (final c in [_label, _street, _number, _floor, _postal, _city, _district]) {
      c.dispose();
    }
    super.dispose();
  }

  void _onPostalChanged(String v) {
    final parts = lookupPostalParts(v);
    if (parts != null) {
      setState(() {
        if (_city.text.isEmpty) _city.text = parts.city;
        if (_district.text.isEmpty) _district.text = parts.district;
      });
    }
  }

  bool get _valid =>
      _label.text.trim().isNotEmpty &&
      _street.text.trim().isNotEmpty &&
      _number.text.trim().isNotEmpty &&
      _postal.text.trim().isNotEmpty &&
      _city.text.trim().isNotEmpty &&
      _district.text.trim().isNotEmpty;

  Future<void> _save() async {
    if (!_valid) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Preenche todos os campos obrigatórios')),
      );
      return;
    }
    setState(() => _saving = true);
    final svc = ref.read(clientServiceProvider);
    try {
      if (_isEdit) {
        await svc.updateAddress(
          widget.address!.id,
          label: _label.text.trim(),
          street: _street.text.trim(),
          number: _number.text.trim(),
          floor: _floor.text.trim(),
          postalCode: _postal.text.trim(),
          city: _city.text.trim(),
          district: _district.text.trim(),
          isDefault: _isDefault,
        );
      } else {
        await svc.createAddress(
          label: _label.text.trim(),
          street: _street.text.trim(),
          number: _number.text.trim(),
          floor: _floor.text.trim().isEmpty ? null : _floor.text.trim(),
          postalCode: _postal.text.trim(),
          city: _city.text.trim(),
          district: _district.text.trim(),
          isDefault: _isDefault,
        );
      }
      ref.invalidate(clientAddressesProvider);
      ref.invalidate(clientProfileProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_isEdit ? 'Morada atualizada' : 'Morada adicionada')),
      );
      context.pop();
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível guardar a morada')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: Text(_isEdit ? 'Editar morada' : 'Nova morada'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _field(_label, 'Nome da morada *', 'Ex: Casa, Trabalho', Icons.bookmark_outline,
              onChanged: (_) => setState(() {})),
          const SizedBox(height: 16),
          _field(_street, 'Rua / Avenida *', 'Ex: Largo de São Brás', Icons.home_outlined,
              onChanged: (_) => setState(() {})),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _field(_number, 'Número *', 'Ex: 14', Icons.tag,
                    onChanged: (_) => setState(() {})),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _field(_floor, 'Andar', 'Ex: 1E', Icons.layers_outlined),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _field(_postal, 'Código postal *', '0000-000', Icons.markunread_mailbox_outlined,
              keyboard: TextInputType.text, onChanged: (v) { _onPostalChanged(v); setState(() {}); }),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _field(_city, 'Localidade *', 'Ex: Samouco', Icons.location_city_outlined,
                    onChanged: (_) => setState(() {})),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _field(_district, 'Distrito *', 'Ex: Alcochete', Icons.map_outlined,
                    onChanged: (_) => setState(() {})),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            value: _isDefault,
            onChanged: (v) => setState(() => _isDefault = v),
            activeColor: AppTheme.brandRed,
            contentPadding: EdgeInsets.zero,
            title: const Text('Definir como morada predefinida'),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 52,
            child: ElevatedButton(
              onPressed: _saving ? null : _save,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandRed,
                foregroundColor: Colors.white,
                disabledBackgroundColor: Colors.grey[300],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: _saving
                  ? const SizedBox(
                      height: 22, width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                  : Text(_isEdit ? 'GUARDAR' : 'ADICIONAR MORADA',
                      style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, String hint, IconData icon,
      {TextInputType? keyboard, ValueChanged<String>? onChanged}) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboard,
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: Icon(icon),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.brandRed, width: 2),
        ),
      ),
    );
  }
}
