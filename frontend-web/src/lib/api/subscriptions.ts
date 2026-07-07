import { api } from './client'
import type { Subscription, SubscriptionPlan } from './types'

export const subscriptionsApi = {
  plans: () =>
    api.get<SubscriptionPlan[]>('/subscriptions/plans').then((r) => r.data),

  current: () =>
    api.get<Subscription | null>('/subscriptions/me').then((r) => r.data),

  subscribe: (planId: string) =>
    api.post<{ clientSecret: string }>('/subscriptions', { planId }).then((r) => r.data),

  cancel: () =>
    api.delete('/subscriptions/me').then((r) => r.data),
}
