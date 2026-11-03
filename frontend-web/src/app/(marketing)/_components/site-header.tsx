'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/servicos', label: 'Serviços' },
  { href: '/download', label: 'A app' },
  { href: '/sobre', label: 'Sobre nós' },
  { href: '/contactos', label: 'Contactos' },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="min-w-0" aria-label="ResolvaAgora, página inicial">
          <span className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Resolva<span className="text-accent-700">Agora</span></span>
        </Link>
        <nav aria-label="Navegação principal" className="hidden items-center gap-7 text-sm font-medium md:flex">
          {NAV.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={cn('py-3 text-muted transition-colors hover:text-ink', pathname === item.href && 'text-ink underline decoration-accent-500 underline-offset-8')}>{item.label}</Link>)}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden min-h-11 items-center rounded-xl px-4 text-sm font-semibold hover:bg-canvas sm:inline-flex">Entrar</Link>
          <Link href="/register" className="inline-flex min-h-11 items-center rounded-xl bg-accent-500 px-4 text-sm font-semibold text-ink transition-colors hover:bg-accent-600">Criar conta</Link>
          <button type="button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} aria-controls="mobile-site-menu" onClick={() => setOpen(!open)} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line md:hidden">{open ? <X className="h-5 w-5"/> : <Menu className="h-5 w-5"/>}</button>
        </div>
      </div>
      {open && <nav id="mobile-site-menu" aria-label="Navegação móvel" className="border-t border-line bg-white p-4 md:hidden">{[...NAV, {href:'/login',label:'Entrar'}].map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-canvas" aria-current={pathname === item.href ? 'page' : undefined}>{item.label}</Link>)}</nav>}
    </header>
  )
}
