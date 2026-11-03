'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Pause, Play, Smartphone, Wrench } from 'lucide-react'

const promotions = [
  { label: 'A casa não tira férias', title: 'Aquela tarefa que ficou para depois?', copy: 'Canalização, eletricidade, montagem e muito mais. Encontre o serviço que a sua casa está a pedir.', cta: 'Explorar serviços', href: '/servicos', icon: Wrench },
  { label: 'Planeie com tempo', title: 'O seu dia. O seu melhor horário.', copy: 'Consulte os serviços e escolha uma data até dois meses de antecedência.', cta: 'Planear um serviço', href: '/servicos', icon: CalendarDays },
  { label: 'Leve a casa consigo', title: 'Tudo mais perto, na app.', copy: 'Acompanhe pedidos e comunicações, onde quer que esteja.', cta: 'Conhecer a app', href: '/download', icon: Smartphone },
]

export function PromotionSpotlight() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const [interacting, setInteracting] = useState(false)
  const [reduced, setReduced] = useState(true)
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(preference.matches)
    update(); preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (paused || interacting || reduced) return
    const timer = window.setInterval(() => setActive(a => (a + 1) % promotions.length), 6500)
    return () => window.clearInterval(timer)
  }, [paused, interacting, reduced])
  const slide = promotions[active]
  const Icon = slide.icon
  return (
    <section aria-label="Destaques ResolvaAgora" aria-roledescription="carrossel" className="mx-auto max-w-7xl px-5 py-12 sm:px-8" onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false) }}>
      <div className="promo-spotlight relative isolate overflow-hidden rounded-[28px] bg-ink p-7 text-white sm:p-10 lg:p-12">
        <div className="promo-orbit pointer-events-none absolute -right-16 -top-32 h-96 w-96 rounded-full border border-accent-500/30" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-52 right-20 h-80 w-80 rounded-full bg-accent-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div key={active} className="promo-copy max-w-2xl" role="group" aria-roledescription="diapositivo" aria-label={`${active + 1} de ${promotions.length}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-500">{slide.label}</p>
            <h2 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{slide.title}</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/75">{slide.copy}</p>
            <Link href={slide.href} className="premium-button mt-6 inline-flex min-h-12 items-center gap-6 rounded-xl bg-accent-500 px-5 font-semibold text-ink">{slide.cta}<ArrowUpRight className="h-5 w-5" /></Link>
          </div>
          <div className="hidden h-36 w-36 rotate-[-8deg] items-center justify-center rounded-[32px] border border-white/15 bg-white/5 lg:flex" aria-hidden="true"><Icon key={active} className="promo-copy h-16 w-16 text-accent-500" /></div>
        </div>
        <div className="relative mt-8 flex items-center gap-2">
          {promotions.map((item, i) => <button key={item.label} type="button" aria-label={`Mostrar destaque ${i + 1}: ${item.label}`} aria-pressed={active === i} onClick={() => setActive(i)} className="flex h-11 min-w-11 items-center justify-center rounded-lg"><span className={`h-1 rounded-full transition-all duration-300 ${active === i ? 'w-10 bg-accent-500' : 'w-5 bg-white/40'}`} /></button>)}
          {!reduced && <button type="button" onClick={() => setPaused(!paused)} aria-label={paused ? 'Retomar destaques' : 'Pausar destaques'} className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/25 transition-colors hover:bg-white/10">{paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}</button>}
        </div>
      </div>
    </section>
  )
}
