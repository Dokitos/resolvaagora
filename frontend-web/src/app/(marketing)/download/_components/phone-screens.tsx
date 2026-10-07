import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Home,
  MapPin,
  MessageCircle,
  Search,
  Send,
  ShieldCheck,
  User,
  X,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { categoryIcon } from '@/components/catalog/service-photo'

/*
 * Ecrãs da app desenhados em código, com o visual atual da app (preto,
 * amarelo, cartões brancos). Ao contrário de capturas, não mostram dados
 * pessoais de ninguém, ficam nítidos em qualquer ecrã e não pesam na página.
 * Os nomes, preços e textos são exemplos do catálogo real.
 */

export function Phone({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-[260px] flex-shrink-0 rounded-[2.6rem] border-[9px] border-[#111] bg-[#111] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      <div className="absolute left-1/2 top-2 z-10 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black" />
      <div className="relative h-[540px] overflow-hidden rounded-[2rem] bg-[#F7F7F8] text-[#161616]">
        <div className="flex h-9 items-center justify-between px-6 pt-1 text-[11px] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-3.5 rounded-[2px] border border-current" />
          </span>
        </div>
        {children}
      </div>
    </div>
  )
}

function TabBar({ active }: { active: 0 | 1 | 2 }) {
  const tabs = [
    { icon: Home, label: 'Início' },
    { icon: ClipboardList, label: 'Os meus serviços' },
    { icon: User, label: 'Conta' },
  ]
  return (
    <div className="absolute inset-x-0 bottom-0 flex justify-around border-t border-gray-200 bg-white pb-4 pt-2">
      {tabs.map((t, i) => (
        <span key={t.label} className={cn('flex flex-col items-center gap-0.5 text-[8.5px]', i === active ? 'font-bold text-[#161616]' : 'text-gray-400')}>
          <t.icon className="h-4 w-4" />
          {t.label}
        </span>
      ))}
    </div>
  )
}

const Pill = ({ price }: { price: string }) => (
  <span className="rounded-full bg-[#161616] px-2 py-0.5 text-[8.5px] text-white">
    desde <b className="text-[#F5B301]">{price}</b>
  </span>
)

/** Início: pesquisa, faixa de confiança e destaques. */
export function HomeScreen() {
  const Plumb = categoryIcon('PLUMBING')
  const Elec = categoryIcon('ELECTRICITY')
  return (
    <>
      <div className="bg-[#161616] px-4 pb-4 pt-1 text-white">
        <p className="text-[11px] text-white/60">Olá 👋</p>
        <p className="mt-1 text-[19px] font-extrabold leading-[1.1]">
          Num só sítio, <span className="text-[#F5B301]">resolvemos</span> tudo.
        </p>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[10.5px] text-gray-400">
          <Search className="h-3.5 w-3.5" /> Do que precisas?
        </div>
      </div>
      <div className="flex gap-2 overflow-hidden px-4 py-3">
        {[
          [BadgeCheck, 'Técnicos verificados'],
          [ShieldCheck, '6 meses de garantia'],
        ].map(([Icon, label]) => {
          const I = Icon as typeof BadgeCheck
          return (
            <span key={label as string} className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[9px] font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#FFF7E0]">
                <I className="h-3 w-3" />
              </span>
              {label as string}
            </span>
          )
        })}
      </div>
      <p className="px-4 text-[12px] font-bold">Explora os nossos serviços</p>
      <div className="mt-2 flex gap-3 overflow-hidden px-4">
        {[
          { Icon: Plumb, name: 'Canalização', price: '30€', badge: 'Mais pedido' },
          { Icon: Elec, name: 'Eletricidade', price: '30€' },
        ].map((c) => (
          <div key={c.name} className="w-[170px] flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="relative flex h-20 items-center justify-center bg-gradient-to-br from-[#1C1C1C] to-[#2E2E2E]">
              <span className="absolute -right-6 -top-4 h-8 w-24 -rotate-[28deg] bg-[#F5B301]/20" />
              <c.Icon className="h-8 w-8 text-[#F5B301]" />
              {c.badge && (
                <span className="absolute left-2 top-2 rounded-full bg-[#F5B301] px-1.5 py-0.5 text-[8px] font-bold">{c.badge}</span>
              )}
            </div>
            <div className="flex items-start justify-between gap-1 p-2">
              <span className="text-[10.5px] font-bold">{c.name}</span>
              <Pill price={c.price} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 px-4 text-[12px] font-bold">Serviços por categoria</p>
      <div className="mt-2 grid grid-cols-3 gap-2 px-4">
        {['ELECTRICITY', 'PLUMBING', 'AC', 'PAINTING', 'FURNITURE', 'LOCKSMITH'].map((id) => {
          const I = categoryIcon(id)
          return (
            <span key={id} className="flex h-12 items-center justify-center rounded-lg border border-gray-200 bg-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[#FFF7E0]">
                <I className="h-3.5 w-3.5" />
              </span>
            </span>
          )
        })}
      </div>
      <TabBar active={0} />
    </>
  )
}

/** Categoria com os cartões de serviço. */
export function CategoryScreen() {
  const Icon = categoryIcon('PLUMBING')
  const services = [
    ['Instalação de Canalização', 'Torneiras, misturadores, sanitas, autoclismos e mais.', 'Desde 7,99€'],
    ['Reparação de Fuga', 'Diagnóstico e reparação de fugas visíveis ou ocultas.', 'Orçamento no local'],
    ['Desentupimento', 'Lavatório, WC, banheira, cozinha ou exterior.', 'Desde 39,99€'],
  ]
  return (
    <>
      <div className="relative -mt-9 flex h-36 items-end bg-gradient-to-br from-[#1C1C1C] to-[#2E2E2E] px-4 pb-3">
        <span className="absolute -right-8 top-6 h-12 w-36 -rotate-[28deg] bg-[#F5B301]/20" />
        <Icon className="absolute right-6 top-12 h-12 w-12 text-[#F5B301]" />
        <ArrowLeft className="absolute left-4 top-11 h-4 w-4 text-white" />
        <span className="text-[17px] font-bold text-white">Canalização</span>
      </div>
      <div className="space-y-2 px-3 py-3">
        {services.map(([name, desc, price]) => (
          <div key={name} className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex gap-2.5">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF7E0]">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[9px] text-gray-500">{price}</p>
                <p className="text-[11px] font-bold">{name}</p>
                <p className="text-[9px] leading-snug text-gray-500">{desc}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[8.5px] font-bold underline">SABER MAIS</span>
              <span className="rounded-full bg-[#161616] px-3 py-1.5 text-[8.5px] font-bold text-white">PEDIR SERVIÇO</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/** "Saber mais" com o separador Inclui. */
export function DetailsScreen() {
  return (
    <>
      <div className="opacity-40">
        <CategoryScreen />
      </div>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white px-4 pb-5 pt-2">
        <span className="mx-auto block h-1 w-8 rounded-full bg-gray-300" />
        <p className="mt-3 text-[15px] font-bold">Reparação de Fuga</p>
        <p className="mt-0.5 text-[10px] text-gray-500">Diagnóstico e reparação de fugas visíveis ou ocultas.</p>
        <div className="mt-3 flex gap-4 text-[11px] font-bold">
          <span className="border-b-2 border-[#161616] pb-1">Inclui</span>
          <span className="pb-1 text-gray-400">Não inclui</span>
        </div>
        <ul className="mt-3 space-y-2 text-[10.5px]">
          {['Localização da fuga no local', 'Orçamento antes de qualquer reparação', 'Reparação, se aprovada'].map((t) => (
            <li key={t} className="flex gap-2">
              <Check className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
              {t}
            </li>
          ))}
          <li className="flex gap-2 text-gray-400">
            <X className="h-3.5 w-3.5 flex-shrink-0" />
            Reparação de danos causados pela fuga
          </li>
        </ul>
        <div className="mt-4 rounded-full bg-[#161616] py-2.5 text-center text-[10px] font-bold text-white">PEDIR SERVIÇO</div>
      </div>
    </>
  )
}

/** Agendamento: calendário e horas. */
export function ScheduleScreen() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  return (
    <div className="px-4">
      <ArrowLeft className="h-4 w-4" />
      <p className="mt-2 text-[15px] font-bold leading-tight">Para quando preferes agendar o serviço?</p>
      <div className="mt-3 rounded-xl bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <ChevronLeft className="h-3.5 w-3.5 text-gray-300" /> Outubro <ChevronRight className="h-3.5 w-3.5" />
        </div>
        <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[9px]">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
            <span key={i} className="text-gray-400">{d}</span>
          ))}
          {[null, null].map((_, i) => <span key={`e${i}`} />)}
          {days.map((d) => {
            const sunday = (d + 2) % 7 === 0
            return (
              <span
                key={d}
                className={cn(
                  'mx-auto flex h-5 w-5 items-center justify-center rounded-full',
                  d === 16 && 'bg-[#161616] font-bold text-white',
                  (d < 9 || sunday) && 'text-gray-300',
                )}
              >
                {d}
              </span>
            )
          })}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[9.5px]">
        {['09:00 – 10:00', '10:00 – 11:00', '14:00 – 15:00', '15:00 – 16:00'].map((t, i) => (
          <span key={t} className={cn('rounded-lg border bg-white py-2 text-center', i === 2 ? 'border-[#161616] font-bold' : 'border-gray-200')}>
            {t}
          </span>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-gray-200 bg-white px-4 pb-5 pt-3">
        <span className="text-[12px] font-bold">39,99€</span>
        <span className="rounded-full bg-[#161616] px-5 py-2 text-[9.5px] font-bold text-white">CONTINUAR</span>
      </div>
    </div>
  )
}

/** Acompanhamento do pedido. */
export function TrackingScreen() {
  const steps: [string, string, 'done' | 'now' | 'next'][] = [
    ['Pago', '14 out · 10:03', 'done'],
    ['A procurar técnico', '14 out · 10:03', 'done'],
    ['Técnico atribuído', 'Ricardo · 14 out · 10:20', 'done'],
    ['Em trânsito', '16 out · 14:48', 'now'],
    ['Concluído', '', 'next'],
  ]
  return (
    <div className="px-4">
      <ArrowLeft className="h-4 w-4" />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[15px] font-bold">Desentupimento</p>
        <span className="rounded-full bg-[#FFF7E0] px-2 py-0.5 text-[8.5px] font-bold text-[#B8860B]">Em trânsito</span>
      </div>
      <div className="mt-3 rounded-xl bg-white p-3 shadow-sm">
        <p className="text-[10.5px] font-bold">Acompanhamento</p>
        <ol className="mt-2">
          {steps.map(([title, sub, state], i) => (
            <li key={title} className="flex gap-2.5">
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full',
                    state === 'done' && 'bg-[#161616] text-white',
                    state === 'now' && 'bg-[#F5B301] ring-4 ring-[#F5B301]/25',
                    state === 'next' && 'border-2 border-gray-200 bg-white',
                  )}
                >
                  {state === 'done' && <Check className="h-2.5 w-2.5" />}
                </span>
                {i < steps.length - 1 && <span className="h-6 w-px bg-gray-200" />}
              </span>
              <span className="-mt-0.5 pb-1">
                <span className={cn('block text-[10px] font-semibold', state === 'next' && 'text-gray-400')}>{title}</span>
                {sub && <span className="block text-[8.5px] text-gray-500">{sub}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="mt-3 flex items-center gap-2.5 rounded-xl bg-white p-3 shadow-sm">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#161616] text-[11px] font-bold text-[#F5B301]">R</span>
        <span className="flex-1">
          <span className="block text-[10.5px] font-bold">Ricardo</span>
          <span className="flex items-center gap-1 text-[8.5px] text-gray-500"><Clock className="h-2.5 w-2.5" /> 16 out · 15:00 – 16:00</span>
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#FFF7E0]">
          <MessageCircle className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[9px] text-gray-500">
        <MapPin className="h-3 w-3" /> Lisboa
      </div>
      <TabBar active={1} />
    </div>
  )
}

/** Mensagens com o técnico. */
export function ChatScreen() {
  const msgs: [string, boolean][] = [
    ['Olá! Sou o Ricardo, vou tratar do desentupimento amanhã às 15h.', false],
    ['Ótimo, obrigado! O prédio tem estacionamento à porta.', true],
    ['Perfeito. Se precisar de mais alguma coisa, diga por aqui 👍', false],
  ]
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-gray-200 bg-white px-4 pb-2.5">
        <ArrowLeft className="h-4 w-4" />
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#161616] text-[10px] font-bold text-[#F5B301]">R</span>
        <span>
          <span className="block text-[11px] font-bold">Ricardo</span>
          <span className="block text-[8.5px] text-gray-500">Desentupimento</span>
        </span>
      </div>
      <div className="space-y-2 px-3 py-3">
        {msgs.map(([text, mine]) => (
          <p
            key={text}
            className={cn(
              'max-w-[78%] rounded-2xl px-3 py-2 text-[10px] leading-snug',
              mine ? 'ml-auto rounded-br-md bg-[#161616] text-white' : 'rounded-bl-md bg-white shadow-sm',
            )}
          >
            {text}
          </p>
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-gray-200 bg-white px-3 pb-5 pt-2.5">
        <span className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-[9.5px] text-gray-400">Escreve uma mensagem…</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F5B301]">
          <Send className="h-3.5 w-3.5" />
        </span>
      </div>
    </>
  )
}
