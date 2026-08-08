'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { cn, STATUS_LABELS } from '@/lib/utils'
import { Home, Wrench, User } from 'lucide-react'
import { notificationsApi } from '@/lib/api/notifications'
import { useNotificationsSocket } from '@/lib/hooks/use-notifications-socket'
import type { ServiceStatus } from '@/lib/api/types'

const nav = [
  { href: '/dashboard', label: 'Início', icon: Home },
  { href: '/services', label: 'Os meus serviços', icon: Wrench },
  { href: '/account', label: 'Conta', icon: User },
]

export function ClientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [unread, setUnread] = useState(0)

  function refreshUnread() {
    notificationsApi.unreadCount().then((r) => setUnread(r.count)).catch(() => {})
  }

  useEffect(refreshUnread, [pathname])

  useNotificationsSocket({
    onServiceStatusUpdated: (data) => {
      toast.success(`Pedido atualizado: ${STATUS_LABELS[data.newStatus as ServiceStatus] ?? data.newStatus}`)
      refreshUnread()
    },
    onQuoteReceived: () => {
      toast.success('Recebeu um novo orçamento!', { icon: '📋' })
      refreshUnread()
    },
    onNotification: (data) => {
      toast(data.title, { icon: '🔔' })
      refreshUnread()
    },
    onSupportMessage: (data) => {
      if (data.senderRole === 'CLIENT') return
      toast('Nova mensagem do suporte', { icon: '💬' })
      refreshUnread()
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-700 rounded-lg flex items-center justify-center">
              <Wrench className="h-4 w-4 text-accent-500" />
            </div>
            <span className="font-bold text-gray-900">ResolvaAgora</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-gray-600 hover:bg-gray-100',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {href === '/account' && unread > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <Link href="/account" className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-50 rounded-full flex items-center justify-center relative">
              <User className="h-4 w-4 text-brand-700" />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />}
            </div>
            <span className="text-sm text-gray-700">{session?.user?.name?.split(' ')[0] || ''}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40">
        <div className="grid grid-cols-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium',
                  active ? 'text-accent-600' : 'text-gray-400',
                )}
              >
                <Icon className="h-5 w-5" />
                {label === 'Conta' ? 'Conta' : label === 'Início' ? 'Início' : 'Serviços'}
                {href === '/account' && unread > 0 && (
                  <span className="absolute top-1 right-[calc(50%-20px)] h-2 w-2 rounded-full bg-red-500" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
