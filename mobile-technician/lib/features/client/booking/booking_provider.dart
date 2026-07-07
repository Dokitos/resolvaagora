import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../data/services_data.dart';
import '../../../core/models/service_request.dart';
import '../../../core/services/client_service.dart';

class BookingItem {
  final ServiceItem item;
  final int qty;
  const BookingItem({required this.item, required this.qty});

  BookingItem copyWith({int? qty}) =>
      BookingItem(item: item, qty: qty ?? this.qty);
}

class BookingState {
  final ServiceCategory? category;
  final ServiceSubcategory? subcategory;
  final List<BookingItem> items;
  final String description;
  final List<String> photoUrls;
  // Location
  final String postalCode;
  final String locationDescription; // e.g. "Samouco, Alcochete"
  // Schedule
  final DateTime? scheduledDate;
  final String? scheduledSlot; // "13:00-14:00"
  // Contact
  final String phone;
  final bool phoneVerified;
  // Address details
  final String street;
  final String doorNumber;
  final String floor;
  final String observations;
  // Payment
  final String paymentMethod; // 'mbway' | 'card' | 'multibanco'
  final String promoCode;
  final String nif;
  final bool useDifferentBillingAddress;

  const BookingState({
    this.category,
    this.subcategory,
    this.items = const [],
    this.description = '',
    this.photoUrls = const [],
    this.postalCode = '',
    this.locationDescription = '',
    this.scheduledDate,
    this.scheduledSlot,
    this.phone = '',
    this.phoneVerified = false,
    this.street = '',
    this.doorNumber = '',
    this.floor = '',
    this.observations = '',
    this.paymentMethod = 'mbway',
    this.promoCode = '',
    this.nif = '',
    this.useDifferentBillingAddress = false,
  });

  double get total =>
      items.fold(0.0, (sum, bi) => sum + bi.item.price * bi.qty);

  bool get hasItems => items.any((bi) => bi.qty > 0);

  List<BookingItem> get selectedItems => items.where((bi) => bi.qty > 0).toList();

  BookingState copyWith({
    ServiceCategory? category,
    ServiceSubcategory? subcategory,
    List<BookingItem>? items,
    String? description,
    List<String>? photoUrls,
    String? postalCode,
    String? locationDescription,
    DateTime? scheduledDate,
    String? scheduledSlot,
    String? phone,
    bool? phoneVerified,
    String? street,
    String? doorNumber,
    String? floor,
    String? observations,
    String? paymentMethod,
    String? promoCode,
    String? nif,
    bool? useDifferentBillingAddress,
  }) =>
      BookingState(
        category: category ?? this.category,
        subcategory: subcategory ?? this.subcategory,
        items: items ?? this.items,
        description: description ?? this.description,
        photoUrls: photoUrls ?? this.photoUrls,
        postalCode: postalCode ?? this.postalCode,
        locationDescription: locationDescription ?? this.locationDescription,
        scheduledDate: scheduledDate ?? this.scheduledDate,
        scheduledSlot: scheduledSlot ?? this.scheduledSlot,
        phone: phone ?? this.phone,
        phoneVerified: phoneVerified ?? this.phoneVerified,
        street: street ?? this.street,
        doorNumber: doorNumber ?? this.doorNumber,
        floor: floor ?? this.floor,
        observations: observations ?? this.observations,
        paymentMethod: paymentMethod ?? this.paymentMethod,
        promoCode: promoCode ?? this.promoCode,
        nif: nif ?? this.nif,
        useDifferentBillingAddress: useDifferentBillingAddress ?? this.useDifferentBillingAddress,
      );
}

class BookingNotifier extends StateNotifier<BookingState> {
  BookingNotifier() : super(const BookingState());

  void selectCategory(ServiceCategory cat) {
    state = const BookingState();
    state = state.copyWith(category: cat);
  }

  void selectSubcategory(ServiceSubcategory sub) {
    // Initialise items list with qty=0 for each item
    final items = sub.items.map((i) => BookingItem(item: i, qty: 0)).toList();
    state = state.copyWith(subcategory: sub, items: items);
  }

  void setItemQty(String itemId, int qty) {
    final updated = state.items.map((bi) {
      if (bi.item.id == itemId) return bi.copyWith(qty: qty.clamp(0, 99));
      return bi;
    }).toList();
    state = state.copyWith(items: updated);
  }

  void setDescription(String desc) => state = state.copyWith(description: desc);

  void addPhoto(String url) {
    if (state.photoUrls.length >= 5) return;
    state = state.copyWith(photoUrls: [...state.photoUrls, url]);
  }

  void removePhoto(String url) {
    state = state.copyWith(
      photoUrls: state.photoUrls.where((p) => p != url).toList(),
    );
  }

  void setLocation(String postalCode, String description) =>
      state = state.copyWith(
        postalCode: postalCode,
        locationDescription: description,
      );

  void setSchedule(DateTime date, String slot) =>
      state = state.copyWith(scheduledDate: date, scheduledSlot: slot);

  void setPhone(String phone) => state = state.copyWith(phone: phone);

  void setPhoneVerified() => state = state.copyWith(phoneVerified: true);

  void setAddressDetails(String street, String doorNumber, String observations,
          {String floor = ''}) =>
      state = state.copyWith(
        street: street,
        doorNumber: doorNumber,
        floor: floor,
        observations: observations,
      );

  void setPaymentMethod(String method) => state = state.copyWith(paymentMethod: method);
  void setPromoCode(String code) => state = state.copyWith(promoCode: code);
  void setNif(String nif) => state = state.copyWith(nif: nif);
  void setUseDifferentBillingAddress(bool v) =>
      state = state.copyWith(useDifferentBillingAddress: v);

  void reset() => state = const BookingState();

  /// Maps a client service category to the backend [Specialty] enum.
  static String _specialtyFor(ServiceCategory? cat) {
    switch (cat?.id) {
      case 'PLUMBING':
        return 'PLUMBING';
      case 'AC':
        return 'HVAC';
      case 'APPLIANCES':
        return 'APPLIANCES';
      case 'ELECTRICITY':
      default:
        return 'ELECTRICITY';
    }
  }

  /// Builds a rich description so the admin sees the full booking context
  /// (the ServiceRequest schema does not store items/total/slot).
  String _buildDescription() {
    final fmt = NumberFormat.currency(locale: 'pt_PT', symbol: '€');
    final b = StringBuffer();
    if (state.description.trim().isNotEmpty) {
      b.writeln(state.description.trim());
      b.writeln();
    }
    b.writeln('Serviço: ${state.category?.name ?? ''}'
        '${state.subcategory != null ? ' › ${state.subcategory!.name}' : ''}');
    final selected = state.selectedItems;
    if (selected.isNotEmpty) {
      b.writeln('Itens:');
      for (final bi in selected) {
        b.writeln('- ${bi.qty}x ${bi.item.name} (${fmt.format(bi.item.price * bi.qty)})');
      }
      b.writeln('Total estimado: ${fmt.format(state.total)}');
    }
    if (state.scheduledSlot != null) {
      b.writeln('Horário preferido: ${state.scheduledSlot}');
    }
    if (state.phone.isNotEmpty) {
      b.writeln('Contacto: ${state.phone}');
    }
    if (state.observations.trim().isNotEmpty) {
      b.writeln('Observações: ${state.observations.trim()}');
    }
    return b.toString().trim();
  }

  /// Combines the scheduled date with the start hour of the chosen slot.
  DateTime? _scheduledDateTime() {
    final date = state.scheduledDate;
    if (date == null) return null;
    final slot = state.scheduledSlot;
    if (slot == null) return date;
    final match = RegExp(r'(\d{1,2}):(\d{2})').firstMatch(slot);
    if (match == null) return date;
    return DateTime(date.year, date.month, date.day,
        int.parse(match.group(1)!), int.parse(match.group(2)!));
  }

  /// Persists the booking: creates the address, then the service request.
  Future<ServiceRequest> submit(ClientService service) async {
    final parts = state.locationDescription.split(',').map((s) => s.trim()).toList();
    final city = parts.isNotEmpty && parts[0].isNotEmpty ? parts[0] : 'N/D';
    final district = parts.length > 1 ? parts[1] : city;

    final address = await service.createAddress(
      label: 'Morada do serviço',
      street: state.street.isNotEmpty ? state.street : (state.locationDescription),
      number: state.doorNumber.isNotEmpty ? state.doorNumber : 's/n',
      floor: state.floor.isNotEmpty ? state.floor : null,
      postalCode: state.postalCode,
      city: city,
      district: district,
    );

    return service.createServiceRequest(
      addressId: address.id,
      specialty: _specialtyFor(state.category),
      description: _buildDescription(),
      scheduledDate: _scheduledDateTime(),
      promoCode: state.promoCode.isNotEmpty ? state.promoCode : null,
    );
  }
}

final bookingProvider =
    StateNotifierProvider<BookingNotifier, BookingState>((_) => BookingNotifier());
