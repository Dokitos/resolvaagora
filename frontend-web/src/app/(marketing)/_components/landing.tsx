'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, ShieldCheck, CalendarDays, MessageSquare, ArrowUpRight, ArrowRight } from 'lucide-react'
import { useCatalogStore } from '@/lib/store/catalog-store'
import { bannersApi } from '@/lib/api/banners'
import { catalogContentApi, contentFor, type CatalogContentMap } from '@/lib/api/catalog-content'
import type { HomeBanner } from '@/lib/api/types'
import { BannerCarousel } from '@/components/layout/banner-carousel'
import { ServicePhoto, categoryIcon } from '@/components/catalog/service-photo'
import { SiteHeader } from './site-header'
import { SiteFooter } from './site-footer'
import { Reveal } from '@/components/layout/reveal'
import { PromotionSpotlight } from '@/components/layout/promotion-spotlight'

const FEATURED_IDS = ['PLUMBING', 'ELECTRICITY', 'AC', 'FURNITURE', 'CLEANING', 'PAINTING']
const TRUST = [
  { icon: ShieldCheck, label: 'Informação clara sobre o serviço' },
  { icon: CalendarDays, label: 'Marcação simples' },
  { icon: MessageSquare, label: 'Comunicação na app' },
]
const STEPS = [
  ['01', 'Encontre o serviço', 'Consulte os serviços e saiba o que está incluído antes de marcar.'],
  ['02', 'Escolha o momento', 'Indique a morada e escolha o dia e o horário que lhe dão jeito.'],
  ['03', 'Acompanhe cada passo', 'Veja o estado do pedido, receba o orçamento e fale com o técnico.'],
]
const euro = (value: number) => new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value)

export function Landing() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const categories = useCatalogStore(s => s.categories)
  const visible = categories.filter(c => !c.hidden)
  const featured = FEATURED_IDS.flatMap(id => visible.filter(c => c.id === id))
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [content, setContent] = useState<CatalogContentMap>({})
  useEffect(() => {
    let live = true
    bannersApi.list().then(data => { if (live) setBanners(data) }).catch(() => {})
    catalogContentApi.get().then(data => { if (live) setContent(data) }).catch(() => {})
    return () => { live = false }
  }, [])
  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push(query.trim() ? `/servicos?q=${encodeURIComponent(query.trim())}` : '/servicos')
  }
  function handleBannerClick(banner: HomeBanner) {
    if (banner.actionType === 'category' && banner.actionTarget) router.push(`/servicos#${banner.actionTarget}`)
    else if (banner.actionType === 'subscription') router.push('/login?from=/account/subscription')
    else if (banner.actionType === 'url' && banner.actionTarget) {
      if (banner.actionTarget.startsWith('/') && !banner.actionTarget.startsWith('//')) router.push(banner.actionTarget)
      else if (/^https?:\/\//i.test(banner.actionTarget)) window.open(banner.actionTarget, '_blank', 'noopener,noreferrer')
    }
  }
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <SiteHeader />
      <Reveal>
      <section data-reveal className="premium-hero mx-auto grid max-w-[1440px] lg:min-h-[560px] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-5 py-12 sm:px-8 sm:py-16 lg:pl-[max(2rem,calc((100vw_-_1280px)/2))] lg:pr-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Cuidar da casa pode ser simples</p>
          <h1 className="mt-6 max-w-xl text-[42px] font-bold leading-[1.05] tracking-[-0.045em] sm:text-6xl xl:text-[68px]">A sua casa,<br/>em boas mãos.</h1>
          <p className="mt-6 max-w-md text-base leading-7 text-muted">Encontre o serviço certo, escolha o dia e acompanhe cada passo. Nós ajudamos a tratar do resto.</p>
          <form onSubmit={handleSearch} className="mt-8 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-line bg-white p-2 pl-4 focus-within:ring-2 focus-within:ring-accent-700">
            <Search className="h-5 w-5 shrink-0 text-muted" aria-hidden="true"/>
            <input aria-label="Pesquisar serviços" value={query} onChange={e => setQuery(e.target.value)} placeholder="De que serviço precisa?" className="min-w-0 flex-1 bg-transparent py-3 text-base text-ink outline-none placeholder:text-muted"/>
            <button type="submit" className="premium-button min-h-12 shrink-0 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-ink transition-colors hover:bg-accent-600 sm:px-5">Pesquisar</button>
          </form>
        </div>
        <div className="relative min-h-[320px] overflow-hidden sm:min-h-[420px] lg:min-h-[560px]">
          <Image src="/images/home-technician.png" alt="Imagem ilustrativa de um técnico a reparar a canalização de uma cozinha" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="hero-photo object-cover object-[65%_center]"/>
          <div className="auth-floating absolute bottom-6 left-6 right-6 w-fit max-w-[280px] rounded-2xl bg-white/95 p-5 shadow-sm"><p className="text-sm font-semibold">Menos tarefas por resolver.</p><p className="mt-1 text-xs leading-5 text-muted">Mais tempo para aproveitar a sua casa.</p></div>
        </div>
      </section>
      <div className="border-y border-line bg-white"><div className="mx-auto flex max-w-7xl flex-wrap gap-x-10 gap-y-4 px-5 py-5 sm:px-8">{TRUST.map(t => <div key={t.label} className="flex items-center gap-3 text-xs font-medium sm:text-sm"><t.icon className="h-5 w-5 text-ink" aria-hidden="true"/>{t.label}</div>)}</div></div>
      <section data-reveal className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Serviços para o seu dia a dia</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">O que precisa de resolver?</h2></div><Link href="/servicos" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">Ver todos os serviços <ArrowRight className="h-4 w-4"/></Link></div>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map(cat => { const c = contentFor(content, cat.id); return <Link key={cat.id} href={`/servicos#${cat.id}`} className="premium-card group overflow-hidden rounded-2xl border border-line bg-white hover:border-accent-600"><div className="relative"><ServicePhoto categoryId={cat.id} imageUrl={c.imageUrl} alt={cat.name} className="h-48"/>{c.badge && <span className="absolute left-4 top-4 rounded-lg bg-accent-500 px-3 py-1 text-xs font-semibold">{c.badge}</span>}</div><div className="p-6"><div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{cat.name}</h3><ArrowUpRight className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-1 group-hover:translate-x-1"/></div><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{cat.description}</p><p className="mt-4 text-sm text-muted">Desde <strong className="font-semibold text-ink">{euro(cat.basePrice)}</strong></p></div></Link> })}</div>
      </section>
      <PromotionSpotlight />
      <section data-reveal className="mx-auto max-w-7xl px-5 pb-14 sm:px-8"><h2 className="text-2xl font-bold">Encontre por categoria</h2><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{visible.map(cat => { const Icon=categoryIcon(cat.id);return <Link key={cat.id} href={`/servicos#${cat.id}`} className="premium-card flex min-h-[120px] flex-col items-start gap-4 rounded-2xl border border-line bg-white p-5 hover:border-accent-600"><Icon className="h-7 w-7 text-accent-700"/><span className="text-sm font-semibold">{cat.name}</span></Link> })}</div></section>
      {banners.length > 0 && <section data-reveal className="mx-auto max-w-7xl px-5 pb-14 sm:px-8"><h2 className="mb-5 text-2xl font-bold">Destaques</h2><BannerCarousel banners={banners} onBannerClick={handleBannerClick} size="lg"/></section>}
      <section data-reveal className="border-t border-line"><div className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Da primeira dúvida ao serviço feito</p><h2 className="mt-3 text-3xl font-bold sm:text-4xl">Simples, do princípio ao fim.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{STEPS.map(([n,t,d])=><article key={n} className="premium-step rounded-2xl border border-line bg-white p-6"><span className="text-xs font-bold text-accent-700">{n}</span><h3 className="mt-4 text-xl font-semibold">{t}</h3><p className="mt-3 max-w-sm text-sm leading-6 text-muted">{d}</p></article>)}</div></div></section>
      <section data-reveal className="mx-auto max-w-7xl px-5 pb-14 sm:px-8"><div className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-ink p-8 text-white sm:p-12"><div><p className="text-xs font-semibold uppercase tracking-widest text-accent-500">Sempre à mão</p><h2 className="mt-3 text-3xl font-semibold">A sua casa resolvida, no bolso.</h2><p className="mt-3 text-sm text-white/70">Conheça a app e acompanhe os seus serviços onde estiver.</p></div><Link href="/download" className="premium-button inline-flex min-h-12 items-center gap-3 rounded-xl bg-accent-500 px-6 py-3 font-semibold text-ink hover:bg-accent-600">Conhecer a app <ArrowRight className="h-4 w-4"/></Link></div></section>
      </Reveal>
      <SiteFooter />
    </div>
  )
}
export default Landing
