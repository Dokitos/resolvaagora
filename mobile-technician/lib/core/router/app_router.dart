import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../services/auth_service.dart';
import '../../features/auth/login_screen.dart';
import '../../features/auth/register_screen.dart';
import '../../features/auth/forgot_password_screen.dart';
// Technician screens
import '../../features/schedule/schedule_screen.dart';
import '../../features/job/job_detail_screen.dart';
import '../../features/job/send_quote_screen.dart';
import '../../features/job/upload_photos_screen.dart';
import '../../features/earnings/earnings_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/profile/edit_technician_profile.dart';
import '../../features/profile/change_password_screen.dart';
import '../../features/profile/technician_support_page.dart';
import '../../features/profile/push_diagnostics_page.dart';
import '../../features/communications/communications_screen.dart';
import '../../features/messages/chat_screen.dart';
import '../../features/shell/app_shell.dart';
// Admin screens
import '../../features/admin/admin_shell.dart';
import '../../features/admin/admin_dashboard_screen.dart';
import '../../features/admin/admin_requests_screen.dart';
import '../../features/admin/admin_request_detail_screen.dart';
import '../../features/admin/admin_clients_screen.dart';
import '../../features/admin/admin_chat_screen.dart';
import '../../features/admin/admin_more_screen.dart';
import '../../features/admin/admin_send_notification_screen.dart';
import '../../features/admin/admin_financials_screen.dart';
import '../../features/admin/admin_analytics_screen.dart';
import '../../features/admin/admin_create_technician_screen.dart';
// Client screens
import '../models/client_profile.dart';
import '../../features/client/shell/client_shell.dart';
import '../../features/client/home/client_home_screen.dart';
import '../../features/client/home/client_services_screen.dart';
import '../../features/client/home/client_account_screen.dart';
import '../../features/client/services/service_request_detail_page.dart';
import '../../features/client/account/edit_profile_page.dart';
import '../../features/client/account/addresses_page.dart';
import '../../features/client/account/address_form_page.dart';
import '../../features/client/account/support_page.dart';
import '../../features/client/account/support_chat_page.dart';
import '../../features/client/account/subscription_page.dart';
import '../../features/client/account/referral_page.dart';
import '../../features/client/account/notifications_page.dart';
import '../../features/client/account/terms_page.dart';
import '../../features/client/booking/category_detail_page.dart';
import '../../features/client/booking/items_picker_page.dart';
import '../../features/client/booking/details_page.dart';
import '../../features/client/booking/location_page.dart';
import '../../features/client/booking/schedule_page.dart';
import '../../features/client/booking/contact_page.dart';
import '../../features/client/booking/otp_page.dart';
import '../../features/client/booking/address_details_page.dart';
import '../../features/client/booking/summary_page.dart';
import '../../features/client/booking/payment_page.dart';
import '../../features/client/booking/payment_confirm_page.dart';
import '../../features/client/booking/confirmation_page.dart';
import '../../data/services_data.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  // Build the router ONCE. Recreating it on every auth change tears down the
  // Navigator mid-transition and blanks the screen (e.g. on logout). Instead we
  // bump a Listenable so the SAME router re-evaluates its redirect.
  final refresh = ValueNotifier<int>(0);
  ref.listen(authProvider, (_, __) => refresh.value++);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: '/client/home',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider).valueOrNull;
      final isAuth = auth?.isAuthenticated ?? false;
      final isAdmin = auth?.isAdmin == true;
      final isTechnician = auth?.isTechnician == true;
      final loc = state.matchedLocation;

      final isAuthRoute = loc == '/login' || loc == '/register' || loc == '/forgot-password';
      // Routes any visitor can see without an account (browse the catalogue).
      final isPublic = isAuthRoute ||
          loc == '/client/home' ||
          loc.startsWith('/booking/category');

      if (isAuth) {
        // Each role stays inside its own area.
        if (isAdmin) {
          return loc.startsWith('/admin') ? null : '/admin/home';
        }
        if (isTechnician) {
          final techArea = loc.startsWith('/schedule') ||
              loc.startsWith('/earnings') ||
              loc.startsWith('/communications') ||
              loc.startsWith('/profile') ||
              loc.startsWith('/jobs');
          return techArea ? null : '/schedule';
        }
        // Client: ALLOWLIST — may only be in their own area (/client, /booking)
        // or on a public route. Anything else (technician /profile, /schedule,
        // /earnings, /jobs, admin, etc.) → back to the client home.
        final clientArea =
            loc.startsWith('/client') || loc.startsWith('/booking') || isPublic;
        return clientArea ? null : '/client/home';
      }

      // Unauthenticated: only public routes are allowed; everything else needs login.
      if (!isPublic) {
        return '/login?from=${Uri.encodeComponent(loc)}';
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (_, state) => LoginScreen(from: state.uri.queryParameters['from']),
      ),
      GoRoute(
        path: '/register',
        builder: (_, state) => RegisterScreen(from: state.uri.queryParameters['from']),
      ),
      GoRoute(
        path: '/forgot-password',
        builder: (_, __) => const ForgotPasswordScreen(),
      ),

      // ── Technician shell ─────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/schedule', builder: (_, __) => const ScheduleScreen()),
          GoRoute(path: '/earnings', builder: (_, __) => const EarningsScreen()),
          GoRoute(path: '/communications', builder: (_, __) => const CommunicationsScreen()),
          GoRoute(path: '/profile',  builder: (_, __) => const ProfileScreen()),
        ],
      ),
      // A conversa fica fora do shell (ecrã inteiro) e sob um prefixo que a
      // lista de permissões de cada papel já autoriza: /communications para o
      // técnico, /client para o cliente.
      GoRoute(
        path: '/communications/:id',
        builder: (_, state) => ChatScreen(serviceRequestId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/client/messages/:id',
        builder: (_, state) => ChatScreen(serviceRequestId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/profile/edit',
        builder: (_, __) => const EditTechnicianProfileScreen(),
      ),
      GoRoute(
        path: '/profile/change-password',
        builder: (_, __) => const ChangePasswordScreen(),
      ),
      GoRoute(
        path: '/profile/support',
        builder: (_, __) => const TechnicianSupportPage(),
      ),
      // O mesmo ecrã é servido em dois caminhos, um por área. O `redirect`
      // global só deixa cada papel dentro da sua (técnico: /profile, cliente:
      // /client), por isso uma rota fora delas seria inalcançável.
      GoRoute(
        path: '/profile/push-diagnostics',
        builder: (_, __) => const PushDiagnosticsPage(),
      ),
      GoRoute(
        path: '/jobs/:id',
        builder: (_, state) => JobDetailScreen(id: state.pathParameters['id']!),
        routes: [
          GoRoute(
            path: 'quote',
            builder: (_, state) => SendQuoteScreen(jobId: state.pathParameters['id']!),
          ),
          GoRoute(
            path: 'photos',
            builder: (_, state) => UploadPhotosScreen(jobId: state.pathParameters['id']!),
          ),
        ],
      ),

      // ── Admin shell ──────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => AdminShell(child: child),
        routes: [
          GoRoute(path: '/admin/home',     builder: (_, __) => const AdminDashboardScreen()),
          GoRoute(path: '/admin/requests', builder: (_, __) => const AdminRequestsScreen()),
          GoRoute(path: '/admin/clients',  builder: (_, __) => const AdminClientsScreen()),
          GoRoute(path: '/admin/more',     builder: (_, __) => const AdminMoreScreen()),
        ],
      ),
      GoRoute(
        path: '/admin/requests/:id',
        builder: (_, state) => AdminRequestDetailScreen(id: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/admin/notifications',
        builder: (_, __) => const AdminSendNotificationScreen(),
      ),
      GoRoute(
        path: '/admin/financials',
        builder: (_, __) => const AdminFinancialsScreen(),
      ),
      GoRoute(
        path: '/admin/analytics',
        builder: (_, __) => const AdminAnalyticsScreen(),
      ),
      GoRoute(
        path: '/admin/technicians/new',
        builder: (_, __) => const AdminCreateTechnicianScreen(),
      ),
      GoRoute(
        path: '/admin/chat',
        builder: (_, state) {
          final extra = (state.extra as Map?) ?? const {};
          return AdminChatScreen(
            clientUserId: extra['userId'] as String? ?? '',
            clientName: extra['name'] as String? ?? 'Cliente',
          );
        },
      ),

      // ── Client shell ─────────────────────────────────────────
      ShellRoute(
        builder: (_, __, child) => ClientShell(child: child),
        routes: [
          GoRoute(path: '/client/home',     builder: (_, __) => const ClientHomeScreen()),
          GoRoute(path: '/client/services', builder: (_, __) => const ClientServicesScreen()),
          GoRoute(path: '/client/account',  builder: (_, __) => const ClientAccountScreen()),
        ],
      ),

      // ── Client account & detail (full-screen, outside shell) ──
      GoRoute(
        path: '/client/services/:id',
        builder: (_, state) => ServiceRequestDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(path: '/client/account/edit', builder: (_, __) => const EditProfilePage()),
      GoRoute(path: '/client/account/addresses', builder: (_, __) => const AddressesPage()),
      GoRoute(
        path: '/client/account/addresses/new',
        builder: (_, state) => AddressFormPage(address: state.extra as ClientAddress?),
      ),
      GoRoute(path: '/client/account/notifications', builder: (_, __) => const NotificationsPage()),
      GoRoute(path: '/client/account/support', builder: (_, __) => const SupportPage()),
      GoRoute(
        path: '/client/account/push-diagnostics',
        builder: (_, __) => const PushDiagnosticsPage(),
      ),
      GoRoute(path: '/client/account/support/chat', builder: (_, __) => const SupportChatPage()),
      GoRoute(path: '/client/subscription', builder: (_, __) => const SubscriptionPage()),
      GoRoute(path: '/client/referral', builder: (_, __) => const ReferralPage()),
      GoRoute(path: '/client/account/terms', builder: (_, __) => const TermsPage()),

      // ── Booking flow (outside shell — full screen) ────────────
      GoRoute(
        path: '/booking/category/:id',
        // Guarda de existência: corre ANTES do builder, por isso um id
        // inexistente nunca chega a invocar `CategoryDetailPage` (que exige
        // uma categoria não-nula) — evita o crash do `firstWhere` sem
        // `orElse` e manda o utilizador de volta para a home.
        redirect: (_, state) {
          final id = state.pathParameters['id'];
          final exists = kServiceCategories.any((c) => c.id == id);
          return exists ? null : '/client/home';
        },
        builder: (_, state) {
          final id = state.pathParameters['id'];
          // Lookup manual (sem `firstWhere` nem depender do pacote
          // `collection`, que não está declarado no pubspec.yaml). O
          // `redirect` acima já garante que existe uma categoria com este
          // id, por isso este `!` é seguro aqui.
          ServiceCategory? cat;
          for (final c in kServiceCategories) {
            if (c.id == id) {
              cat = c;
              break;
            }
          }
          return CategoryDetailPage(category: cat!);
        },
      ),
      GoRoute(path: '/booking/items',      builder: (_, __) => const ItemsPickerPage()),
      GoRoute(path: '/booking/details',    builder: (_, __) => const BookingDetailsPage()),
      GoRoute(path: '/booking/location',   builder: (_, __) => const LocationPage()),
      GoRoute(path: '/booking/schedule',   builder: (_, __) => const SchedulePage()),
      GoRoute(path: '/booking/contact',    builder: (_, __) => const ContactPage()),
      GoRoute(path: '/booking/otp',        builder: (_, __) => const OtpPage()),
      GoRoute(path: '/booking/address',    builder: (_, __) => const AddressDetailsPage()),
      GoRoute(path: '/booking/summary',    builder: (_, __) => const SummaryPage()),
      GoRoute(path: '/booking/payment',    builder: (_, __) => const PaymentPage()),
      GoRoute(path: '/booking/payment-confirm', builder: (_, __) => const PaymentConfirmPage()),
      GoRoute(path: '/booking/confirmation', builder: (_, __) => const ConfirmationPage()),
    ],
  );
});
