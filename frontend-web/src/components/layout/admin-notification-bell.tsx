'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { io, type Socket } from 'socket.io-client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Bell, ClipboardList, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

type FeedItem = {
  id: string
  kind: 'request' | 'message'
  title: string
  body: string
  href: string
  at: number
}

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3002/api/v1').replace(/\/api\/v1\/?$/, '')

export function AdminNotificationBell() {
  const { data: session } = useSession()
  const token = (session?.user as any)?.accessToken as string | undefined
  const socketRef = useRef<Socket | null>(null)
  const [items, setItems] = useState<FeedItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!token) return
    const socket = io(`${WS_BASE}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('new-service-request', (data: any) => {
      const item: FeedItem = {
        id: data.serviceRequestId,
        kind: 'request',
        title: 'Novo pedido de serviço',
        body: `${data.specialty ?? ''} — ${data.clientName ?? ''}${data.city ? ' · ' + data.city : ''}`,
        href: `/admin/service-requests/${data.serviceRequestId}`,
        at: Date.now(),
      }
      setItems((prev) => [item, ...prev].slice(0, 30))
      setUnread((n) => n + 1)
      toast.success('Novo pedido de serviço recebido', { icon: '🔔' })
      window.dispatchEvent(new CustomEvent('admin:new-request', { detail: data }))
    })

    socket.on('support-message', (msg: any) => {
      if (msg?.senderRole !== 'CLIENT') return
      const item: FeedItem = {
        id: msg.id,
        kind: 'message',
        title: 'Nova mensagem de cliente',
        body: String(msg.body ?? '').slice(0, 80),
        href: `/admin/clients?user=${msg.clientUserId}`,
        at: Date.now(),
      }
      setItems((prev) => [item, ...prev].slice(0, 30))
      setUnread((n) => n + 1)
      toast('Nova mensagem de cliente', { icon: '💬' })
      window.dispatchEvent(new CustomEvent('admin:support-message', { detail: msg }))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((o) => !o); setUnread(0) }}
        className="relative h-10 w-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600"
        aria-label="Notificações"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-auto bg-white rounded-xl border border-gray-200 shadow-lg z-20">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm">Notificações</div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-400 text-center">Sem notificações em tempo real ainda.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {items.map((it) => (
                  <li key={it.id + it.at}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 hover:bg-gray-50"
                    >
                      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        it.kind === 'request' ? 'bg-brand-50 text-brand-600' : 'bg-accent-50 text-accent-600')}>
                        {it.kind === 'request' ? <ClipboardList className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{it.title}</p>
                        <p className="text-xs text-gray-500 truncate">{it.body}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
