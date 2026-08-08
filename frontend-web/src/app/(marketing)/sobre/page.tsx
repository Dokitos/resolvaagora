import type { Metadata } from 'next'
import Link from 'next/link'
import { Wrench, ShieldCheck, Lock, BadgeCheck, Headset, Award, ArrowRight } from 'lucide-react'
import { SiteHeader } from '../_components/site-header'
import { SiteFooter } from '../_components/site-footer'

export const metadata: Metadata = {
  title: 'Sobre nós',
  description:
    'Conheça a ResolvaAgora: uma plataforma que liga clientes a técnicos verificados para serviços de assistência ao domicílio em Portugal, com garantia e pagamento seguro.',
  alternates: { canonical: '/sobre' },
}

const WHY_US = [
  { icon: Wrench, label: 'Técnicos especializados por área', desc: 'Cada pedido é atribuído a um profissional com a especialidade certa.' },
  { icon: ShieldCheck, label: 'Serviços com garantia de 6 meses', desc: 'Qualquer trabalho realizado fica coberto por garantia.' },
  { icon: Lock, label: '100% online, sem complicações', desc: 'Do pedido ao pagamento, tudo feito pela app ou pelo site.' },
  { icon: BadgeCheck, label: 'Preço transparente antes de agendar', desc: 'Sabes o valor estimado logo no início, sem surpresas.' },
  { icon: Headset, label: 'Suporte por chat, telefone e WhatsApp', desc: 'A nossa equipa está disponível para ajudar em qualquer etapa.' },
]

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-white text-brand-700">
      <SiteHeader />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 py-14 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ligamos-te a quem sabe resolver
          </h1>
          <p className="mt-4 text-lg text-white/70">
            A ResolvaAgora nasceu para simplificar um problema comum: encontrar um profissional de confiança
            para tratar de casa, sem incerteza sobre preço, prazo ou qualidade.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <h2 className="text-2xl font-extrabold text-brand-700">A nossa missão</h2>
          <p className="mt-4 text-brand-500">
            Juntamos clientes e técnicos numa só plataforma — eletricidade, canalização, climatização, pintura,
            montagem de móveis, limpeza e muito mais — para que pedir ajuda em casa seja tão simples como
            algumas escolhas num ecrã. Cada técnico da nossa rede é avaliado, e cada serviço fica coberto por
            garantia, para que possas confiar no resultado.
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid overflow-hidden rounded-3xl border border-gray-200 bg-white lg:grid-cols-2">
            <div className="relative flex min-h-[280px] items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900 p-10">
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
                  <li key={w.label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent-50">
                      <w.icon className="h-4.5 w-4.5 text-accent-600" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-brand-700">{w.label}</p>
                      <p className="text-xs text-brand-500">{w.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-8">
          <h2 className="text-2xl font-extrabold text-brand-700 sm:text-3xl">Pronto para resolver o que precisas?</h2>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-6 py-3.5 text-base font-bold text-brand-900 transition-colors hover:bg-accent-600"
            >
              Criar conta grátis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/servicos"
              className="inline-flex items-center justify-center rounded-full border-2 border-brand-700 px-6 py-3.5 text-base font-bold text-brand-700 transition-colors hover:bg-brand-700 hover:text-white"
            >
              Ver serviços
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
