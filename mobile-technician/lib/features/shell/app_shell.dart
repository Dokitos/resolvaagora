import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _tabs = [
    (path: '/schedule', label: 'Agenda', icon: Icons.calendar_today_outlined, activeIcon: Icons.calendar_today),
    (path: '/earnings', label: 'Ganhos',  icon: Icons.euro_outlined,           activeIcon: Icons.euro),
    (path: '/profile',  label: 'Perfil',  icon: Icons.person_outline,          activeIcon: Icons.person),
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
        indicatorColor: AppTheme.primaryLight,
        destinations: _tabs.map((tab) => NavigationDestination(
          icon: Icon(tab.icon),
          selectedIcon: Icon(tab.activeIcon, color: AppTheme.primary),
          label: tab.label,
        )).toList(),
      ),
    );
  }
}
