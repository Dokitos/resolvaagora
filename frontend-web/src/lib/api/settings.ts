import { api } from './client'
import type { PublicSettings } from './types'

export const settingsApi = {
  getPublic: () =>
    api.get<PublicSettings>('/settings/public').then((r) => r.data),
}
