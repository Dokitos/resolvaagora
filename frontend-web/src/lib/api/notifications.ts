import { api } from './client'

export interface Notification {
  id: string
  type: string
  title: string
  body: string
  data?: Record<string, string>
  readAt?: string
  createdAt: string
}

export const notificationsApi = {
  list: () =>
    api.get<Notification[]>('/notifications').then((r) => r.data),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    api.patch('/notifications/read-all').then((r) => r.data),

  unreadCount: () =>
    api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data),
}
