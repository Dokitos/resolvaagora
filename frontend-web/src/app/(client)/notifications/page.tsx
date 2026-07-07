'use client'

import { useEffect, useState } from 'react'
import { notificationsApi, type Notification } from '@/lib/api/notifications'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Bell, CheckCheck, Wrench, CreditCard, FileText, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<string, React.ElementType> = {
  SERVICE_ASSIGNED: Wrench,
  SERVICE_STATUS_UPDATED: Wrench,
  PAYMENT_CONFIRMED: CreditCard,
  QUOTE_SENT: FileText,
  SERVICE_COMPLETED: CheckCheck,
  REVIEW_REQUESTED: Star,
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)

  async function load() {
    notificationsApi.list().then(setNotifications).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleMarkRead(id: string) {
    await notificationsApi.markRead(id).catch(() => null)
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, readAt: new Date().toISOString() } : n)
    )
  }

  async function handleMarkAll() {
    setMarkingAll(true)
    await notificationsApi.markAllRead().catch(() => null)
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    )
    setMarkingAll(false)
  }

  const unread = notifications.filter((n) => !n.readAt)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {unread.length > 0 ? `${unread.length} não lidas` : 'Tudo lido'}
          </p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAll} disabled={markingAll}>
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'A marcar...' : 'Marcar tudo como lido'}
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sem notificações</p>
            <p className="text-sm text-gray-400 mt-1">As suas notificações aparecerão aqui</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {notifications.map((n) => {
          const Icon = TYPE_ICONS[n.type] ?? Bell
          const isUnread = !n.readAt
          return (
            <div
              key={n.id}
              className={cn(
                'flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer',
                isUnread
                  ? 'bg-blue-50 border-blue-100 hover:bg-blue-100'
                  : 'bg-white border-gray-100 hover:bg-gray-50'
              )}
              onClick={() => isUnread && handleMarkRead(n.id)}
            >
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
                isUnread ? 'bg-blue-100' : 'bg-gray-100'
              )}>
                <Icon className={cn('h-4 w-4', isUnread ? 'text-blue-600' : 'text-gray-500')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-sm font-medium', isUnread ? 'text-blue-900' : 'text-gray-900')}>
                    {n.title}
                  </p>
                  {isUnread && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{n.body}</p>
                <p className="text-xs text-gray-400 mt-1">{formatDate(n.createdAt)}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
