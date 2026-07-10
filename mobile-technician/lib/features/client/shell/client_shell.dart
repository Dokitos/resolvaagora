import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ClientShell extends ConsumerWidget {
  final Widget child;
  const ClientShell({super.key, required this.child});

  static const _tabs = [
    (path: '/client/home', icon: Icons.home_outlined, activeIcon: Icons.home),
    (path: '/client/services', icon: Icons.receipt_long_outlined, activeIcon: Icons.receipt_long),
    (path: '/client/account', icon: Icons.person_outline, activeIcon: Icons.person),
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
    const red = Color(0xFF161616);
    final l = AppLocalizations.of(context);
    final labels = [l.navHome, l.navMyServices, l.navAccount];

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: (i) => context.go(_tabs[i].path),
        backgroundColor: Colors.white,
        elevation: 0,
        indicatorColor: const Color(0xFFFFF7E0),
        destinations: [
          for (var i = 0; i < _tabs.length; i++)
            NavigationDestination(
              icon: Icon(_tabs[i].icon),
              selectedIcon: Icon(_tabs[i].activeIcon, color: red),
              label: labels[i],
            ),
        ],
      ),
    );
  }
}
