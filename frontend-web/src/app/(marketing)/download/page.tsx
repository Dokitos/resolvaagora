import type { Metadata } from 'next'
import Link from 'next/link'
import {
  BadgeCheck,
  BellRing,
  CalendarDays,
  ChevronDown,
  CreditCard,
  MessageCircle,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { SiteHeader } from '../_components/site-header'
import { SiteFooter } from '../_components/site-footer'
import {
  CategoryScreen,
  ChatScreen,
  DetailsScreen,
  HomeScreen,
  Phone,
  ScheduleScreen,
  TrackingScreen,
} from './_components/phone-screens'

export const metadata: Metadata = {
  title: 'Descarregar a app',
  description:
    'A app ResolvaAgora: pede técnicos de confiança para a tua casa, com preço à vista, agendamento ao minuto e acompanhamento do pedido em tempo real.',
  alternates: { canonical: '/download' },
}

/**
 * Links das lojas. A App Store fica "Em breve" enquanto não houver link —
 * basta definir NEXT_PUBLIC_APP_STORE_URL na Vercel quando a app for aprovada.
 */
const PLAY_URL =
  process.env.NEXT_PUBLIC_PLAY_STORE_URL ?? 'https://play.google.com/store/apps/details?id=pt.resolvaagora.app'
const APP_STORE_URL = process.env.NEXT_PUBLIC_APP_STORE_URL || null

const SCREENS = [
  { title: 'Encontra o serviço certo', sub: 'Pesquisa ou explora por categoria.', screen: <HomeScreen />, tone: 'dark' },
  { title: 'Preço à vista', sub: 'Vê quanto custa antes de pedir.', screen: <CategoryScreen />, tone: 'yellow' },
  { title: 'Sabe o que inclui', sub: 'E o que não inclui, sem surpresas.', screen: <DetailsScreen />, tone: 'dark' },
  { title: 'Escolhe o dia e a hora', sub: 'Até dois meses de antecedência.', screen: <ScheduleScreen />, tone: 'yellow' },
  { title: 'Acompanha o pedido', sub: 'Do pagamento à conclusão.', screen: <TrackingScreen />, tone: 'dark' },
  { title: 'Fala com o técnico', sub: 'Mensagens dentro da app.', screen: <ChatScreen />, tone: 'yellow' },
] as const

const FEATURES = [
  { icon: Search, title: 'Tudo num só sítio', desc: 'Eletricidade, canalização, ar condicionado, pintura, montagem de móveis e muito mais.' },
  { icon: BadgeCheck, title: 'Técnicos verificados', desc: 'Profissionais especializados para cada tipo de serviço.' },
  { icon: CalendarDays, title: 'Agenda ao teu ritmo', desc: 'Escolhe o dia e a hora que te dão mais jeito.' },
  { icon: CreditCard, title: 'Pagamento seguro', desc: 'Pagas online, em segurança, quando confirmas o pedido.' },
  { icon: BellRing, title: 'Sempre a par', desc: 'Notificações a cada passo: técnico atribuído, em trânsito, concluído.' },
  { icon: MessageCircle, title: 'Mensagens', desc: 'Combina os detalhes diretamente com o técnico.' },
  { icon: ShieldCheck, title: '6 meses de garantia', desc: 'Nos serviços realizados através da ResolvaAgora.' },
]

const FAQ = [
  {
    q: 'A app é gratuita?',
    a: 'Sim. Descarregar e usar a app não custa nada — só pagas os serviços que pedires.',
  },
  {
    q: 'Preciso de conta para ver os serviços?',
    a: 'Não. Podes explorar os serviços e os preços sem conta. Só precisas de criar conta quando fizeres um pedido.',
  },
  {
    q: 'Posso usar a mesma conta no site e na app?',
    a: 'Sim. A conta é a mesma, e os teus pedidos aparecem nos dois.',
  },
  {
    q: 'Como sei se há técnicos na minha zona?',
    a: 'Indica o código postal da morada ao fazer o pedido. Se tiveres dúvidas, fala connosco antes de reservar.',
  },
  {
    q: 'E se precisar de ajuda com um pedido?',
    a: 'Podes falar com o técnico pelas mensagens da app, ou contactar o nosso suporte em suporte@resolvaagora.pt.',
  },
]

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="currentColor" d="M4 2.8v18.4c0 .5.6.9 1.1.6l15.4-9.2c.4-.3.4-.9 0-1.2L5.1 2.2C4.6 1.9 4 2.3 4 2.8z" />
    </svg>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.4 12.6c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.2-1.2 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.1zM14 5.1c.7-.8 1.2-2 1-3.1-1 0-2.2.7-2.9 1.5-.6.7-1.2 1.9-1 3 1.1.1 2.2-.6 2.9-1.4z"
      />
    </svg>
  )
}

function StoreButtons({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href={PLAY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-3 rounded-2xl bg-accent-500 px-6 py-3.5 text-brand-900 transition-colors hover:bg-accent-600"
      >
        <PlayIcon className="h-6 w-6" />
        <span className="text-left leading-tight">
          <span className="block text-[11px] font-medium">Disponível no</span>
          <span className="block text-base font-extrabold">Google Play</span>
        </span>
      </a>
      {APP_STORE_URL ? (
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={
            dark
              ? 'inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-brand-900 transition-colors hover:bg-gray-100'
              : 'inline-flex items-center justify-center gap-3 rounded-2xl bg-brand-900 px-6 py-3.5 text-white transition-colors hover:bg-black'
          }
        >
          <AppleIcon className="h-6 w-6" />
          <span className="text-left leading-tight">
            <span className="block text-[11px] font-medium">Descarregar na</span>
            <span className="block text-base font-extrabold">App Store</span>
          </span>
        </a>
      ) : (
        <span
          className={
            dark
              ? 'inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/25 px-6 py-3.5 text-white/70'
              : 'inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 px-6 py-3.5 text-brand-500'
          }
        >
          <AppleIcon className="h-6 w-6" />
          <span className="text-left leading-tight">
            <span className="block text-[11px] font-medium">Em breve na</span>
            <span className="block text-base font-extrabold">App Store</span>
          </span>
        </span>
      )}
    </div>
  )
}

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-white text-brand-700">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 to-brand-900">
        <div className="pointer-events-none absolute -right-24 top-10 h-[28rem] w-[28rem] rounded-full bg-accent-500/15 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pt-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="lg:pb-16">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-accent-500">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Grátis · Android {APP_STORE_URL ? 'e iPhone' : '· iPhone em breve'}
            </span>
            <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              A tua casa resolvida, <span className="text-accent-500">no bolso.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-white/70">
              Pede técnicos de confiança em minutos: vê o preço antes de pedir, escolhe o dia e a hora, e acompanha
              tudo até o serviço estar concluído.
            </p>
            <div className="mt-8">
              <StoreButtons dark />
            </div>
            <p className="mt-4 text-sm text-white/50">Mesma conta no site e na app · Pagamento seguro · 6 meses de garantia</p>
          </div>

          <div className="relative -mb-40 flex justify-center self-end lg:justify-end">
            <Phone className="rotate-[4deg] lg:mr-12">
              <HomeScreen />
            </Phone>
          </div>
        </div>
      </section>

      {/* ECRÃS */}
      <section id="ecras" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">Vê a app por dentro</h2>
          <p className="mt-2 text-center text-brand-500">Arrasta para o lado para ver mais ecrãs.</p>
        </div>
        <div className="mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 sm:px-8 lg:px-[max(2rem,calc((100vw_-_80rem)/2_+_2rem))] scroll-px-5 sm:scroll-px-8 lg:scroll-px-[max(2rem,calc((100vw_-_80rem)/2_+_2rem))]">
          {SCREENS.map((s, i) => (
            <div
              key={s.title}
              className={
                'relative flex h-[560px] w-[300px] flex-shrink-0 snap-start flex-col overflow-hidden rounded-3xl px-6 pt-7 ' +
                (s.tone === 'dark' ? 'bg-brand-900 text-white' : 'bg-accent-500 text-brand-900')
              }
            >
              <div
                className={
                  'pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full ' +
                  (s.tone === 'dark' ? 'bg-accent-500/15' : 'bg-white/25')
                }
              />
              <h3 className="relative text-2xl font-extrabold leading-tight">{s.title}</h3>
              <p className={'relative mt-1 text-sm ' + (s.tone === 'dark' ? 'text-white/60' : 'text-brand-900/70')}>{s.sub}</p>
              <div className="relative mt-6 flex justify-center">
                <Phone className={i % 2 ? '-rotate-[5deg] translate-x-6' : 'rotate-[5deg] translate-x-4'}>{s.screen}</Phone>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RECURSOS */}
      <section id="recursos" className="scroll-mt-20 bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Tudo o que precisas para tratar da casa</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50">
                  <f.icon className="h-5 w-5 text-brand-700" />
                </span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-brand-500">{f.desc}</p>
              </div>
            ))}
            <Link
              href="/servicos"
              className="flex flex-col justify-between rounded-2xl bg-brand-900 p-6 text-white transition-colors hover:bg-black"
            >
              <span className="text-sm text-white/60">Prefere o computador?</span>
              <span className="mt-6 text-lg font-bold">
                Ver os serviços no site <span className="text-accent-500">→</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* DÚVIDAS */}
      <section id="duvidas" className="scroll-mt-20 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dúvidas</h2>
          <div className="mt-8 divide-y divide-gray-200 border-y border-gray-200">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-brand-500">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-brand-900 px-8 py-12 sm:px-14">
            <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-white">
                  Descarrega a <span className="text-accent-500">ResolvaAgora</span>
                </h2>
                <p className="mt-2 text-white/60">E fica com um técnico de confiança sempre à mão.</p>
              </div>
              <StoreButtons dark />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
