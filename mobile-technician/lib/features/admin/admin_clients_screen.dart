import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/services/admin_service.dart';
import '../../core/theme/app_theme.dart';

class AdminClientsScreen extends ConsumerStatefulWidget {
  const AdminClientsScreen({super.key});

  @override
  ConsumerState<AdminClientsScreen> createState() => _AdminClientsScreenState();
}

class _AdminClientsScreenState extends ConsumerState<AdminClientsScreen> {
  String _search = '';

  @override
  Widget build(BuildContext context) {
    final clients = ref.watch(adminClientsProvider(_search.isEmpty ? null : _search));

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(title: const Text('Clientes & Suporte'), backgroundColor: AppTheme.brandRed, foregroundColor: Colors.white, elevation: 0),
      body: Column(children: [
        Padding(
          padding: const EdgeInsets.all(12),
          child: TextField(
            onChanged: (v) => setState(() => _search = v),
            decoration: InputDecoration(
              hintText: 'Procurar cliente...',
              prefixIcon: const Icon(Icons.search),
              filled: true, fillColor: Colors.white,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
            ),
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            color: AppTheme.brandRed,
            onRefresh: () async => ref.invalidate(adminClientsProvider(_search.isEmpty ? null : _search)),
            child: clients.when(
              loading: () => const Center(child: CircularProgressIndicator(color: AppTheme.brandRed)),
              error: (e, _) => const Center(child: Text('Erro ao carregar', style: TextStyle(color: Colors.grey))),
              data: (list) {
                if (list.isEmpty) return ListView(children: const [SizedBox(height: 120), Center(child: Text('Sem clientes', style: TextStyle(color: Colors.grey)))]);
                return ListView.separated(
                  padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                  itemCount: list.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final c = list[i];
                    final user = (c['user'] as Map?) ?? {};
                    final name = '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}';
                    final userId = user['id'] as String?;
                    return ListTile(
                      tileColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                      leading: CircleAvatar(backgroundColor: AppTheme.brandRedLight, child: const Icon(Icons.person, color: AppTheme.brandRed)),
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                      subtitle: Text('${user['email'] ?? ''} · ${(c['_count'] as Map?)?['serviceRequests'] ?? 0} pedido(s)', style: const TextStyle(fontSize: 12)),
                      trailing: const Icon(Icons.chat_bubble_outline, color: AppTheme.brandBlue),
                      onTap: userId == null ? null : () => context.push('/admin/chat', extra: {'userId': userId, 'name': name}),
                    );
                  },
                );
              },
            ),
          ),
        ),
      ]),
    );
  }
}
