// Client-side models for the customer area (profile, addresses, notifications).

class ClientAddress {
  final String id;
  final String label;
  final String street;
  final String number;
  final String? floor;
  final String postalCode;
  final String city;
  final String district;
  final bool isDefault;

  const ClientAddress({
    required this.id,
    required this.label,
    required this.street,
    required this.number,
    this.floor,
    required this.postalCode,
    required this.city,
    required this.district,
    this.isDefault = false,
  });

  String get oneLine {
    final parts = <String>[
      street,
      if (number.isNotEmpty) number,
      if (floor != null && floor!.isNotEmpty) floor!,
    ];
    return '${parts.join(', ')} · $postalCode $city';
  }

  factory ClientAddress.fromJson(Map<String, dynamic> j) => ClientAddress(
        id: j['id'] as String,
        label: (j['label'] as String?) ?? 'Morada',
        street: (j['street'] as String?) ?? '',
        number: (j['number'] as String?) ?? '',
        floor: j['floor'] as String?,
        postalCode: (j['postalCode'] as String?) ?? '',
        city: (j['city'] as String?) ?? '',
        district: (j['district'] as String?) ?? '',
        isDefault: j['isDefault'] as bool? ?? false,
      );
}

class ClientProfile {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? nif;
  final String? photoUrl;
  final bool emailVerified;
  final List<ClientAddress> addresses;

  const ClientProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.nif,
    this.photoUrl,
    this.emailVerified = true,
    this.addresses = const [],
  });

  String get fullName {
    final name = '$firstName $lastName'.trim();
    return name.isEmpty ? 'Cliente' : name;
  }

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    final i = '$f$l'.toUpperCase();
    return i.isEmpty ? '?' : i;
  }

  factory ClientProfile.fromJson(Map<String, dynamic> j) => ClientProfile(
        id: j['id'] as String,
        email: (j['email'] as String?) ?? '',
        firstName: (j['firstName'] as String?) ?? '',
        lastName: (j['lastName'] as String?) ?? '',
        phone: j['phone'] as String?,
        nif: j['nif'] as String?,
        photoUrl: (j['photoUrl'] as String?)?.trim().isNotEmpty == true ? j['photoUrl'] as String : null,
        emailVerified: j['emailVerified'] as bool? ?? true,
        addresses: (j['addresses'] as List<dynamic>?)
                ?.map((e) => ClientAddress.fromJson(e as Map<String, dynamic>))
                .toList() ??
            const [],
      );
}

class ReferralInfo {
  final String? code;
  final int referredCount;
  final double rewardTotal;
  final double rewardAmount; // recompensa configurada por amigo
  final bool active;
  final String shareMessage; // mensagem de partilha (já com o código)

  const ReferralInfo({
    this.code,
    this.referredCount = 0,
    this.rewardTotal = 0,
    this.rewardAmount = 10,
    this.active = true,
    this.shareMessage = '',
  });

  factory ReferralInfo.fromJson(Map<String, dynamic> j) => ReferralInfo(
        code: j['code'] as String?,
        referredCount: (j['referredCount'] as num?)?.toInt() ?? 0,
        rewardTotal: (j['rewardTotal'] as num?)?.toDouble() ?? 0,
        rewardAmount: (j['rewardAmount'] as num?)?.toDouble() ?? 10,
        active: j['active'] as bool? ?? true,
        shareMessage: (j['shareMessage'] as String?) ?? '',
      );
}

class PromoResult {
  final bool valid;
  final double discount;
  final double finalAmount;
  final String? message;

  const PromoResult({required this.valid, this.discount = 0, this.finalAmount = 0, this.message});

  factory PromoResult.fromJson(Map<String, dynamic> j, double fallback) => PromoResult(
        valid: j['valid'] == true,
        discount: (j['discount'] as num?)?.toDouble() ?? 0,
        finalAmount: (j['finalAmount'] as num?)?.toDouble() ?? fallback,
        message: j['message'] as String?,
      );
}

class SubscriptionPlan {
  final String id;
  final String name;
  final String? description;
  final String? imageUrl;
  final List<String> benefits;
  final double yearlyPrice;
  final double displacementDiscountPct;
  final int freeVisitsCount;
  final bool priorityScheduling;

  const SubscriptionPlan({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    this.benefits = const [],
    required this.yearlyPrice,
    required this.displacementDiscountPct,
    required this.freeVisitsCount,
    required this.priorityScheduling,
  });

  static double _d(dynamic v) => v == null ? 0 : double.parse(v.toString());

  factory SubscriptionPlan.fromJson(Map<String, dynamic> j) => SubscriptionPlan(
        id: j['id'] as String,
        name: (j['name'] as String?) ?? 'Plano',
        description: (j['description'] as String?)?.trim().isNotEmpty == true ? j['description'] as String : null,
        imageUrl: (j['imageUrl'] as String?)?.trim().isNotEmpty == true ? j['imageUrl'] as String : null,
        benefits: (j['benefits'] as List?)?.map((e) => e.toString()).where((e) => e.trim().isNotEmpty).toList() ?? const [],
        yearlyPrice: _d(j['yearlyPrice']),
        displacementDiscountPct: _d(j['displacementDiscountPct']),
        freeVisitsCount: (j['freeVisitsCount'] as num?)?.toInt() ?? 0,
        priorityScheduling: j['priorityScheduling'] as bool? ?? false,
      );
}

class ClientSubscription {
  final String id;
  final String status;
  final DateTime? startsAt;
  final DateTime? expiresAt;
  final int freeVisitsUsed;
  final SubscriptionPlan? plan;

  const ClientSubscription({
    required this.id,
    required this.status,
    this.startsAt,
    this.expiresAt,
    this.freeVisitsUsed = 0,
    this.plan,
  });

  bool get isActive => status == 'ACTIVE';

  factory ClientSubscription.fromJson(Map<String, dynamic> j) => ClientSubscription(
        id: j['id'] as String,
        status: (j['status'] as String?) ?? 'ACTIVE',
        startsAt: j['startsAt'] != null ? DateTime.parse(j['startsAt'] as String) : null,
        expiresAt: j['expiresAt'] != null ? DateTime.parse(j['expiresAt'] as String) : null,
        freeVisitsUsed: (j['freeVisitsUsed'] as num?)?.toInt() ?? 0,
        plan: j['plan'] != null ? SubscriptionPlan.fromJson(j['plan'] as Map<String, dynamic>) : null,
      );
}

class SupportMessage {
  final String id;
  final String senderRole; // 'ADMIN' | 'CLIENT'
  final String body;
  final DateTime createdAt;

  const SupportMessage({
    required this.id,
    required this.senderRole,
    required this.body,
    required this.createdAt,
  });

  bool get isFromAdmin => senderRole == 'ADMIN';

  factory SupportMessage.fromJson(Map<String, dynamic> j) => SupportMessage(
        id: j['id'] as String,
        senderRole: (j['senderRole'] as String?) ?? 'ADMIN',
        body: (j['body'] as String?) ?? '',
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class ClientNotification {
  final String id;
  final String type;
  final String title;
  final String body;
  final DateTime? readAt;
  final DateTime createdAt;

  const ClientNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    this.readAt,
    required this.createdAt,
  });

  bool get isRead => readAt != null;

  factory ClientNotification.fromJson(Map<String, dynamic> j) => ClientNotification(
        id: j['id'] as String,
        type: (j['type'] as String?) ?? '',
        title: (j['title'] as String?) ?? '',
        body: (j['body'] as String?) ?? '',
        readAt: j['readAt'] != null ? DateTime.parse(j['readAt'] as String) : null,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}
