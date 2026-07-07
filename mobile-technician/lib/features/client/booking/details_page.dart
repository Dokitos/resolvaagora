import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'booking_provider.dart';
import 'widgets/booking_footer_bar.dart';

class BookingDetailsPage extends ConsumerStatefulWidget {
  const BookingDetailsPage({super.key});

  @override
  ConsumerState<BookingDetailsPage> createState() => _BookingDetailsPageState();
}

class _BookingDetailsPageState extends ConsumerState<BookingDetailsPage> {
  final _ctrl = TextEditingController();
  final List<Uint8List> _imageBytes = [];

  @override
  void initState() {
    super.initState();
    _ctrl.text = ref.read(bookingProvider).description;
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: const Color(0xFFCC0000),
        foregroundColor: Colors.white,
        title: const Text(''),
        leading: const SizedBox.shrink(),
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.share_outlined), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                const Text(
                  'Partilha os detalhes relevantes para a realização do serviço',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, height: 1.3),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _ctrl,
                  maxLines: 5,
                  maxLength: 300,
                  onChanged: (v) {
                    ref.read(bookingProvider.notifier).setDescription(v);
                    setState(() {}); // refresh footer's "SEGUINTE" enabled state
                  },
                  decoration: InputDecoration(
                    hintText: 'Ex: Preciso de instalar 2 tomadas duplas na sala...',
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
                const SizedBox(height: 24),
                GestureDetector(
                  onTap: _pickPhoto,
                  child: Container(
                    height: 120,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300, style: BorderStyle.solid, width: 2),
                      borderRadius: BorderRadius.circular(12),
                      color: Colors.grey[50],
                    ),
                    child: const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo_outlined, size: 36, color: Colors.grey),
                        SizedBox(height: 8),
                        Text('Adicione imagens ao seu pedido', style: TextStyle(fontWeight: FontWeight.w500)),
                        SizedBox(height: 4),
                        Text('Escolhe até 5 imagens', style: TextStyle(color: Colors.grey, fontSize: 12)),
                        SizedBox(height: 4),
                        Text('Carregar do seu dispositivo', style: TextStyle(color: Colors.black54, decoration: TextDecoration.underline, fontSize: 12)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                if (_imageBytes.isNotEmpty)
                  GridView.builder(
                    physics: const NeverScrollableScrollPhysics(),
                    shrinkWrap: true,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 3,
                      crossAxisSpacing: 8,
                      mainAxisSpacing: 8,
                    ),
                    itemCount: _imageBytes.length,
                    itemBuilder: (_, i) => Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.memory(_imageBytes[i], fit: BoxFit.cover),
                        ),
                        Positioned(
                          top: 4,
                          right: 4,
                          child: GestureDetector(
                            onTap: () => setState(() => _imageBytes.removeAt(i)),
                            child: Container(
                              decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                              child: const Icon(Icons.close, color: Colors.white, size: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          BookingFooterBar(
            onBack: () => context.pop(),
            onNext: () => context.push('/booking/location'),
            nextEnabled: _ctrl.text.trim().isNotEmpty,
          ),
        ],
      ),
    );
  }

  Future<void> _pickPhoto() async {
    final remaining = 5 - _imageBytes.length;
    if (remaining <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Podes adicionar no máximo 5 imagens')),
      );
      return;
    }
    try {
      final files = await ImagePicker().pickMultiImage();
      if (files.isEmpty) return;
      for (final f in files.take(remaining)) {
        _imageBytes.add(await f.readAsBytes());
      }
      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Não foi possível carregar as imagens')),
        );
      }
    }
  }
}
