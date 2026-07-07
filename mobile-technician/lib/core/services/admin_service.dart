import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/api_client.dart';
import '../models/service_request.dart';

/// Admin-facing API layer (mirrors the web admin panel).
class AdminService {
  final Dio _dio;
  AdminService(this._dio);

  Future<Map<String, dynamic>> dashboard() async {
    final r = await _dio.get('/admin/dashboard');
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<Map<String, dynamic>> financials() async {
    final r = await _dio.get('/admin/financials');
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<Map<String, dynamic>> analytics() async {
    final r = await _dio.get('/admin/analytics');
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<List<ServiceRequest>> serviceRequests({String? status}) async {
    final r = await _dio.get('/admin/service-requests',
        queryParameters: {if (status != null && status.isNotEmpty) 'status': status});
    return (r.data as List).map((e) => ServiceRequest.fromJson(e)).toList();
  }

  Future<Map<String, dynamic>> serviceRequest(String id) async {
    final r = await _dio.get('/admin/service-requests/$id');
    return Map<String, dynamic>.from(r.data as Map);
  }

  Future<void> reassign(String id, String technicianId) =>
      _dio.patch('/admin/service-requests/$id/reassign', data: {'technicianId': technicianId});

  Future<void> editStatus(String id, String status) =>
      _dio.patch('/admin/service-requests/$id', data: {'status': status});

  Future<void> cancelRequest(String id, String reason) =>
      _dio.post('/admin/service-requests/$id/cancel', data: {'reason': reason});

  Future<void> deleteRequest(String id) => _dio.delete('/admin/service-requests/$id');

  Future<List<Map<String, dynamic>>> technicians({String? status}) async {
    final r = await _dio.get('/admin/technicians',
        queryParameters: {if (status != null && status.isNotEmpty) 'status': status});
    return (r.data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> clients({String? search}) async {
    final r = await _dio.get('/admin/clients',
        queryParameters: {if (search != null && search.isNotEmpty) 'search': search});
    return (r.data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<List<Map<String, dynamic>>> clientMessages(String clientUserId) async {
    final r = await _dio.get('/admin/clients/$clientUserId/messages');
    return (r.data as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
  }

  Future<Map<String, dynamic>> sendClientMessage(String clientUserId, String body) async {
    final r = await _dio.post('/admin/clients/$clientUserId/messages', data: {'body': body});
    return Map<String, dynamic>.from(r.data as Map);
  }
}

final adminServiceProvider = Provider<AdminService>((ref) => AdminService(ref.read(dioProvider)));

final adminDashboardProvider = FutureProvider<Map<String, dynamic>>(
    (ref) => ref.read(adminServiceProvider).dashboard());

final adminFinancialsProvider = FutureProvider<Map<String, dynamic>>(
    (ref) => ref.read(adminServiceProvider).financials());

final adminAnalyticsProvider = FutureProvider<Map<String, dynamic>>(
    (ref) => ref.read(adminServiceProvider).analytics());

final adminRequestsProvider =
    FutureProvider.family<List<ServiceRequest>, String?>((ref, status) {
  return ref.read(adminServiceProvider).serviceRequests(status: status);
});

final adminRequestDetailProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, id) {
  return ref.read(adminServiceProvider).serviceRequest(id);
});

final adminTechniciansProvider = FutureProvider<List<Map<String, dynamic>>>(
    (ref) => ref.read(adminServiceProvider).technicians());

final adminClientsProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String?>((ref, search) {
  return ref.read(adminServiceProvider).clients(search: search);
});
