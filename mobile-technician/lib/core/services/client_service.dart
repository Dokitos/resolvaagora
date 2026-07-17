import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../models/client_profile.dart';
import '../models/service_request.dart';
import 'settings_service.dart';

/// Customer-facing API layer. Mirrors [TechnicianService] but for the CLIENT role.
class ClientService {
  final Dio _dio;
  ClientService(this._dio);

  // ── Profile ───────────────────────────────────────────────────────────────
  Future<ClientProfile> getProfile() async {
    final r = await _dio.get('/clients/me');
    return ClientProfile.fromJson(r.data as Map<String, dynamic>);
  }

  Future<ClientProfile> updateProfile({
    String? firstName,
    String? lastName,
    String? phone,
    String? nif,
  }) async {
    final r = await _dio.patch('/clients/me', data: {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
      if (phone != null) 'phone': phone,
      if (nif != null) 'nif': nif,
    });
    return ClientProfile.fromJson(r.data as Map<String, dynamic>);
  }

  // ── Addresses ───────────────────────────────────────────────────────────────
  Future<List<ClientAddress>> listAddresses() async {
    final r = await _dio.get('/clients/me/addresses');
    return (r.data as List).map((e) => ClientAddress.fromJson(e)).toList();
  }

  Future<ClientAddress> createAddress({
    required String label,
    required String street,
    required String number,
    String? floor,
    required String postalCode,
    required String city,
    required String district,
    bool isDefault = false,
  }) async {
    final r = await _dio.post('/clients/me/addresses', data: {
      'label': label,
      'street': street,
      'number': number,
      if (floor != null && floor.isNotEmpty) 'floor': floor,
      'postalCode': postalCode,
      'city': city,
      'district': district,
      'isDefault': isDefault,
    });
    return ClientAddress.fromJson(r.data as Map<String, dynamic>);
  }

  Future<ClientAddress> updateAddress(
    String id, {
    String? label,
    String? street,
    String? number,
    String? floor,
    String? postalCode,
    String? city,
    String? district,
    bool? isDefault,
  }) async {
    final r = await _dio.patch('/clients/me/addresses/$id', data: {
      if (label != null) 'label': label,
      if (street != null) 'street': street,
      if (number != null) 'number': number,
      if (floor != null) 'floor': floor,
      if (postalCode != null) 'postalCode': postalCode,
      if (city != null) 'city': city,
      if (district != null) 'district': district,
      if (isDefault != null) 'isDefault': isDefault,
    });
    return ClientAddress.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> deleteAddress(String id) async {
    await _dio.delete('/clients/me/addresses/$id');
  }

  // ── Service requests ─────────────────────────────────────────────────────────
  Future<List<ServiceRequest>> listServiceRequests() async {
    final r = await _dio.get('/service-requests');
    return (r.data as List).map((e) => ServiceRequest.fromJson(e)).toList();
  }

  Future<ServiceRequest> getServiceRequest(String id) async {
    final r = await _dio.get('/service-requests/$id');
    return ServiceRequest.fromJson(r.data as Map<String, dynamic>);
  }

  Future<ServiceRequest> createServiceRequest({
    required String addressId,
    required String specialty,
    required String description,
    DateTime? scheduledDate,
    String? promoCode,
  }) async {
    final r = await _dio.post('/service-requests', data: {
      'addressId': addressId,
      'specialty': specialty,
      'description': description,
      if (scheduledDate != null) 'scheduledDate': scheduledDate.toUtc().toIso8601String(),
      if (promoCode != null && promoCode.isNotEmpty) 'promoCode': promoCode,
    });
    return ServiceRequest.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> cancelServiceRequest(String id) async {
    await _dio.delete('/service-requests/$id');
  }

  /// Paga o pedido completo (itens + deslocação). Devolve o mapa da resposta:
  /// { simulated, total, clientSecret?, publishableKey?, paymentIntentId? }.
  Future<Map<String, dynamic>> payOrder(String id, double itemsTotal) async {
    final r = await _dio.post('/service-requests/$id/pay', data: {'itemsTotal': itemsTotal});
    return Map<String, dynamic>.from(r.data as Map);
  }

  /// Avalia um serviço concluído (1–5 estrelas + comentário opcional).
  Future<void> submitReview(String id, int rating, {String? comment}) async {
    await _dio.post('/service-requests/$id/review', data: {
      'rating': rating,
      if (comment != null && comment.isNotEmpty) 'comment': comment,
    });
  }

  /// Envia o recibo do pedido para o email do cliente. Devolve o email usado.
  Future<String> emailReceipt(String id) async {
    final r = await _dio.post('/service-requests/$id/receipt/email');
    return (r.data as Map<String, dynamic>)['email'] as String? ?? '';
  }

  // ── Notifications ───────────────────────────────────────────────────────────
  Future<List<ClientNotification>> listNotifications() async {
    final r = await _dio.get('/notifications');
    return (r.data as List).map((e) => ClientNotification.fromJson(e)).toList();
  }

  Future<int> unreadCount() async {
    final r = await _dio.get('/notifications/unread-count');
    return (r.data as Map<String, dynamic>)['count'] as int? ?? 0;
  }

  Future<void> markRead(String id) async {
    await _dio.patch('/notifications/$id/read');
  }

  Future<void> markAllRead() async {
    await _dio.patch('/notifications/read-all');
  }

  // ── Support chat ────────────────────────────────────────────────────────────
  Future<List<SupportMessage>> getSupportMessages() async {
    final r = await _dio.get('/support/messages');
    return (r.data as List).map((e) => SupportMessage.fromJson(e)).toList();
  }

  Future<SupportMessage> sendSupportMessage(String body) async {
    final r = await _dio.post('/support/messages', data: {'body': body});
    return SupportMessage.fromJson(r.data as Map<String, dynamic>);
  }

  Future<int> supportUnreadCount() async {
    final r = await _dio.get('/support/unread-count');
    return (r.data as Map<String, dynamic>)['count'] as int? ?? 0;
  }

  // ── Subscriptions ───────────────────────────────────────────────────────────
  Future<List<SubscriptionPlan>> getPlans() async {
    final r = await _dio.get('/subscriptions/plans');
    return (r.data as List).map((e) => SubscriptionPlan.fromJson(e)).toList();
  }

  Future<ClientSubscription?> getMySubscription() async {
    final r = await _dio.get('/subscriptions/me');
    if (r.data == null || r.data == '') return null;
    return ClientSubscription.fromJson(r.data as Map<String, dynamic>);
  }

  Future<void> subscribe(String planId) async {
    await _dio.post('/subscriptions', data: {'planId': planId});
  }

  Future<void> cancelSubscription() async {
    await _dio.delete('/subscriptions/me');
  }

  // ── Promo & referrals ───────────────────────────────────────────────────────
  Future<PromoResult> validatePromo(String code, double amount) async {
    final r = await _dio.post('/promo/validate', data: {'code': code, 'amount': amount});
    return PromoResult.fromJson(r.data as Map<String, dynamic>, amount);
  }

  Future<ReferralInfo> getReferralInfo() async {
    final r = await _dio.get('/referrals/me');
    return ReferralInfo.fromJson(r.data as Map<String, dynamic>);
  }

  /// Reenvia o email de confirmação de conta.
  Future<void> resendVerificationEmail() async {
    await _dio.post('/auth/resend-verification');
  }

  /// Envia um código OTP por SMS para o número indicado.
  Future<void> sendOtp(String phone) async {
    await _dio.post('/otp/send', data: {'phone': phone});
  }

  /// Verifica o código OTP. Devolve true se válido.
  Future<bool> verifyOtp(String code) async {
    final r = await _dio.post('/otp/verify', data: {'code': code});
    return (r.data as Map)['valid'] == true;
  }
}

final clientServiceProvider = Provider<ClientService>((ref) {
  return ClientService(ref.read(dioProvider));
});

final clientProfileProvider = FutureProvider<ClientProfile>((ref) {
  return ref.read(clientServiceProvider).getProfile();
});

final clientAddressesProvider = FutureProvider<List<ClientAddress>>((ref) {
  return ref.read(clientServiceProvider).listAddresses();
});

final clientServiceRequestsProvider = FutureProvider<List<ServiceRequest>>((ref) {
  return ref.read(clientServiceProvider).listServiceRequests();
});

final serviceRequestDetailProvider =
    FutureProvider.family<ServiceRequest, String>((ref, id) {
  return ref.read(clientServiceProvider).getServiceRequest(id);
});

final notificationsProvider = FutureProvider<List<ClientNotification>>((ref) {
  return ref.read(clientServiceProvider).listNotifications();
});

final unreadCountProvider = FutureProvider<int>((ref) {
  return ref.read(clientServiceProvider).unreadCount();
});

final subscriptionPlansProvider = FutureProvider<List<SubscriptionPlan>>((ref) {
  return ref.read(clientServiceProvider).getPlans();
});

final mySubscriptionProvider = FutureProvider<ClientSubscription?>((ref) {
  return ref.read(clientServiceProvider).getMySubscription();
});

final referralInfoProvider = FutureProvider<ReferralInfo>((ref) {
  return ref.read(clientServiceProvider).getReferralInfo();
});

/// Banner/slide configurável da página inicial.
class HomeBanner {
  final String id;
  final String imageUrl;
  final String? title;
  final String? subtitle;
  final String? actionType; // 'category' | 'subscription' | 'url'
  final String? actionTarget;

  const HomeBanner({
    required this.id,
    required this.imageUrl,
    this.title,
    this.subtitle,
    this.actionType,
    this.actionTarget,
  });

  factory HomeBanner.fromJson(Map<String, dynamic> j) => HomeBanner(
        id: j['id'] as String,
        imageUrl: (j['imageUrl'] as String?) ?? '',
        title: j['title'] as String?,
        subtitle: j['subtitle'] as String?,
        actionType: j['actionType'] as String?,
        actionTarget: j['actionTarget'] as String?,
      );
}

/// Banners ativos da página inicial (público). Lista vazia em caso de falha.
final homeBannersProvider = FutureProvider<List<HomeBanner>>((ref) async {
  try {
    final dio = ref.read(dioProvider);
    final r = await dio.get('/banners');
    return (r.data as List)
        .map((e) => HomeBanner.fromJson(Map<String, dynamic>.from(e as Map)))
        .where((b) => b.imageUrl.isNotEmpty)
        .toList();
  } catch (_) {
    return const [];
  }
});

/// Taxa de deslocação efetiva para o cliente atual: parte da taxa base
/// (definições) e aplica o desconto da subscrição ativa, tal como o backend
/// faz ao criar o pedido. Assim o total mostrado bate certo com o cobrado.
final effectiveDisplacementProvider = FutureProvider<double>((ref) async {
  final settings = await ref.watch(appSettingsProvider.future);
  final base = settings.displacementFee;
  try {
    final sub = await ref.watch(mySubscriptionProvider.future);
    final plan = sub?.plan;
    if (sub != null && sub.isActive && plan != null) {
      final pct = plan.displacementDiscountPct.clamp(0, 100) / 100.0;
      return double.parse((base * (1 - pct)).toStringAsFixed(2));
    }
  } catch (_) {
    // Sem subscrição / falha a obter → usa a taxa base.
  }
  return base;
});
