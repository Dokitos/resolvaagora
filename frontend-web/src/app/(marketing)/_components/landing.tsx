'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Search,
  ShieldCheck,
  BadgeCheck,
  Lock,
  Headset,
  ChevronRight,
  ArrowRight,
  Home as HomeIcon,
  Wrench,
  Settings2,
  Sparkles,
  Zap,
  Award,
} from 'lucide-react'
import { SERVICE_CATEGORIES } from '@/lib/data/services-catalog'

const FEATURED_IDS = ['ELECTRICITY', 'PLUMBING', 'AC', 'FURNITURE', 'CLEANING', 'PAINTING']
const FEATURED = FEATURED_IDS.map((id) => SERVICE_CATEGORIES.find((c) => c.id === id)!)

const TRUST_ROW = [
  { icon: BadgeCheck, label: 'Técnicos verificados' },
  { icon: ShieldCheck, label: '6 meses de garantia' },
  { icon: Lock, label: 'Pagamento 100% seguro' },
  { icon: Headset, label: 'Suporte dedicado' },
]

const STEPS = [
  { icon: Search, title: 'Escolhe', desc: 'Encontra o serviço certo para ti, com preço à vista.' },
  { icon: HomeIcon, title: 'Marca', desc: 'Indica a morada e escolhe o dia e a hora que preferes.' },
  { icon: ShieldCheck, title: 'Confirma', desc: 'Paga online em segurança e deixa o resto connosco.' },
]

const WHY_US = [
  { icon: Wrench, label: 'Técnicos especializados por área' },
  { icon: ShieldCheck, label: 'Serviços com garantia de 6 meses' },
  { icon: Lock, label: '100% online, sem complicações' },
  { icon: BadgeCheck, label: 'Preço transparente antes de agendar' },
  { icon: Headset, label: 'Suporte por chat, telefone e WhatsApp' },
]

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ELECTRICITY: Zap,
  PLUMBING: Settings2,
  PAINTING: Sparkles,
  FURNITURE: Wrench,
  AC: Wind,
  APPLIANCES: Wrench,
  CLEANING: Sparkles,
  LOCKSMITH: Lock,
  GARDEN: Sparkles,
  FLOORING: HomeIcon,
  TV_ANTENNA: Settings2,
}

function Wind(props: { className?: string }) {
  // pequeno ícone próprio para AC — evita depender de mais um import do lucide só para isto
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={props.className}>
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
      <path d="M17.59 20.59A2 2 0 1 0 19 17H2" />
      <path d="M12.59 12.59A2 2 0 1 1 14 16H2" />
    </svg>
  )
}

export function Landing() {
  const router = useRouter()
  const [query, setQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push('/login?from=/booking/category')
  }

  return (
    <div className="min-h-screen bg-white text-brand-700">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="ResolvaAgora" className="h-9 w-auto object-contain" />
          </div>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-brand-600 md:flex">
            <a href="#servicos" className="transition-colors hover:text-accent-600">Serviços</a>
            <a href="#como-funciona" className="transition-colors hover:text-accent-600">Como funciona</a>
            <a href="#porque" className="transition-colors hover:text-accent-600">Porquê nós</a>
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

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900">
        <svg
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 text-accent-500/10"
          viewBox="0 0 600 600"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path d="M0 500 L150 350 L300 480 L450 250 L600 400 L600 600 L0 600 Z" fill="currentColor" />
          <path d="M0 380 L150 260 L300 370 L450 170 L600 300" stroke="currentColor" strokeWidth="3" fill="none" className="text-accent-500/20" />
        </svg>
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent-500">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Serviços para casa, em Portugal
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Num só sítio, <span className="text-accent-500">resolvemos</span> tudo.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/70">
            Reparações, instalações, manutenções, limpezas e muito mais —{' '}
            <span className="font-semibold text-white">com garantia e técnicos especializados.</span>
            <br />
            Diz-nos o que precisas, nós ajudamos.
          </p>

          <form onSubmit={handleSearch} className="mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-xl">
            <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Fuga de água na cozinha"
              className="flex-1 bg-transparent py-2 text-sm text-brand-900 outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="flex-shrink-0 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black"
            >
              Procurar
            </button>
          </form>
        </div>

        {/* trust row sobreposta ao limite do hero */}
        <div className="relative border-t border-white/10 bg-white/[0.04]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-5 py-6 sm:px-8 md:grid-cols-4">
            {TRUST_ROW.map((t) => (
              <div key={t.label} className="flex items-center gap-3">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-500/15">
                  <t.icon className="h-4.5 w-4.5 text-accent-500" />
                </span>
                <span className="text-sm font-medium text-white/90">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLORA SERVIÇOS */}
      <section id="servicos" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-700 sm:text-3xl">
            Explora alguns dos nossos serviços
          </h2>
          <p className="mt-2 text-brand-500">Encontra rapidamente o serviço certo e faz já a tua reserva.</p>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURED.map((cat, i) => {
              const Icon = CATEGORY_ICONS[cat.id] ?? Wrench
              return (
                <Link
                  key={cat.id}
                  href="/login?from=/booking/category"
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900">
                    {i < 2 && (
                      <span className="absolute left-3 top-3 rounded-full bg-accent-500 px-2.5 py-1 text-[11px] font-bold text-brand-900">
                        Popular
                      </span>
                    )}
                    <Icon className="h-14 w-14 text-accent-500/80 transition-transform group-hover:scale-110" />
                    <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-700 shadow">
                      desde {cat.basePrice}€
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-brand-700">{cat.name}</h3>
                    <p className="mt-1 text-sm text-brand-500 line-clamp-2">{cat.description}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* PROMO BANNER */}
      <section className="py-4">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Link
            href="/register"
            className="group flex flex-col items-start justify-between gap-4 overflow-hidden rounded-2xl bg-brand-900 px-8 py-8 sm:flex-row sm:items-center sm:px-12"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-accent-500">Plano Anual</p>
              <h3 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
                Poupa em cada deslocação com o Plano Premium
              </h3>
              <p className="mt-1 text-sm text-white/60">Visitas grátis por ano e desconto na deslocação em todos os serviços.</p>
            </div>
            <span className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-brand-900 transition-colors group-hover:bg-accent-600">
              Conhecer o plano
              <ChevronRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </section>

      {/* SERVIÇOS POR CATEGORIA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-700 sm:text-3xl">Serviços por categoria</h2>
          <p className="mt-2 text-brand-500">Vê todos os serviços disponíveis em cada área.</p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {SERVICE_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href="/login?from=/booking/category"
                className="flex flex-col items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-md"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-semibold text-brand-700">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-700 sm:text-3xl">Como funciona</h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.title}>
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">
                  <step.icon className="h-6 w-6 text-accent-600" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-brand-700">{step.title}</h3>
                <p className="mt-1 text-brand-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PORQUÊ ESCOLHER-NOS */}
      <section id="porque" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid overflow-hidden rounded-3xl border border-gray-200 lg:grid-cols-2">
            <div className="relative flex min-h-[320px] items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-10">
              <div className="pointer-events-none absolute -left-10 -top-10 h-52 w-52 rounded-full bg-accent-500/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent-500/5 blur-3xl" />
              <div className="relative text-center">
                <Award className="mx-auto h-16 w-16 text-accent-500" />
                <p className="mt-4 text-2xl font-extrabold tracking-tight">
                  <span className="text-white">Resolva</span>
                  <span className="text-accent-500">Agora</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center p-10">
              <h2 className="text-2xl font-extrabold tracking-tight text-brand-700 sm:text-3xl">Porquê escolher-nos?</h2>
              <p className="mt-2 text-brand-500">
                Garantimos a tua total satisfação com compromissos que nos diferenciam no mercado.
              </p>
              <ul className="mt-6 space-y-4">
                {WHY_US.map((w) => (
                  <li key={w.label} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-50">
                      <w.icon className="h-4.5 w-4.5 text-accent-600" />
                    </span>
                    <span className="text-sm font-medium text-brand-700">{w.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA / APP */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-900 px-8 py-14 text-center sm:px-16">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
            <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Leva a <span className="text-accent-500">ResolvaAgora</span> no bolso
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-white/60">
              Cria a tua conta e pede um profissional de confiança em minutos, onde quer que estejas.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-base font-bold text-brand-900 transition-colors hover:bg-accent-600"
              >
                Criar conta grátis
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/30 px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10"
              >
                Entrar no portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-8 border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
                  <Wrench className="h-4 w-4 text-accent-500" />
                </span>
                <span className="text-base font-extrabold tracking-tight text-brand-700">
                  Resolva<span className="text-accent-500">Agora</span>
                </span>
              </div>
              <p className="mt-3 text-sm text-brand-500">
                Profissionais de confiança para a tua casa, em todo o país.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm text-brand-500 sm:gap-16">
              <div>
                <h4 className="font-semibold text-brand-700">Apoio</h4>
                <ul className="mt-3 space-y-1.5">
                  <li><a href="mailto:suporte@resolvaagora.pt" className="hover:text-accent-600">suporte@resolvaagora.pt</a></li>
                  <li><Link href="/login" className="hover:text-accent-600">Ajuda e suporte</Link></li>
                  <li><Link href="/login" className="hover:text-accent-600">Termos e condições</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-brand-700">Empresa</h4>
                <ul className="mt-3 space-y-1.5">
                  <li>Per4manceMD · Douglas Miranda</li>
                  <li>NIF 255568789</li>
                  <li>
                    <a href="https://www.resolvaagora.pt" className="hover:text-accent-600">www.resolvaagora.pt</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-gray-200 pt-6 text-xs text-brand-500">
            © {new Date().getFullYear()} ResolvaAgora · Per4manceMD. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
