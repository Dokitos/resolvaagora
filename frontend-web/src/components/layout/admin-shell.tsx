'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ClipboardList, Users, AlertTriangle,
  BarChart2, CreditCard, Star, LogOut, MessageSquare, Tag, Settings,
} from 'lucide-react'
import { AdminNotificationBell } from '@/components/layout/admin-notification-bell'

const nav = [
  { href: '/admin/dashboard',        label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/service-requests', label: 'Pedidos',       icon: ClipboardList   },
  { href: '/admin/clients',          label: 'Clientes',      icon: MessageSquare   },
  { href: '/admin/technicians',      label: 'Técnicos',      icon: Users           },
  { href: '/admin/sla',              label: 'SLA / Alertas', icon: AlertTriangle   },
  { href: '/admin/financials',       label: 'Financeiro',    icon: CreditCard      },
  { href: '/admin/subscriptions',    label: 'Assinaturas',   icon: Star            },
  { href: '/admin/promo-codes',      label: 'Promoções',     icon: Tag             },
  { href: '/admin/analytics',        label: 'Analytics',     icon: BarChart2       },
  { href: '/admin/settings',         label: 'Definições',    icon: Settings        },
]

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 bg-brand-600 text-white">
          <div className="w-9 h-9 bg-white/15 rounded-lg flex items-center justify-center font-black">
            SM
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold">ResolvaAgora</p>
            <p className="text-xs text-white/70">Administração</p>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', active && 'text-brand-600')} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Terminar sessão
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end gap-2 px-6 shrink-0">
          <AdminNotificationBell />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
