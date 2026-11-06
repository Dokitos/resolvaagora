'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { LayoutDashboard, ClipboardList, Users, AlertTriangle, BarChart2, CreditCard, Star, LogOut, MessageSquare, Tag, Settings, Image as ImageIcon, Mail, Bell, DollarSign, LayoutTemplate, Menu, X, Search, Sun, Moon, ChevronRight } from 'lucide-react'
import { AdminNotificationBell } from './admin-notification-bell'

const groups = [
  { label: 'Operações', items: [
    { href: '/admin/dashboard', label: 'Visão geral', icon: LayoutDashboard },
    { href: '/admin/service-requests', label: 'Pedidos', icon: ClipboardList },
    { href: '/admin/clients', label: 'Clientes', icon: MessageSquare },
    { href: '/admin/technicians', label: 'Técnicos', icon: Users },
    { href: '/admin/sla', label: 'SLA / Alertas', icon: AlertTriangle },
  ] },
  { label: 'Comunicação', items: [
    { href: '/admin/email', label: 'Email', icon: Mail },
    { href: '/admin/notifications', label: 'Notificações', icon: Bell },
  ] },
  { label: 'Negócio', items: [
    { href: '/admin/financials', label: 'Financeiro', icon: CreditCard },
    { href: '/admin/subscriptions', label: 'Assinaturas', icon: Star },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart2 },
  ] },
  { label: 'Conteúdo', items: [
    { href: '/admin/banners', label: 'Banners', icon: ImageIcon },
    { href: '/admin/promo-codes', label: 'Promoções', icon: Tag },
    { href: '/admin/service-prices', label: 'Preços', icon: DollarSign },
    { href: '/admin/service-content', label: 'Apresentação', icon: LayoutTemplate },
    { href: '/admin/settings', label: 'Definições', icon: Settings },
  ] },
]
const nav = groups.flatMap(group => group.items)
const THEME_KEY = 'resolvaagora-admin-theme'
type Theme = 'light' | 'dark'

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>('light')
  const [search, setSearch] = useState('')
  const sidebar = useRef<HTMLElement>(null), workspace = useRef<HTMLDivElement>(null), menuTrigger = useRef<HTMLButtonElement>(null)
  const current = nav.find(item => pathname.startsWith(item.href))
  const name = session?.user.name?.trim() || 'Administrador'
  const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const matches = nav.filter(item => item.label.toLocaleLowerCase('pt').includes(search.trim().toLocaleLowerCase('pt')))
  useEffect(() => { setMenuOpen(false); setSearch('') }, [pathname])
  useEffect(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem(THEME_KEY) } catch {}
    const initial: Theme = saved === 'dark' || saved === 'light' ? saved : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    setTheme(initial); document.documentElement.dataset.adminTheme = initial
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY && (event.newValue === 'dark' || event.newValue === 'light')) {
        setTheme(event.newValue); document.documentElement.dataset.adminTheme = event.newValue
      }
    }
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('storage', onStorage); delete document.documentElement.dataset.adminTheme }
  }, [])
  useEffect(() => {
    if (!menuOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'; workspace.current?.setAttribute('inert', '')
    const focusables = () => Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input') ?? []).filter(el => el.getClientRects().length > 0)
    focusables()[0]?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
      if (event.key !== 'Tab') return
      const list = focusables(), first = list[0], last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    const desktop = window.matchMedia('(min-width:1024px)'), onResize = () => { if (desktop.matches) setMenuOpen(false) }
    desktop.addEventListener('change', onResize); document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow; workspace.current?.removeAttribute('inert')
      document.removeEventListener('keydown', onKey); desktop.removeEventListener('change', onResize); menuTrigger.current?.focus()
    }
  }, [menuOpen])
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next); document.documentElement.dataset.adminTheme = next
    try { localStorage.setItem(THEME_KEY, next) } catch {}
  }
  return (
    <div className="admin-workspace min-h-screen lg:flex">
      <a href="#admin-main" className="admin-skip">Saltar para o conteúdo</a>
      {menuOpen && <button type="button" tabIndex={-1} className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
      <aside ref={sidebar} id="admin-navigation" aria-label="Navegação de administração" role={menuOpen ? 'dialog' : undefined} aria-modal={menuOpen || undefined} className={cn('admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r transition-transform duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0', menuOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-24 shrink-0 items-center justify-between gap-2 px-6">
          <Link href="/admin/dashboard" className="text-xl font-extrabold tracking-tight">Resolva<span className="admin-brand-accent">Agora</span><span className="admin-muted mt-1 block text-[10px] font-medium uppercase tracking-[0.22em]">Administração</span></Link>
          <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="admin-icon-button lg:hidden"><X className="h-5 w-5" /></button>
        </div>
        <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6" aria-label="Áreas do painel">{groups.map(group => <section key={group.label}>
          <h2 className="admin-muted mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em]">{group.label}</h2>
          <div className="space-y-1">{group.items.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={cn('admin-nav-link flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium', active && 'is-active')}><Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" /><span>{label}</span>{active && <ChevronRight className="ml-auto h-3.5 w-3.5" />}</Link>
          })}</div>
        </section>)}</nav>
        <div className="admin-sidebar-footer shrink-0 border-t p-4">
          <div className="mb-3 flex items-center gap-3 px-2"><span className="admin-avatar">{initials}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{name}</p><p className="admin-muted mt-1 text-[11px]">Administrador</p></div></div>
          <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} className="admin-nav-link flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-xs"><LogOut className="h-4 w-4" />Terminar sessão</button>
        </div>
      </aside>
      <div ref={workspace} className="min-w-0 flex-1">
        <header className="admin-topbar sticky top-0 z-30 flex min-h-20 items-center gap-3 border-b px-4 sm:px-7">
          <button ref={menuTrigger} type="button" aria-controls="admin-navigation" aria-expanded={menuOpen} aria-label="Abrir menu" onClick={() => setMenuOpen(true)} className="admin-icon-button shrink-0 lg:hidden"><Menu className="h-5 w-5" /></button>
          <div className="relative min-w-0 max-w-xl flex-1">
            <label className="admin-search flex min-h-11 items-center gap-3 rounded-xl border px-3"><Search aria-hidden="true" className="admin-muted h-4 w-4 shrink-0" /><input type="search" aria-label="Procurar páginas do painel" placeholder="Procurar no painel…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setSearch('') }} className="min-w-0 w-full bg-transparent py-2 text-sm outline-none" /></label>
            {search.trim() && <div className="admin-search-results absolute left-0 right-0 top-full mt-2 max-h-80 overflow-auto rounded-2xl border p-2 shadow-xl">{matches.length ? matches.map(item => <Link key={item.href} href={item.href} className="admin-nav-link flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm" onClick={() => setSearch('')}><item.icon className="h-4 w-4" />{item.label}</Link>) : <p role="status" className="admin-muted px-3 py-4 text-sm">Nenhuma página encontrada.</p>}</div>}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-3">
            <button type="button" onClick={toggleTheme} aria-label={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'} title={theme === 'light' ? 'Tema escuro' : 'Tema claro'} className="admin-icon-button">{theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}</button>
            <AdminNotificationBell /><span className="admin-avatar hidden sm:flex" title={name}>{initials}</span>
          </div>
        </header>
        <main id="admin-main" tabIndex={-1} className="admin-main mx-auto w-full max-w-[1800px] min-w-0 px-4 py-7 outline-none sm:px-7 lg:px-9">
          <div className="admin-muted mb-5 flex items-center gap-2 text-[11px]"><span>Administração</span><ChevronRight className="h-3 w-3" /><span>{current?.label ?? 'Painel'}</span></div>{children}
        </main>
      </div>
    </div>
  )
}
