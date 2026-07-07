import { api } from './client'
import type { Address } from './types'

export const clientApi = {
  getAddresses: () =>
    api.get<Address[]>('/clients/me/addresses').then((r) => r.data),

  createAddress: (data: Omit<Address, 'id'>) =>
    api.post<Address>('/clients/me/addresses', data).then((r) => r.data),

  updateAddress: (id: string, data: Partial<Omit<Address, 'id'>>) =>
    api.patch<Address>(`/clients/me/addresses/${id}`, data).then((r) => r.data),

  deleteAddress: (id: string) =>
    api.delete(`/clients/me/addresses/${id}`),
}
