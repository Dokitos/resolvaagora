'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut, useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import {
  Edit, Star, User, MapPin, Receipt, Bell, Gift, HelpCircle, FileText, LogOut, MailWarning, ChevronRight,
} from 'lucide-react'
import { clientApi } from '@/lib/api/client-api'
import { notificationsApi } from '@/lib/api/notifications'
import { api } from '@/lib/api/client'
import type { ClientProfile } from '@/lib/api/types'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href: string
  badge?: number
  danger?: boolean
}

function MenuGroup({ items, onLogout }: { items: MenuItem[]; onLogout?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={cn('flex items-center gap-3.5 px-4 py-3.5 hover:bg-gray-50 transition-colors', item.danger && 'text-red-600')}
        >
          <item.icon className={cn('h-5 w-5 flex-shrink-0', item.danger ? 'text-red-600' : 'text-gray-500')} />
          <span className={cn('flex-1 text-sm font-medium', item.danger ? 'text-red-600' : 'text-gray-900')}>{item.label}</span>
          {!!item.badge && (
            <span className="bg-accent-600 text-white text-xs font-bold rounded-full px-2 py-0.5">{item.badge}</span>
          )}
          {!onLogout && <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
        </Link>
      ))}
    </div>
  )
}

export default function AccountPage() {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<ClientProfile | null>(null)
  const [unread, setUnread] = useState(0)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    clientApi.getProfile().then(setProfile).catch(() => {})
    notificationsApi.unreadCount().then((r) => setUnread(r.count)).catch(() => {})
  }, [])

  async function handleResendVerification() {
    setResending(true)
    try {
      await api.post('/auth/resend-verification')
      toast.success('Enviámos um novo email de verificação.')
    } catch {
      // silencioso, tal como na app
    } finally {
      setResending(false)
    }
  }

  const accountItems: MenuItem[] = [
    { icon: Star, label: 'Assinatura', href: '/account/subscription' },
    { icon: User, label: 'Editar perfil', href: '/account/profile' },
    { icon: MapPin, label: 'Moradas', href: '/account/addresses' },
    { icon: Receipt, label: 'Os meus pedidos', href: '/services' },
    { icon: Bell, label: 'Notificações', href: '/account/notifications', badge: unread },
    { icon: Gift, label: 'Convida amigos', href: '/account/referrals' },
  ]

  const supportItems: MenuItem[] = [
    { icon: HelpCircle, label: 'Ajuda e suporte', href: '/account/support' },
    { icon: FileText, label: 'Termos e condições', href: '/account/terms' },
  ]

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="-mx-4 -mt-6 bg-brand-700 px-6 py-8 flex items-center gap-4">
        <Avatar src={profile?.photoUrl} name={session?.user?.name || profile?.firstName} size="lg" className="bg-white" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg truncate">{session?.user?.name || 'Cliente'}</p>
          <p className="text-white/60 text-sm truncate">{profile?.email || session?.user?.email}</p>
        </div>
        <Link href="/account/profile" className="text-white/80 hover:text-white flex-shrink-0">
          <Edit className="h-5 w-5" />
        </Link>
      </div>

      {profile && !profile.emailVerified && (
        <div className="flex items-start gap-3 rounded-xl border border-accent-500 bg-accent-50 p-3.5">
          <MailWarning className="h-5 w-5 text-brand-900 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Confirme o seu email</p>
            <p className="text-xs text-gray-700 mt-0.5">Verifique a sua caixa de entrada para confirmar a conta.</p>
          </div>
          <button
            onClick={handleResendVerification}
            disabled={resending}
            className="text-xs font-bold text-brand-900 flex-shrink-0"
          >
            {resending ? '...' : 'Reenviar'}
          </button>
        </div>
      )}

      <div>
        <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Conta</p>
        <MenuGroup items={accountItems} />
      </div>

      <div>
        <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Apoio</p>
        <MenuGroup items={supportItems} />
      </div>

      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="w-full flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-red-600"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-sm font-medium">Terminar sessão</span>
      </button>

      <p className="text-center text-xs text-gray-400 pb-4">ResolvaAgora</p>
    </div>
  )
}
