import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';

/// Resultado da pesquisa de um código postal no backend (`GET /geo/postal-code`).
class PostalCodeInfo {
  final String postalCode;

  /// `street`: código completo, rua identificada. `zone`: só 4 dígitos, cobre
  /// um concelho. `approximate`: a fonte precisa não respondeu e a posição
  /// veio do OpenStreetMap — sem rua e possivelmente a centenas de metros.
  final String precision;
  final List<String> streets;
  final String? locality;
  final String? municipality;
  final String? district;
  final double lat;
  final double lng;

  const PostalCodeInfo({
    required this.postalCode,
    required this.precision,
    required this.streets,
    required this.lat,
    required this.lng,
    this.locality,
    this.municipality,
    this.district,
  });

  bool get isStreet => precision == 'street';
  bool get isApproximate => precision == 'approximate';

  /// "Concelho, Distrito" — o formato que a reserva grava e depois parte em
  /// cidade e distrito ao criar a morada (ver BookingNotifier.submit).
  String get description {
    final place = municipality ?? locality ?? '';
    if (district == null || district == place) return place;
    return place.isEmpty ? district! : '$place, $district';
  }

  factory PostalCodeInfo.fromJson(Map<String, dynamic> j) => PostalCodeInfo(
        postalCode: j['postalCode'] as String,
        precision: j['precision'] as String? ?? 'zone',
        streets: (j['streets'] as List? ?? const []).cast<String>(),
        locality: j['locality'] as String?,
        municipality: j['municipality'] as String?,
        district: j['district'] as String?,
        lat: (j['lat'] as num).toDouble(),
        lng: (j['lng'] as num).toDouble(),
      );
}

/// O código não existe (404). Distinto de uma falha de rede: um código
/// inexistente trava a reserva, uma falha de rede não.
class PostalCodeNotFound implements Exception {
  const PostalCodeNotFound();
}

class GeoService {
  final Ref _ref;
  GeoService(this._ref);

  /// Lança [PostalCodeNotFound] se o código não existir; qualquer outra
  /// exceção é falha de rede ou do servidor.
  Future<PostalCodeInfo> lookup(String code) async {
    try {
      final r = await _ref.read(dioProvider).get('/geo/postal-code/$code');
      return PostalCodeInfo.fromJson(r.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) throw const PostalCodeNotFound();
      rethrow;
    }
  }
}

final geoServiceProvider = Provider<GeoService>((ref) => GeoService(ref));
