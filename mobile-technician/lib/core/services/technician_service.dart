import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../models/service_request.dart';
import '../models/earning.dart';

class TechnicianService {
  final Dio _dio;
  TechnicianService(this._dio);

  Future<List<ServiceRequest>> getAssignedJobs() async {
    final r = await _dio.get('/technician/service-requests');
    return (r.data as List).map((e) => ServiceRequest.fromJson(e)).toList();
  }

  Future<ServiceRequest> getJob(String id) async {
    final r = await _dio.get('/technician/service-requests/$id');
    return ServiceRequest.fromJson(r.data);
  }

  Future<ServiceRequest> updateStatus(String id, String status, {String? notes}) async {
    final r = await _dio.patch(
      '/technician/service-requests/$id/status',
      data: {'status': status, if (notes != null) 'notes': notes},
    );
    return ServiceRequest.fromJson(r.data);
  }

  Future<void> sendQuote(String serviceRequestId, {
    required String description,
    required double laborCost,
    double materialsCost = 0,
  }) async {
    await _dio.post('/technician/service-requests/$serviceRequestId/quote', data: {
      'description': description,
      'laborCost': laborCost,
      'materialsCost': materialsCost,
    });
  }

  Future<void> uploadProofPhotos(String serviceRequestId, List<String> urls) async {
    await _dio.post(
      '/technician/service-requests/$serviceRequestId/proofs',
      data: {'urls': urls},
    );
  }

  /// Faz upload de uma imagem (multipart → R2) e devolve o URL público.
  Future<String> uploadImage(List<int> bytes, String filename) async {
    final form = FormData.fromMap({
      'file': MultipartFile.fromBytes(bytes, filename: filename),
    });
    final r = await _dio.post('/uploads/image', data: form);
    return (r.data as Map)['url']?.toString() ?? '';
  }

  Future<void> setAvailability(bool available) async {
    await _dio.patch('/technician/availability', data: {
      'status': available ? 'AVAILABLE' : 'BUSY',
    });
  }

  Future<EarningsSummary> getEarnings({String period = 'month'}) async {
    final r = await _dio.get('/technician/earnings', queryParameters: {'period': period});
    return EarningsSummary.fromJson(r.data);
  }

  /// Perfil do técnico autenticado (nome, telefone, email, photoUrl).
  Future<Map<String, dynamic>> me() async {
    final r = await _dio.get('/technician/me');
    return Map<String, dynamic>.from(r.data as Map);
  }
}

final technicianServiceProvider = Provider<TechnicianService>((ref) {
  return TechnicianService(ref.read(dioProvider));
});

/// Perfil do técnico autenticado (inclui `photoUrl`, nome, telefone, email).
final technicianProfileProvider = FutureProvider<Map<String, dynamic>>((ref) {
  return ref.read(technicianServiceProvider).me();
});

final assignedJobsProvider = FutureProvider<List<ServiceRequest>>((ref) {
  return ref.read(technicianServiceProvider).getAssignedJobs();
});

final jobDetailProvider = FutureProvider.family<ServiceRequest, String>((ref, id) {
  return ref.read(technicianServiceProvider).getJob(id);
});
