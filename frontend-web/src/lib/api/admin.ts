import { api } from './client'
import type { DashboardMetrics, AnalyticsData, ServiceRequest, Technician, SlaAlert } from './types'

export const adminApi = {
  dashboard: () =>
    api.get<DashboardMetrics>('/admin/dashboard').then((r) => r.data),

  analytics: () =>
    api.get<AnalyticsData>('/admin/analytics').then((r) => r.data),

  serviceRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<ServiceRequest[]>('/admin/service-requests', { params }).then((r) => r.data),

  getServiceRequest: (id: string) =>
    api.get<ServiceRequest>(`/admin/service-requests/${id}`).then((r) => r.data),

  reassign: (id: string, technicianId: string) =>
    api.patch(`/admin/service-requests/${id}/reassign`, { technicianId }).then((r) => r.data),

  editServiceRequest: (id: string, data: { status?: string; scheduledDate?: string | null; description?: string; displacementFee?: number }) =>
    api.patch(`/admin/service-requests/${id}`, data).then((r) => r.data),

  cancelServiceRequest: (id: string, reason?: string) =>
    api.post(`/admin/service-requests/${id}/cancel`, { reason }).then((r) => r.data),

  deleteServiceRequest: (id: string) =>
    api.delete(`/admin/service-requests/${id}`),

  clients: (params?: { search?: string }) =>
    api.get('/admin/clients', { params }).then((r) => r.data),

  clientMessages: (clientUserId: string) =>
    api.get(`/admin/clients/${clientUserId}/messages`).then((r) => r.data),

  sendClientMessage: (clientUserId: string, body: string, serviceRequestId?: string) =>
    api.post(`/admin/clients/${clientUserId}/messages`, { body, serviceRequestId }).then((r) => r.data),

  technicians: (params?: { status?: string }) =>
    api.get<Technician[]>('/admin/technicians', { params }).then((r) => r.data),

  createTechnician: (data: any) =>
    api.post('/admin/technicians', data).then((r) => r.data),

  updateTechnician: (id: string, data: any) =>
    api.patch(`/admin/technicians/${id}`, data).then((r) => r.data),

  updateDailyLimit: (id: string, limit: number) =>
    api.patch(`/admin/technicians/${id}/daily-limit`, { limit }).then((r) => r.data),

  disableTechnician: (id: string) =>
    api.delete(`/admin/technicians/${id}`),

  slaAlerts: () =>
    api.get<SlaAlert[]>('/admin/sla-alerts').then((r) => r.data),

  acknowledgeAlert: (id: string) =>
    api.patch(`/admin/sla-alerts/${id}/acknowledge`).then((r) => r.data),

  financials: (params?: { from?: string; to?: string }) =>
    api.get('/admin/financials', { params }).then((r) => r.data),

  subscriptions: (params?: { status?: string }) =>
    api.get('/admin/subscriptions', { params }).then((r) => r.data),

  plans: () =>
    api.get('/admin/subscription-plans').then((r) => r.data),

  promoCodes: () =>
    api.get('/admin/promo-codes').then((r) => r.data),

  createPromoCode: (data: any) =>
    api.post('/admin/promo-codes', data).then((r) => r.data),

  updatePromoCode: (id: string, data: any) =>
    api.patch(`/admin/promo-codes/${id}`, data).then((r) => r.data),

  deletePromoCode: (id: string) =>
    api.delete(`/admin/promo-codes/${id}`),

  referrals: () =>
    api.get('/admin/referrals').then((r) => r.data),

  settings: () =>
    api.get('/admin/settings').then((r) => r.data),

  updateSettings: (data: any) =>
    api.patch('/admin/settings', data).then((r) => r.data),

  broadcast: (data: { target: string; userId?: string; title: string; body: string }) =>
    api.post('/admin/notifications/broadcast', data).then((r) => r.data),

  setClientStatus: (clientUserId: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api.patch(`/admin/clients/${clientUserId}/status`, { status }).then((r) => r.data),

  deleteClient: (clientUserId: string) =>
    api.delete(`/admin/clients/${clientUserId}`),
}
