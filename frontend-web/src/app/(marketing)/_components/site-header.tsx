'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/servicos', label: 'Serviços' },
  { href: '/sobre', label: 'Sobre nós' },
  { href: '/contactos', label: 'Contactos' },
]

export function SiteHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ResolvaAgora" className="h-12 w-auto object-contain" />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-semibold text-brand-600 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'transition-colors hover:text-accent-600',
                pathname === item.href && 'text-accent-600',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-bold text-brand-700 transition-colors hover:bg-gray-100"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-accent-500 px-4 py-2 text-sm font-bold text-brand-900 transition-colors hover:bg-accent-600"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </header>
  )
}
