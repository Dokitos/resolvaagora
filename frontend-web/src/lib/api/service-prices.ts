import { api } from './client'

export interface ServicePricesMap {
  categories: Record<string, { basePrice: number; hidden: boolean }>
  /** chave: `${categoryId}:${subcategoryId}:${itemId}` */
  items: Record<string, { price: number; hidden: boolean; notes: string | null }>
}

export interface ServicePricesPayload {
  categories: { categoryId: string; basePrice: number; hidden?: boolean }[]
  items: {
    categoryId: string
    subcategoryId: string
    itemId: string
    price: number
    hidden?: boolean
    notes?: string | null
  }[]
}

export const servicePricesApi = {
  get: () => api.get<ServicePricesMap>('/service-prices').then((r) => r.data),
  save: (payload: ServicePricesPayload) =>
    api.put<ServicePricesMap>('/admin/service-prices', payload).then((r) => r.data),
}
