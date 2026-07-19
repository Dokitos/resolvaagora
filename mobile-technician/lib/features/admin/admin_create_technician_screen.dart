import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/services/admin_service.dart';
import '../../core/theme/app_theme.dart';
import '../../core/models/service_request.dart';
import '../../core/utils/formatters.dart';

/// Distritos de Portugal (continente + ilhas) para cobertura do técnico.
const List<String> kPortugalDistricts = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra',
  'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real',
  'Viseu', 'Açores', 'Madeira',
];

class AdminCreateTechnicianScreen extends ConsumerStatefulWidget {
  const AdminCreateTechnicianScreen({super.key});

  @override
  ConsumerState<AdminCreateTechnicianScreen> createState() =>
      _AdminCreateTechnicianScreenState();
}

class _AdminCreateTechnicianScreenState
    extends ConsumerState<AdminCreateTechnicianScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _limit = TextEditingController();

  final Set<String> _specialties = {};
  final Set<String> _districts = {};
  bool _saving = false;

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _limit.dispose();
    super.dispose();
  }

  void _generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%';
    final rnd = Random.secure();
    final pwd = List.generate(12, (_) => chars[rnd.nextInt(chars.length)]).join();
    setState(() => _password.text = pwd);
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_specialties.isEmpty) {
      _snack('Seleciona pelo menos uma especialidade.', AppTheme.danger);
      return;
    }
    if (_districts.isEmpty) {
      _snack('Seleciona pelo menos um distrito de cobertura.', AppTheme.danger);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(adminServiceProvider).createTechnician(
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            email: _email.text.trim(),
            phone: _phone.text.trim(),
            password: _password.text,
            specialties: _specialties.toList(),
            coverageDistricts: _districts.toList(),
            dailyServiceLimit: int.tryParse(_limit.text.trim()),
          );
      if (!mounted) return;
      // Refresca a lista de técnicos onde quer que seja lida.
      ref.invalidate(adminTechniciansProvider);
      _snack('Técnico criado. As credenciais foram enviadas por email.', AppTheme.success);
      Navigator.of(context).pop();
    } catch (e) {
      if (!mounted) return;
      _snack('Erro ao criar técnico: $e', AppTheme.danger);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _snack(String msg, Color color) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(backgroundColor: color, content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Novo técnico'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _card(
              'Dados pessoais',
              Column(children: [
                _text(_firstName, 'Nome próprio', required: true),
                _text(_lastName, 'Apelido', required: true),
                _text(_email, 'Email', required: true, keyboard: TextInputType.emailAddress, email: true),
                _text(_phone, 'Telemóvel', required: true, keyboard: TextInputType.phone),
              ]),
            ),
            const SizedBox(height: 12),
            _card(
              'Palavra-passe',
              Column(children: [
                _text(_password, 'Password', required: true, minLen: 6),
                const SizedBox(height: 4),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: _generatePassword,
                    style: TextButton.styleFrom(foregroundColor: AppTheme.brandRed),
                    icon: const Icon(Icons.casino_outlined, size: 18),
                    label: const Text('Gerar password'),
                  ),
                ),
              ]),
            ),
            const SizedBox(height: 12),
            _card(
              'Especialidades',
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: Specialty.values.map((s) {
                  final key = s.name;
                  final label = specialtyLabels[key] ?? key;
                  final sel = _specialties.contains(key);
                  return FilterChip(
                    label: Text(label),
                    selected: sel,
                    selectedColor: AppTheme.brandYellowSoft,
                    checkmarkColor: AppTheme.brandRed,
                    onSelected: (v) => setState(() => v ? _specialties.add(key) : _specialties.remove(key)),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 12),
            _card(
              'Distritos de cobertura',
              Wrap(
                spacing: 8,
                runSpacing: 4,
                children: kPortugalDistricts.map((d) {
                  final sel = _districts.contains(d);
                  return FilterChip(
                    label: Text(d),
                    selected: sel,
                    selectedColor: AppTheme.brandYellowSoft,
                    checkmarkColor: AppTheme.brandRed,
                    onSelected: (v) => setState(() => v ? _districts.add(d) : _districts.remove(d)),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 12),
            _card(
              'Limite diário (opcional)',
              _text(_limit, 'Nº máximo de serviços por dia',
                  keyboard: TextInputType.number, inputFormatters: [FilteringTextInputFormatter.digitsOnly]),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _saving ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.brandRed,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              icon: _saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.person_add),
              label: Text(_saving ? 'A criar...' : 'Criar técnico',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 8),
            Center(
              child: Text('As credenciais de acesso são enviadas automaticamente por email ao técnico.',
                  textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _text(
    TextEditingController ctrl,
    String label, {
    bool required = false,
    bool email = false,
    int? minLen,
    TextInputType? keyboard,
    List<TextInputFormatter>? inputFormatters,
  }) =>
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: TextFormField(
          controller: ctrl,
          keyboardType: keyboard,
          inputFormatters: inputFormatters,
          decoration: InputDecoration(labelText: required ? '$label *' : label, border: const OutlineInputBorder()),
          validator: (v) {
            final val = (v ?? '').trim();
            if (required && val.isEmpty) return 'Obrigatório';
            if (email && val.isNotEmpty && !val.contains('@')) return 'Email inválido';
            if (minLen != null && val.isNotEmpty && val.length < minLen) return 'Mínimo $minLen caracteres';
            return null;
          },
        ),
      );

  Widget _card(String title, Widget child) => Container(
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          child,
        ]),
      );
}
