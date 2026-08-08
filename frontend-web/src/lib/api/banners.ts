import { api } from './client'
import type { HomeBanner } from './types'

export const bannersApi = {
  list: () =>
    api.get<HomeBanner[]>('/banners').then((r) => r.data),
}
