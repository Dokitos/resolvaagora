import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../core/network/api_client.dart';
import '../../core/services/auth_service.dart';
import '../../core/theme/app_theme.dart';

/// Ecrã para o técnico editar o próprio perfil (nome, contacto, email).
/// A foto de perfil fica disponível quando o armazenamento (R2) estiver ligado.
class EditTechnicianProfileScreen extends ConsumerStatefulWidget {
  const EditTechnicianProfileScreen({super.key});

  @override
  ConsumerState<EditTechnicianProfileScreen> createState() => _EditTechnicianProfileScreenState();
}

class _EditTechnicianProfileScreenState extends ConsumerState<EditTechnicianProfileScreen> {
  final _firstCtrl = TextEditingController();
  final _lastCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _firstCtrl.dispose();
    _lastCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final r = await ref.read(dioProvider).get('/technician/me');
      final t = r.data as Map<String, dynamic>;
      _firstCtrl.text = (t['firstName'] ?? '').toString();
      _lastCtrl.text = (t['lastName'] ?? '').toString();
      _phoneCtrl.text = (t['phone'] ?? '').toString();
      _emailCtrl.text = (t['email'] ?? '').toString();
    } catch (_) {
      // deixa campos vazios se falhar
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    final l = AppLocalizations.of(context);
    if (_firstCtrl.text.trim().isEmpty || _phoneCtrl.text.trim().isEmpty) {
      _toast(l.fillNameAndContact);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(dioProvider).patch('/technician/me', data: {
        'firstName': _firstCtrl.text.trim(),
        'lastName': _lastCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'email': _emailCtrl.text.trim(),
      });
      final fullName = '${_firstCtrl.text.trim()} ${_lastCtrl.text.trim()}'.trim();
      await ref.read(authProvider.notifier).updateStoredName(fullName);
      if (!mounted) return;
      _toast(l.profileUpdated);
      context.pop();
    } on DioException catch (e) {
      _toast(e.response?.data?['message']?.toString() ?? l.couldntSave);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toast(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  @override
  Widget build(BuildContext context) {
    final l = AppLocalizations.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(l.accountEditProfile)),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.brandBlack))
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                Center(
                  child: Stack(
                    children: [
                      const CircleAvatar(
                        radius: 44,
                        backgroundColor: AppTheme.brandYellowSoft,
                        child: Icon(Icons.person, size: 44, color: AppTheme.brandBlack),
                      ),
                      Positioned(
                        right: 0, bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(color: AppTheme.brandBlack, shape: BoxShape.circle),
                          child: const Icon(Icons.photo_camera, size: 16, color: AppTheme.brandYellow),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 6),
                Center(
                  child: Text(l.photoComingSoon,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                ),
                const SizedBox(height: 24),
                _field(_firstCtrl, l.fieldFirstName, Icons.person_outline),
                const SizedBox(height: 14),
                _field(_lastCtrl, l.fieldLastName, Icons.person_outline),
                const SizedBox(height: 14),
                _field(_phoneCtrl, l.fieldContact, Icons.phone_outlined, keyboard: TextInputType.phone),
                const SizedBox(height: 14),
                _field(_emailCtrl, l.fieldEmail, Icons.email_outlined, keyboard: TextInputType.emailAddress),
                const SizedBox(height: 28),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.brandYellow,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                    ),
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                        : Text(l.save, style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _field(TextEditingController c, String label, IconData icon,
          {TextInputType keyboard = TextInputType.text}) =>
      TextField(
        controller: c,
        keyboardType: keyboard,
        decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
      );
}
