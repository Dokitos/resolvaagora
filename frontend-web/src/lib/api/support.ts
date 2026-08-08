import { api } from './client'
import type { SupportMessage } from './types'

export const supportApi = {
  getMessages: () =>
    api.get<SupportMessage[]>('/support/messages').then((r) => r.data),

  getUnreadCount: () =>
    api.get<{ count: number }>('/support/unread-count').then((r) => r.data),

  sendMessage: (body: string, serviceRequestId?: string) =>
    api.post<SupportMessage>('/support/messages', { body, serviceRequestId }).then((r) => r.data),

  markAllRead: () =>
    api.patch('/support/messages/read-all').then((r) => r.data),
}
