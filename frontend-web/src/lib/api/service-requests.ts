import { api } from './client'
import type { ServiceRequest, Specialty } from './types'

export const serviceRequestsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<ServiceRequest[]>('/service-requests', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<ServiceRequest>(`/service-requests/${id}`).then((r) => r.data),

  create: (data: {
    addressId: string
    specialty: Specialty
    description: string
    scheduledDate?: string
    useFreeVisit?: boolean
  }) => api.post<ServiceRequest>('/service-requests', data).then((r) => r.data),

  cancel: (id: string) =>
    api.delete(`/service-requests/${id}`),

  payDisplacement: (id: string) =>
    api.post<{ clientSecret: string; amount: number }>(`/service-requests/${id}/pay-displacement`).then((r) => r.data),

  approveQuote: (id: string) =>
    api.post(`/service-requests/${id}/quote/approve`).then((r) => r.data),

  rejectQuote: (id: string, reason?: string) =>
    api.post(`/service-requests/${id}/quote/reject`, { reason }).then((r) => r.data),

  getQuote: (id: string) =>
    api.get(`/service-requests/${id}/quote`).then((r) => r.data),

  review: (id: string, data: { rating: number; comment?: string }) =>
    api.post(`/service-requests/${id}/review`, data).then((r) => r.data),
}
