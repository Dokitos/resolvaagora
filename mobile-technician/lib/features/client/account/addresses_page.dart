import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/models/client_profile.dart';
import '../../../core/services/client_service.dart';
import '../../../core/theme/app_theme.dart';

class AddressesPage extends ConsumerWidget {
  const AddressesPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final addresses = ref.watch(clientAddressesProvider);

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('As minhas moradas'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/client/account/addresses/new'),
        backgroundColor: AppTheme.brandRed,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Adicionar'),
      ),
      body: RefreshIndicator(
        color: AppTheme.brandRed,
        onRefresh: () async => ref.invalidate(clientAddressesProvider),
        child: addresses.when(
          loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
          error: (e, _) => _error(ref),
          data: (list) {
            if (list.isEmpty) return const _Empty();
            return ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
              itemCount: list.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (_, i) => _AddressCard(address: list[i]),
            );
          },
        ),
      ),
    );
  }

  Widget _error(WidgetRef ref) => ListView(
        children: [
          const SizedBox(height: 120),
          const Icon(Icons.cloud_off_outlined, size: 56, color: Colors.grey),
          const SizedBox(height: 12),
          const Center(child: Text('Não foi possível carregar as moradas', style: TextStyle(color: Colors.grey))),
          const SizedBox(height: 16),
          Center(
            child: OutlinedButton(
              onPressed: () => ref.invalidate(clientAddressesProvider),
              child: const Text('Tentar novamente'),
            ),
          ),
        ],
      );
}

class _AddressCard extends ConsumerWidget {
  final ClientAddress address;
  const _AddressCard({required this.address});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.location_on_outlined, color: AppTheme.brandRed),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(address.label,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    ),
                    if (address.isDefault) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.brandRedLight,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('Predefinida',
                            style: TextStyle(color: AppTheme.brandRed, fontSize: 11, fontWeight: FontWeight.w600)),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 4),
                Text(address.oneLine, style: TextStyle(color: Colors.grey[600], fontSize: 13, height: 1.3)),
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.grey),
            onSelected: (v) => _onAction(context, ref, v),
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'edit', child: Text('Editar')),
              if (!address.isDefault)
                const PopupMenuItem(value: 'default', child: Text('Tornar predefinida')),
              const PopupMenuItem(value: 'delete', child: Text('Eliminar', style: TextStyle(color: AppTheme.brandRed))),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _onAction(BuildContext context, WidgetRef ref, String action) async {
    final svc = ref.read(clientServiceProvider);
    switch (action) {
      case 'edit':
        context.push('/client/account/addresses/new', extra: address);
        break;
      case 'default':
        try {
          await svc.updateAddress(address.id, isDefault: true);
          ref.invalidate(clientAddressesProvider);
          ref.invalidate(clientProfileProvider);
        } catch (_) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Não foi possível atualizar')),
            );
          }
        }
        break;
      case 'delete':
        final ok = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: const Text('Eliminar morada?'),
            content: Text('Eliminar "${address.label}"?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Não')),
              TextButton(
                onPressed: () => Navigator.pop(context, true),
                child: const Text('Eliminar', style: TextStyle(color: AppTheme.brandRed)),
              ),
            ],
          ),
        );
        if (ok != true) return;
        try {
          await svc.deleteAddress(address.id);
          ref.invalidate(clientAddressesProvider);
          ref.invalidate(clientProfileProvider);
        } catch (_) {
          if (context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Não foi possível eliminar')),
            );
          }
        }
        break;
    }
  }
}

class _Empty extends StatelessWidget {
  const _Empty();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const SizedBox(height: 120),
        const Icon(Icons.location_off_outlined, size: 64, color: Colors.grey),
        const SizedBox(height: 16),
        const Center(
          child: Text('Ainda não tens moradas guardadas',
              style: TextStyle(fontSize: 16, color: Colors.grey, fontWeight: FontWeight.w600)),
        ),
        const SizedBox(height: 8),
        const Center(
          child: Text('Adiciona uma morada para agilizar os teus pedidos',
              style: TextStyle(color: Colors.grey), textAlign: TextAlign.center),
        ),
      ],
    );
  }
}
