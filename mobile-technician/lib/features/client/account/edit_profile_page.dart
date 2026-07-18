import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/models/client_profile.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';

class EditProfilePage extends ConsumerStatefulWidget {
  const EditProfilePage({super.key});

  @override
  ConsumerState<EditProfilePage> createState() => _EditProfilePageState();
}

class _EditProfilePageState extends ConsumerState<EditProfilePage> {
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _phone = TextEditingController();
  final _nif = TextEditingController();
  bool _initialised = false;
  bool _saving = false;
  bool _uploadingPhoto = false;
  String? _photoUrl;

  void _fill(ClientProfile p) {
    if (_initialised) return;
    _firstName.text = p.firstName;
    _lastName.text = p.lastName;
    _phone.text = p.phone ?? '';
    _nif.text = p.nif ?? '';
    _photoUrl = p.photoUrl;
    _initialised = true;
  }

  Future<void> _pickPhoto() async {
    try {
      final picked = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 1024,
        imageQuality: 85,
      );
      if (picked == null) return;
      setState(() => _uploadingPhoto = true);
      final bytes = await picked.readAsBytes();
      final url = await ref.read(clientServiceProvider).uploadPhoto(bytes, picked.name);
      ref.invalidate(clientProfileProvider);
      if (!mounted) return;
      setState(() => _photoUrl = url);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil atualizado com sucesso')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível guardar as alterações')),
      );
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  @override
  void dispose() {
    _firstName.dispose();
    _lastName.dispose();
    _phone.dispose();
    _nif.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_firstName.text.trim().isEmpty || _lastName.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nome e apelido são obrigatórios')),
      );
      return;
    }
    setState(() => _saving = true);
    try {
      final updated = await ref.read(clientServiceProvider).updateProfile(
            firstName: _firstName.text.trim(),
            lastName: _lastName.text.trim(),
            phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
            nif: _nif.text.trim().isEmpty ? null : _nif.text.trim(),
          );
      await ref.read(authProvider.notifier).updateStoredName(updated.fullName);
      ref.invalidate(clientProfileProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Perfil atualizado com sucesso')),
      );
      context.pop();
    } catch (_) {
      if (!mounted) return;
      setState(() => _saving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Não foi possível guardar as alterações')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(clientProfileProvider);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Editar perfil'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Não foi possível carregar o perfil', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () => ref.invalidate(clientProfileProvider),
                  child: const Text('Tentar novamente'),
                ),
              ],
            ),
          ),
        ),
        data: (p) {
          _fill(p);
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Center(
                child: GestureDetector(
                  onTap: _uploadingPhoto ? null : _pickPhoto,
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor: AppTheme.brandRed.withOpacity(0.1),
                        backgroundImage: (_photoUrl != null && _photoUrl!.isNotEmpty)
                            ? NetworkImage(_photoUrl!)
                            : null,
                        child: _uploadingPhoto
                            ? const CircularProgressIndicator(strokeWidth: 2, color: AppTheme.brandRed)
                            : ((_photoUrl == null || _photoUrl!.isEmpty)
                                ? Text(p.initials,
                                    style: const TextStyle(color: AppTheme.brandRed, fontSize: 28, fontWeight: FontWeight.bold))
                                : null),
                      ),
                      Positioned(
                        right: 0, bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: const BoxDecoration(color: AppTheme.brandRed, shape: BoxShape.circle),
                          child: const Icon(Icons.photo_camera, size: 16, color: Colors.white),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _label('Email'),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    Icon(Icons.mail_outline, size: 18, color: Colors.grey[500]),
                    const SizedBox(width: 10),
                    Expanded(child: Text(p.email, style: TextStyle(color: Colors.grey[700]))),
                    Icon(Icons.lock_outline, size: 16, color: Colors.grey[400]),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              _label('Nome'),
              _field(_firstName, 'O teu nome', Icons.person_outline),
              const SizedBox(height: 16),
              _label('Apelido'),
              _field(_lastName, 'O teu apelido', Icons.person_outline),
              const SizedBox(height: 16),
              _label('Telefone'),
              _field(_phone, '9XX XXX XXX', Icons.phone_outlined,
                  keyboard: TextInputType.phone,
                  formatters: [FilteringTextInputFormatter.digitsOnly]),
              const SizedBox(height: 16),
              _label('NIF'),
              _field(_nif, 'Número de contribuinte', Icons.badge_outlined,
                  keyboard: TextInputType.number,
                  formatters: [FilteringTextInputFormatter.digitsOnly]),
              const SizedBox(height: 32),
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
                      : const Text('GUARDAR ALTERAÇÕES',
                          style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
      );

  Widget _field(TextEditingController ctrl, String hint, IconData icon,
      {TextInputType? keyboard, List<TextInputFormatter>? formatters}) {
    return TextField(
      controller: ctrl,
      keyboardType: keyboard,
      inputFormatters: formatters,
      decoration: InputDecoration(
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
