'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  Zap,
  Droplets,
  Wind,
  PaintRoller,
  Sparkles,
  Hammer,
  Trees,
  Wrench,
  ShieldCheck,
  Clock,
  Star,
  ArrowRight,
} from 'lucide-react'

// r3f não pode ser renderizado no servidor — carrega só no cliente.
const Scene = dynamic(() => import('./scene'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-24 w-24 animate-pulse rounded-full bg-accent-500/30 blur-xl" />
    </div>
  ),
})

const SERVICES = [
  { icon: Zap, label: 'Eletricidade', desc: 'Instalações e avarias elétricas' },
  { icon: Droplets, label: 'Canalização', desc: 'Fugas, desentupimentos e mais' },
  { icon: Wind, label: 'Ar Condicionado', desc: 'Instalação e manutenção' },
  { icon: PaintRoller, label: 'Pintura', desc: 'Interior e exterior' },
  { icon: Sparkles, label: 'Limpeza', desc: 'Doméstica e profissional' },
  { icon: Hammer, label: 'Montagem de Móveis', desc: 'Rápida e sem esforço' },
  { icon: Trees, label: 'Jardinagem', desc: 'Espaços verdes cuidados' },
  { icon: Wrench, label: 'Reparações Gerais', desc: 'Pequenos arranjos em casa' },
]

const STEPS = [
  {
    n: '01',
    title: 'Descreve o que precisas',
    desc: 'Escolhe o serviço, indica a morada e o que queres resolver. Leva menos de um minuto.',
  },
  {
    n: '02',
    title: 'Recebe um profissional',
    desc: 'Ligamos-te a um técnico de confiança e disponível na tua zona, com preço transparente.',
  },
  {
    n: '03',
    title: 'Fica resolvido',
    desc: 'O trabalho é feito, acompanhas tudo pela app e pagas em segurança. Simples assim.',
  },
]

const TRUST = [
  { icon: ShieldCheck, label: 'Profissionais verificados' },
  { icon: Clock, label: 'Resposta rápida' },
  { icon: Star, label: 'Avaliados pelos clientes' },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-brand-600">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-brand-100/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-5 w-5 text-accent-500" fill="currentColor" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-brand-600">
              Resolva<span className="text-accent-500">Agora</span>
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-sm font-medium text-brand-500 md:flex">
            <a href="#servicos" className="transition-colors hover:text-brand-600">Serviços</a>
            <a href="#como-funciona" className="transition-colors hover:text-brand-600">Como funciona</a>
            <a href="#app" className="transition-colors hover:text-brand-600">App</a>
          </nav>
          <Link
            href="/login"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Entrar
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-500/20 blur-3xl" />
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:py-24">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Serviços para casa, em Portugal
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-brand-600 sm:text-5xl lg:text-6xl">
              Resolva Agora —{' '}
              <span className="relative inline-block">
                <span className="relative z-10">profissionais de confiança</span>
                <span className="absolute inset-x-0 bottom-1 z-0 h-3 bg-accent-500/50" />
              </span>{' '}
              para tua casa
            </h1>
            <p className="mt-5 max-w-lg text-lg text-brand-500">
              Eletricistas, canalizadores, pintores e mais — verificados, avaliados
              e disponíveis perto de ti. Pede, acompanha e paga em segurança.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#app"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-base font-bold text-brand-600 shadow-lg shadow-accent-500/30 transition-all hover:bg-accent-600 hover:shadow-accent-500/40"
              >
                Descarregar a app
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-brand-600 px-6 py-3.5 text-base font-bold text-brand-600 transition-colors hover:bg-brand-600 hover:text-white"
              >
                Entrar
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
              {TRUST.map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-sm font-medium text-brand-500">
                  <t.icon className="h-4 w-4 text-accent-600" />
                  {t.label}
                </div>
              ))}
            </div>
          </div>

          {/* 3D */}
          <div className="relative h-[340px] w-full sm:h-[440px] lg:h-[520px]">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700" />
            <div className="absolute inset-0 overflow-hidden rounded-3xl">
              <Scene />
            </div>
          </div>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="bg-brand-50/60 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-600 sm:text-4xl">
              Tudo o que a tua casa precisa
            </h2>
            <p className="mt-3 text-brand-500">
              Uma rede de profissionais para cada tipo de serviço, num só sítio.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
            {SERVICES.map((s) => (
              <div
                key={s.label}
                className="group rounded-2xl border border-brand-100 bg-white p-5 transition-all hover:-translate-y-1 hover:border-accent-500 hover:shadow-xl hover:shadow-brand-100"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 transition-colors group-hover:bg-accent-500">
                  <s.icon className="h-6 w-6 text-accent-500 transition-colors group-hover:text-brand-600" />
                </span>
                <h3 className="mt-4 font-bold text-brand-600">{s.label}</h3>
                <p className="mt-1 text-sm text-brand-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-brand-600 sm:text-4xl">
              Como funciona
            </h2>
            <p className="mt-3 text-brand-500">Três passos e está resolvido.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="relative rounded-2xl border border-brand-100 bg-white p-8">
                <span className="text-5xl font-black text-accent-500/30">{step.n}</span>
                <h3 className="mt-3 text-xl font-bold text-brand-600">{step.title}</h3>
                <p className="mt-2 text-brand-500">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA / APP */}
      <section id="app" className="py-8">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-8 py-14 text-center sm:px-16">
            <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-accent-500/10 blur-3xl" />
            <h2 className="relative text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              Leva a <span className="text-accent-500">ResolvaAgora</span> no bolso
            </h2>
            <p className="relative mx-auto mt-3 max-w-xl text-brand-100">
              Descarrega a app e pede um profissional de confiança em segundos,
              onde quer que estejas.
            </p>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent-500 px-6 py-3.5 text-base font-bold text-brand-600 transition-colors hover:bg-accent-600"
              >
                Descarregar a app
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border-2 border-white/30 px-6 py-3.5 text-base font-bold text-white transition-colors hover:bg-white/10"
              >
                Entrar no portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-16 border-t border-brand-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                  <Zap className="h-4 w-4 text-accent-500" fill="currentColor" />
                </span>
                <span className="text-base font-extrabold tracking-tight text-brand-600">
                  Resolva<span className="text-accent-500">Agora</span>
                </span>
              </div>
              <p className="mt-3 text-sm text-brand-500">
                Profissionais de confiança para a tua casa, em toda a Portugal.
              </p>
            </div>
            <div className="text-sm text-brand-500">
              <h4 className="font-semibold text-brand-600">Contactos</h4>
              <ul className="mt-3 space-y-1.5">
                <li>Per4manceMD · Douglas Miranda</li>
                <li>NIF 255568789</li>
                <li>
                  <a href="mailto:suporte@resolvaagora.pt" className="hover:text-accent-600">
                    suporte@resolvaagora.pt
                  </a>
                </li>
                <li>
                  <a href="https://www.resolvaagora.pt" className="hover:text-accent-600">
                    www.resolvaagora.pt
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-brand-100 pt-6 text-xs text-brand-500">
            © {new Date().getFullYear()} ResolvaAgora · Per4manceMD. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
