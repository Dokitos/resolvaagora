import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/services/technician_service.dart';
import '../../core/theme/app_theme.dart';

class UploadPhotosScreen extends ConsumerStatefulWidget {
  final String jobId;
  const UploadPhotosScreen({super.key, required this.jobId});

  @override
  ConsumerState<UploadPhotosScreen> createState() => _UploadPhotosScreenState();
}

class _UploadPhotosScreenState extends ConsumerState<UploadPhotosScreen> {
  final _picker = ImagePicker();
  final List<XFile> _selected = [];
  bool _uploading = false;

  Future<void> _pickImage(ImageSource source) async {
    final file = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1200);
    if (file != null) setState(() => _selected.add(file));
  }

  Future<void> _upload() async {
    if (_selected.isEmpty) return;
    setState(() => _uploading = true);
    try {
      // Faz upload de cada foto para o R2 e recolhe os URLs permanentes.
      final service = ref.read(technicianServiceProvider);
      final urls = <String>[];
      for (final f in _selected) {
        final url = await service.uploadImage(await f.readAsBytes(), f.name);
        if (url.isNotEmpty) urls.add(url);
      }
      if (urls.isEmpty) {
        throw Exception('Não foi possível carregar as fotos. Tenta novamente.');
      }
      await service.uploadProofPhotos(widget.jobId, urls);
      ref.invalidate(jobDetailProvider(widget.jobId));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${_selected.length} foto(s) enviada(s) com sucesso'),
            backgroundColor: AppTheme.success,
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppTheme.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Fotos de Prova'),
        leading: BackButton(onPressed: () => context.pop()),
      ),
      body: Column(
        children: [
          Expanded(
            child: _selected.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.add_a_photo_outlined, size: 64, color: Colors.grey[300]),
                        const SizedBox(height: 16),
                        const Text('Nenhuma foto selecionada',
                            style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                        const SizedBox(height: 6),
                        Text('Adicione pelo menos 2 fotos de prova do trabalho',
                            style: TextStyle(color: Colors.grey[500], fontSize: 14),
                            textAlign: TextAlign.center),
                      ],
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(16),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: _selected.length,
                    itemBuilder: (_, i) => Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.file(File(_selected[i].path), fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: () => setState(() => _selected.removeAt(i)),
                            child: Container(
                              decoration: const BoxDecoration(
                                color: AppTheme.danger,
                                shape: BoxShape.circle,
                              ),
                              padding: const EdgeInsets.all(4),
                              child: const Icon(Icons.close, color: Colors.white, size: 14),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: AppTheme.border)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _uploading ? null : () => _pickImage(ImageSource.camera),
                        icon: const Icon(Icons.camera_alt_outlined),
                        label: const Text('Câmara'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _uploading ? null : () => _pickImage(ImageSource.gallery),
                        icon: const Icon(Icons.photo_library_outlined),
                        label: const Text('Galeria'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: (_selected.isEmpty || _uploading) ? null : _upload,
                    child: _uploading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text('Enviar ${_selected.length} foto(s)', style: const TextStyle(fontSize: 15)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
