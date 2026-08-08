import { api } from './client'

export interface ServicePricesMap {
  categories: Record<string, number>
  /** chave: `${categoryId}:${subcategoryId}:${itemId}` */
  items: Record<string, number>
}

export interface ServicePricesPayload {
  categories: { categoryId: string; basePrice: number }[]
  items: { categoryId: string; subcategoryId: string; itemId: string; price: number }[]
}

export const servicePricesApi = {
  get: () => api.get<ServicePricesMap>('/service-prices').then((r) => r.data),
  save: (payload: ServicePricesPayload) =>
    api.put<ServicePricesMap>('/admin/service-prices', payload).then((r) => r.data),
}
