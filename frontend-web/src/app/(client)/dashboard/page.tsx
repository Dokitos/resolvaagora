'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight, CalendarDays, AlertTriangle, RefreshCw, Receipt, Star } from 'lucide-react'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import { bannersApi } from '@/lib/api/banners'
import { subscriptionsApi } from '@/lib/api/subscriptions'
import type { ServiceRequest, HomeBanner, SubscriptionPlan } from '@/lib/api/types'
import { useBookingStore } from '@/lib/store/booking-store'
import { usePublicSettings } from '@/lib/hooks/use-public-settings'
import { useCatalogStore } from '@/lib/store/catalog-store'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { categoryIcon } from '@/components/catalog/service-photo'
import { BannerCarousel } from '@/components/layout/banner-carousel'
import { formatDate, SPECIALTY_LABELS } from '@/lib/utils'

const CLOSED = new Set(['COMPLETED', 'CANCELLED', 'EXPIRED', 'QUOTE_REJECTED', 'DRAFT'])
export default function DashboardPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const categories = useCatalogStore(s => s.categories).filter(c => !c.hidden)
  const setCategory = useBookingStore(s => s.setCategory)
  const { settings } = usePublicSettings()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    let live = true
    setLoading(true); setError(false)
    serviceRequestsApi.list({ limit: 20 }).then(data => { if (live) setRequests(data) })
      .catch(() => { if (live) setError(true) }).finally(() => { if (live) setLoading(false) })
    bannersApi.list().then(data => { if (live) setBanners(data) }).catch(() => {})
    subscriptionsApi.plans().then(data => { if (live) setPlan(data[0] ?? null) }).catch(() => {})
    return () => { live = false }
  }, [reload])
  function startBooking(categoryId?: string) {
    if (categoryId) setCategory(categoryId)
    router.push('/booking/category')
  }
  function handleBannerClick(banner: HomeBanner) {
    if (banner.actionType === 'category' && banner.actionTarget) startBooking(banner.actionTarget)
    else if (banner.actionType === 'subscription') router.push('/account/subscription')
    else if (banner.actionType === 'url' && banner.actionTarget) {
      if (banner.actionTarget.startsWith('/') && !banner.actionTarget.startsWith('//')) router.push(banner.actionTarget)
      else if (/^https?:\/\//i.test(banner.actionTarget)) window.open(banner.actionTarget, '_blank', 'noopener,noreferrer')
    }
  }
  const pending = requests.filter(r => !CLOSED.has(r.status))
  const name = session?.user?.name?.trim().split(' ')[0]
  return (
    <div className="space-y-9">
      {settings?.maintenanceMode && <div role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle className="h-5 w-5 shrink-0"/>{settings.maintenanceMessage || 'Estamos em manutenção. Alguns serviços podem estar temporariamente indisponíveis.'}</div>}
      <section><p className="text-sm text-muted">{name ? `Olá, ${name}` : 'Bem-vindo'}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">De que precisa a sua casa?</h1><p className="mt-3 text-sm text-muted">Um cuidado a menos no seu dia.</p><form onSubmit={e => { e.preventDefault(); router.push(query.trim() ? `/servicos?q=${encodeURIComponent(query.trim())}` : '/servicos') }} className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-2 pl-4 focus-within:ring-2 focus-within:ring-accent-700"><Search className="h-5 w-5 shrink-0 text-muted"/><input aria-label="Pesquisar serviços" value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar serviços" className="min-w-0 flex-1 bg-transparent py-3 text-base outline-none"/><Button type="submit" aria-label="Pesquisar"><ArrowRight className="h-5 w-5"/></Button></form></section>
      <section aria-label="Os seus pedidos ativos">
        {loading ? <div role="status" aria-label="A carregar os seus pedidos" className="h-36 rounded-2xl border border-line bg-white p-6"><div className="h-4 w-2/3 rounded bg-gray-100"/><div className="mt-4 h-4 w-1/3 rounded bg-gray-100"/></div> : error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5"><p className="text-sm text-muted">Não foi possível carregar os pedidos.</p><Button variant="outline" onClick={() => setReload(n => n+1)}><RefreshCw className="h-4 w-4"/>Tentar novamente</Button></div> : pending.length > 0 ? <><div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-lg font-semibold">Os seus serviços em curso</h2><Link href="/services" className="py-3 text-sm font-semibold">Ver pedidos →</Link></div><div className="grid gap-4 md:grid-cols-2">{pending.slice(0,2).map(sr => {const Icon=categoryIcon(sr.specialty==='HVAC'?'AC':sr.specialty);return <article key={sr.id} className="rounded-2xl border border-line bg-white p-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-accent-50 p-3"><Icon className="h-6 w-6 text-accent-700"/></div><div className="min-w-0 flex-1"><h3 className="font-semibold">{SPECIALTY_LABELS[sr.specialty]}</h3><p className="mt-1 text-sm text-muted">{sr.address?.city}</p>{sr.scheduledDate && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><CalendarDays className="h-4 w-4"/>{formatDate(sr.scheduledDate)}</p>}</div></div><div className="mt-4"><StatusBadge status={sr.status}/></div><Link href={`/services/${sr.id}`} className="mt-5 flex min-h-12 items-center justify-center gap-3 rounded-xl bg-accent-500 px-4 text-sm font-semibold hover:bg-accent-600">Acompanhar pedido <ArrowRight className="h-4 w-4"/></Link></article>})}</div></> : <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-6"><div><h2 className="text-lg font-semibold">O próximo cuidado começa aqui.</h2><p className="mt-2 text-sm text-muted">Escolha uma categoria para fazer o seu primeiro pedido.</p></div><Button onClick={() => startBooking()}>Pedir serviço <ArrowRight className="h-4 w-4"/></Button></div>}
      </section>
      <section><h2 className="mb-4 text-lg font-semibold">Serviços para si</h2><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{categories.map(cat => {const Icon=categoryIcon(cat.id);return <button key={cat.id} onClick={() => startBooking(cat.id)} className="flex min-h-[132px] flex-col items-start rounded-2xl border border-line bg-white p-5 text-left transition-colors hover:border-accent-600"><Icon className="h-7 w-7 text-accent-700"/><span className="mt-4 text-sm font-semibold">{cat.name}</span><span className="mt-1 text-xs text-muted">Desde {cat.basePrice.toFixed(2).replace('.',',')} €</span></button>})}</div></section>
      {banners.length > 0 && <section><h2 className="mb-4 text-lg font-semibold">Destaques</h2><BannerCarousel banners={banners} onBannerClick={handleBannerClick}/></section>}
      {plan && <Link href="/account/subscription" className="flex items-center gap-4 rounded-2xl border border-line bg-white p-6"><span className="rounded-xl bg-accent-50 p-3"><Star className="h-6 w-6 text-accent-700"/></span><div className="min-w-0 flex-1"><h2 className="font-semibold">{plan.name}</h2><p className="mt-2 text-sm text-muted">Conheça os benefícios do plano para os seus serviços.</p></div><ArrowRight className="h-5 w-5 shrink-0"/></Link>}
      {!loading && !error && requests.length>0 && <section><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Pedidos recentes</h2><Link href="/services" className="py-3 text-sm font-semibold">Ver todos →</Link></div><div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">{requests.slice(0,4).map(sr=><Link key={sr.id} href={`/services/${sr.id}`} className="flex flex-wrap items-center justify-between gap-3 p-5 transition-colors hover:bg-canvas"><div className="flex items-center gap-3"><Receipt className="h-5 w-5 text-muted"/><div><p className="text-sm font-semibold">{SPECIALTY_LABELS[sr.specialty]}</p><p className="mt-1 text-xs text-muted">{formatDate(sr.createdAt)}</p></div></div><StatusBadge status={sr.status}/></Link>)}</div></section>}
    </div>
  )
}
