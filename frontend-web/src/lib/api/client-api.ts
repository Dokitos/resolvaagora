import { api } from './client'
import type { Address, ClientProfile } from './types'

export const clientApi = {
  getAddresses: () =>
    api.get<Address[]>('/clients/me/addresses').then((r) => r.data),

  createAddress: (data: Omit<Address, 'id'>) =>
    api.post<Address>('/clients/me/addresses', data).then((r) => r.data),

  updateAddress: (id: string, data: Partial<Omit<Address, 'id'>>) =>
    api.patch<Address>(`/clients/me/addresses/${id}`, data).then((r) => r.data),

  deleteAddress: (id: string) =>
    api.delete(`/clients/me/addresses/${id}`),

  getProfile: () =>
    api.get<ClientProfile>('/clients/me').then((r) => r.data),

  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string; nif?: string; emailNotifications?: boolean }) =>
    api.patch<ClientProfile>('/clients/me', data).then((r) => r.data),

  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ photoUrl: string }>('/clients/me/photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },

  uploadImage: (file: File | Blob) => {
    const form = new FormData()
    form.append('file', file)
    return api.post<{ url: string }>('/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data)
  },
}
