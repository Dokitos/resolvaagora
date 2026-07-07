import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

class AdminShell extends ConsumerWidget {
  final Widget child;
  const AdminShell({super.key, required this.child});

  static const _tabs = [
    (path: '/admin/home', label: 'Resumo', icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard),
    (path: '/admin/requests', label: 'Pedidos', icon: Icons.assignment_outlined, activeIcon: Icons.assignment),
    (path: '/admin/clients', label: 'Clientes', icon: Icons.chat_outlined, activeIcon: Icons.chat),
    (path: '/admin/more', label: 'Mais', icon: Icons.grid_view_outlined, activeIcon: Icons.grid_view),
  ];

  int _indexOf(String location) {
    for (var i = 0; i < _tabs.length; i++) {
      if (location.startsWith(_tabs[i].path)) return i;
    }
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final currentIndex = _indexOf(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (i) => context.go(_tabs[i].path),
        backgroundColor: Colors.white,
        elevation: 0,
        indicatorColor: AppTheme.brandRedLight,
        destinations: _tabs
            .map((tab) => NavigationDestination(
                  icon: Icon(tab.icon),
                  selectedIcon: Icon(tab.activeIcon, color: AppTheme.brandRed),
                  label: tab.label,
                ))
            .toList(),
      ),
    );
  }
}
