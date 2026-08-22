import { api } from './client'
import type { DashboardMetrics, AnalyticsData, ServiceRequest, Technician, SlaAlert, Email, EmailTemplate, EmailFolder } from './types'

export interface FinancialsResponse {
  commissionRate: number
  displacement: { total: number; count: number }
  commissions: { total: number; count: number }
  subscriptions: { total: number; count: number }
  totalRevenue: number
  breakdown: {
    date: string
    displacement: number
    commissions: number
    subscriptions: number
    total: number
  }[]
  byTechnician: { technicianId: string; name: string; total: number; count: number }[]
  byCategory: { specialty: string; total: number; count: number }[]
  pending: { total: number; count: number }
  payouts: { toTechnicians: number; platformCommission: number }
}

export interface Transaction {
  id: string
  type: 'DISPLACEMENT' | 'SERVICE' | 'QUOTE' | 'SUBSCRIPTION'
  amount: number
  currency: string
  status: string
  clientName: string
  technicianName: string | null
  specialty: string | null
  description: string | null
  date: string
  reference: string | null
}

export interface TransactionsResponse {
  items: Transaction[]
  total: number
  page: number
  pageSize: number
}

export type CampaignAudience =
  | 'ALL_USERS'
  | 'ALL_CLIENTS'
  | 'ALL_TECHNICIANS'
  | 'GROUP'
  | 'SEGMENT'

/** Criterios de segmentacao; todos opcionais e combinados com E logico. */
export type AudienceSegment = {
  role?: 'CLIENT' | 'TECHNICIAN'
  registeredWithinDays?: number
  registeredMoreThanDays?: number
  minCompletedServices?: number
  maxCompletedServices?: number
  district?: string
}

export type CampaignInput = {
  title: string
  body: string
  audience: CampaignAudience
  groupId?: string
  segment?: AudienceSegment
  /** ISO. Presente agenda; ausente guarda como rascunho. */
  scheduledAt?: string | null
}

export const adminApi = {
  dashboard: () =>
    api.get<DashboardMetrics>('/admin/dashboard').then((r) => r.data),

  analytics: (params?: { from?: string; to?: string }) =>
    api.get<AnalyticsData>('/admin/analytics', { params }).then((r) => r.data),

  transactions: (params?: { from?: string; to?: string; page?: number }) =>
    api.get<TransactionsResponse>('/admin/transactions', { params }).then((r) => r.data),

  serviceRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<ServiceRequest[]>('/admin/service-requests', { params }).then((r) => r.data),

  getServiceRequest: (id: string) =>
    api.get<ServiceRequest>(`/admin/service-requests/${id}`).then((r) => r.data),

  reassign: (id: string, technicianId: string) =>
    api.patch(`/admin/service-requests/${id}/reassign`, { technicianId }).then((r) => r.data),

  editServiceRequest: (id: string, data: { status?: string; scheduledDate?: string | null; description?: string; displacementFee?: number }) =>
    api.patch(`/admin/service-requests/${id}`, data).then((r) => r.data),

  cancelServiceRequest: (id: string, reason?: string, force?: boolean, refundAmount?: number) =>
    api.post<{ refunded: number; kept: number }>(`/admin/service-requests/${id}/cancel`, { reason, force, refundAmount }).then((r) => r.data),

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

  slaAlerts: (resolved?: boolean) =>
    api.get<SlaAlert[]>('/admin/sla-alerts', { params: resolved ? { resolved: 'true' } : undefined }).then((r) => r.data),

  slaAlertsSummary: () =>
    api.get<{ metric: string; warning: number; critical: number }[]>('/admin/sla-alerts/summary').then((r) => r.data),

  acknowledgeAlert: (id: string) =>
    api.patch(`/admin/sla-alerts/${id}/acknowledge`).then((r) => r.data),

  financials: (params?: { from?: string; to?: string }) =>
    api.get<FinancialsResponse>('/admin/financials', { params }).then((r) => r.data),

  subscriptions: (params?: { status?: string }) =>
    api.get('/admin/subscriptions', { params }).then((r) => r.data),

  plans: () =>
    api.get('/admin/subscription-plans').then((r) => r.data),

  createPlan: (data: any) =>
    api.post('/admin/subscription-plans', data).then((r) => r.data),

  updatePlan: (id: string, data: any) =>
    api.patch(`/admin/subscription-plans/${id}`, data).then((r) => r.data),

  deletePlan: (id: string) =>
    api.delete(`/admin/subscription-plans/${id}`).then((r) => r.data),

  uploadImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/admin/uploads', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data as { url: string })
  },

  referralConfig: () =>
    api.get('/admin/referral-config').then((r) => r.data),

  updateReferralConfig: (data: any) =>
    api.patch('/admin/referral-config', data).then((r) => r.data),

  banners: () =>
    api.get('/admin/banners').then((r) => r.data),

  createBanner: (data: any) =>
    api.post('/admin/banners', data).then((r) => r.data),

  updateBanner: (id: string, data: any) =>
    api.patch(`/admin/banners/${id}`, data).then((r) => r.data),

  deleteBanner: (id: string) =>
    api.delete(`/admin/banners/${id}`).then((r) => r.data),

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

  // ── Notificacoes: campanhas e grupos ─────────────────────
  campaigns: (status?: string) =>
    api.get('/admin/notifications/campaigns', { params: status ? { status } : {} }).then((r) => r.data),

  createCampaign: (data: CampaignInput) =>
    api.post('/admin/notifications/campaigns', data).then((r) => r.data),

  updateCampaign: (id: string, data: Partial<CampaignInput>) =>
    api.patch(`/admin/notifications/campaigns/${id}`, data).then((r) => r.data),

  deleteCampaign: (id: string) =>
    api.delete(`/admin/notifications/campaigns/${id}`).then((r) => r.data),

  sendCampaign: (id: string) =>
    api.post(`/admin/notifications/campaigns/${id}/send`).then((r) => r.data),

  cancelCampaign: (id: string) =>
    api.post(`/admin/notifications/campaigns/${id}/cancel`).then((r) => r.data),

  previewAudience: (data: Pick<CampaignInput, 'audience' | 'groupId' | 'segment'>) =>
    api.post('/admin/notifications/audience/preview', data).then((r) => r.data),

  /** Conversa cliente↔técnico de um pedido (leitura, para moderação). */
  serviceMessages: (serviceRequestId: string) =>
    api.get(`/service-requests/${serviceRequestId}/messages`).then((r) => r.data),

  notificationGroups: () =>
    api.get('/admin/notifications/groups').then((r) => r.data),

  createNotificationGroup: (data: { name: string; description?: string }) =>
    api.post('/admin/notifications/groups', data).then((r) => r.data),

  deleteNotificationGroup: (id: string) =>
    api.delete(`/admin/notifications/groups/${id}`).then((r) => r.data),

  setClientStatus: (clientUserId: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api.patch(`/admin/clients/${clientUserId}/status`, { status }).then((r) => r.data),

  deleteClient: (clientUserId: string) =>
    api.delete(`/admin/clients/${clientUserId}`),

  // ── Email ────────────────────────────────────────────────
  emails: (folder: EmailFolder = 'inbox', page = 1) =>
    api.get<{ items: Email[]; total: number }>('/admin/emails', { params: { folder, page } }).then((r) => r.data),

  email: (id: string) =>
    api.get<Email>(`/admin/emails/${id}`).then((r) => r.data),

  updateEmail: (id: string, patch: { isRead?: boolean; isStarred?: boolean; folder?: EmailFolder }) =>
    api.patch<Email>(`/admin/emails/${id}`, patch).then((r) => r.data),

  sendEmail: (payload: { to: string; subject: string; html: string }) =>
    api.post('/admin/emails/send', payload).then((r) => r.data),

  emailTemplates: () =>
    api.get<EmailTemplate[]>('/admin/email-templates').then((r) => r.data),

  createEmailTemplate: (data: Partial<EmailTemplate>) =>
    api.post<EmailTemplate>('/admin/email-templates', data).then((r) => r.data),

  updateEmailTemplate: (id: string, data: Partial<EmailTemplate>) =>
    api.patch<EmailTemplate>(`/admin/email-templates/${id}`, data).then((r) => r.data),

  deleteEmailTemplate: (id: string) =>
    api.delete(`/admin/email-templates/${id}`),
}
