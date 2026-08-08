import { api } from './client'
import type { ReferralsMe } from './types'

export const referralsApi = {
  getMine: () =>
    api.get<ReferralsMe>('/referrals/me').then((r) => r.data),
}
