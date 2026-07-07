double _toDouble(dynamic v, [double fallback = 0.0]) =>
    v == null ? fallback : double.parse(v.toString());

enum ServiceStatus {
  DRAFT, AWAITING_PAYMENT, PAID, IN_DISTRIBUTION,
  ASSIGNED, IN_TRANSIT, ARRIVED, IN_DIAGNOSIS,
  QUOTE_SENT, QUOTE_APPROVED, IN_EXECUTION,
  COMPLETED, CANCELLED, QUOTE_REJECTED, EXPIRED,
}

enum Specialty { ELECTRICITY, PLUMBING, HVAC, APPLIANCES }

class Address {
  final String id;
  final String street;
  final String number;
  final String? floor;
  final String postalCode;
  final String city;
  final String district;
  final double? latitude;
  final double? longitude;

  const Address({
    required this.id,
    required this.street,
    required this.number,
    this.floor,
    required this.postalCode,
    required this.city,
    required this.district,
    this.latitude,
    this.longitude,
  });

  factory Address.fromJson(Map<String, dynamic> j) => Address(
    id: j['id'] as String,
    street: j['street'] as String,
    number: j['number'] as String,
    floor: j['floor'] as String?,
    postalCode: j['postalCode'] as String,
    city: j['city'] as String,
    district: j['district'] as String,
    latitude: j['latitude'] != null ? _toDouble(j['latitude']) : null,
    longitude: j['longitude'] != null ? _toDouble(j['longitude']) : null,
  );
}

class ClientInfo {
  final String id;
  final String firstName;
  final String lastName;
  final String? phone;

  const ClientInfo({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.phone,
  });

  String get fullName => '$firstName $lastName';

  factory ClientInfo.fromJson(Map<String, dynamic> j) => ClientInfo(
    id: j['id'] as String,
    firstName: j['firstName'] as String,
    lastName: j['lastName'] as String,
    phone: j['phone'] as String?,
  );
}

class Quote {
  final String id;
  final String description;
  final double laborCost;
  final double materialsCost;
  final double vatRate;
  final double totalCost;
  final String status;
  final DateTime expiresAt;
  final DateTime createdAt;

  const Quote({
    required this.id,
    required this.description,
    required this.laborCost,
    required this.materialsCost,
    required this.vatRate,
    required this.totalCost,
    required this.status,
    required this.expiresAt,
    required this.createdAt,
  });

  factory Quote.fromJson(Map<String, dynamic> j) => Quote(
    id: j['id'] as String,
    description: j['description'] as String,
    laborCost: _toDouble(j['laborCost']),
    materialsCost: _toDouble(j['materialsCost']),
    vatRate: _toDouble(j['vatRate']),
    totalCost: _toDouble(j['totalCost']),
    status: j['status'] as String,
    expiresAt: DateTime.parse(j['expiresAt'] as String),
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
}

class ServicePhoto {
  final String id;
  final String type;
  final String url;
  final DateTime createdAt;

  const ServicePhoto({
    required this.id,
    required this.type,
    required this.url,
    required this.createdAt,
  });

  factory ServicePhoto.fromJson(Map<String, dynamic> j) => ServicePhoto(
    id: j['id'] as String,
    type: j['type'] as String,
    url: j['url'] as String,
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
}

class StatusHistoryEntry {
  final ServiceStatus newStatus;
  final String? notes;
  final DateTime createdAt;

  const StatusHistoryEntry({
    required this.newStatus,
    this.notes,
    required this.createdAt,
  });

  factory StatusHistoryEntry.fromJson(Map<String, dynamic> j) => StatusHistoryEntry(
        newStatus: ServiceStatus.values.firstWhere(
          (e) => e.name == j['newStatus'],
          orElse: () => ServiceStatus.DRAFT,
        ),
        notes: j['notes'] as String?,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class ReviewInfo {
  final int rating;
  final String? comment;
  final DateTime createdAt;

  const ReviewInfo({required this.rating, this.comment, required this.createdAt});

  factory ReviewInfo.fromJson(Map<String, dynamic> j) => ReviewInfo(
        rating: (j['rating'] as num).toInt(),
        comment: j['comment'] as String?,
        createdAt: DateTime.parse(j['createdAt'] as String),
      );
}

class ServiceRequest {
  final String id;
  final Specialty specialty;
  final String description;
  final ServiceStatus status;
  final double displacementFee;
  final bool isPriority;
  final DateTime? scheduledDate;
  final DateTime? assignedAt;
  final DateTime? completedAt;
  final DateTime createdAt;
  final ClientInfo? client;
  final Address? address;
  final Quote? quote;
  final List<ServicePhoto>? photos;
  final String? technicianName;
  final List<StatusHistoryEntry> statusHistory;
  final ReviewInfo? review;

  const ServiceRequest({
    required this.id,
    required this.specialty,
    required this.description,
    required this.status,
    required this.displacementFee,
    required this.isPriority,
    this.scheduledDate,
    this.assignedAt,
    this.completedAt,
    required this.createdAt,
    this.client,
    this.address,
    this.quote,
    this.photos,
    this.technicianName,
    this.statusHistory = const [],
    this.review,
  });

  List<ServicePhoto> get proofPhotos =>
      photos?.where((p) => p.type == 'PROOF').toList() ?? [];

  static String? _technicianName(dynamic t) {
    if (t is! Map<String, dynamic>) return null;
    final name = '${t['firstName'] ?? ''} ${t['lastName'] ?? ''}'.trim();
    return name.isEmpty ? null : name;
  }

  factory ServiceRequest.fromJson(Map<String, dynamic> j) => ServiceRequest(
    id: j['id'] as String,
    specialty: Specialty.values.firstWhere(
      (e) => e.name == j['specialty'],
      orElse: () => Specialty.ELECTRICITY,
    ),
    description: j['description'] as String,
    status: ServiceStatus.values.firstWhere(
      (e) => e.name == j['status'],
      orElse: () => ServiceStatus.ASSIGNED,
    ),
    displacementFee: _toDouble(j['displacementFee']),
    isPriority: j['isPriority'] as bool? ?? false,
    scheduledDate: j['scheduledDate'] != null ? DateTime.parse(j['scheduledDate'] as String) : null,
    assignedAt: j['assignedAt'] != null ? DateTime.parse(j['assignedAt'] as String) : null,
    completedAt: j['completedAt'] != null ? DateTime.parse(j['completedAt'] as String) : null,
    createdAt: DateTime.parse(j['createdAt'] as String),
    client: j['client'] != null ? ClientInfo.fromJson(j['client'] as Map<String, dynamic>) : null,
    address: j['address'] != null ? Address.fromJson(j['address'] as Map<String, dynamic>) : null,
    quote: j['quote'] != null ? Quote.fromJson(j['quote'] as Map<String, dynamic>) : null,
    photos: (j['photos'] as List<dynamic>?)
        ?.map((e) => ServicePhoto.fromJson(e as Map<String, dynamic>))
        .toList(),
    technicianName: _technicianName(j['technician']),
    statusHistory: (j['statusHistory'] as List<dynamic>?)
            ?.map((e) => StatusHistoryEntry.fromJson(e as Map<String, dynamic>))
            .toList() ??
        const [],
    review: j['review'] != null ? ReviewInfo.fromJson(j['review'] as Map<String, dynamic>) : null,
  );
}
