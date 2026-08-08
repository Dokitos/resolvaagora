import { api } from './client'
import type { PromoValidation } from './types'

export const promoApi = {
  validate: (code: string, amount: number) =>
    api.post<PromoValidation>('/promo/validate', { code, amount }).then((r) => r.data),
}
