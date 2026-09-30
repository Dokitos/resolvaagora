'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Info, X } from 'lucide-react'
import type { ServiceCategory, ServiceSubcategory } from '@/lib/data/services-catalog'
import type { CatalogContent } from '@/lib/api/catalog-content'
import { useBookingStore } from '@/lib/store/booking-store'
import { cn } from '@/lib/utils'
import { categoryIcon } from './service-photo'

const euro = (n: number) => `${n.toFixed(2).replace('.', ',')}€`

function fromPrice(sub: ServiceSubcategory) {
  const prices = sub.items.filter((i) => !i.hidden).map((i) => i.price)
  return prices.length ? Math.min(...prices) : null
}

/**
 * Escolhe o serviço no carrinho e segue para o passo seguinte. Sem sessão, o
 * layout da reserva manda para o login e, ao voltar, a categoria já está
 * escolhida (o carrinho fica guardado no browser).
 */
function useRequestService(category: ServiceCategory, sub: ServiceSubcategory) {
  const router = useRouter()
  const setCategory = useBookingStore((s) => s.setCategory)
  const setSubcategory = useBookingStore((s) => s.setSubcategory)
  return () => {
    setCategory(category.id)
    setSubcategory(sub.id)
    router.push(sub.hasCustomQuote ? '/booking/details' : '/booking/items')
  }
}

/** Cartão de um serviço: ícone, preço de partida, nome, descrição e ações. */
export function ServiceCard({
  category,
  sub,
  content,
}: {
  category: ServiceCategory
  sub: ServiceSubcategory
  content: CatalogContent
}) {
  const [open, setOpen] = useState(false)
  const request = useRequestService(category, sub)
  const Icon = categoryIcon(category.id)
  const from = fromPrice(sub)

  return (
    <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-accent-50">
          <Icon className="h-6 w-6 text-brand-700" />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] text-brand-500">
            {sub.hasCustomQuote || from === null ? (
              'Orçamento no local'
            ) : (
              <>
                Desde <span className="font-extrabold text-brand-700">{euro(from)}</span>
              </>
            )}
          </p>
          <h3 className="mt-0.5 font-bold text-brand-700">{sub.name}</h3>
          <p className="mt-1 text-sm leading-snug text-brand-500">{sub.description}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs font-bold uppercase tracking-wide text-brand-700 underline underline-offset-4 hover:text-accent-700"
        >
          Saber mais
        </button>
        <button
          type="button"
          onClick={request}
          className="rounded-full bg-brand-900 px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-black"
        >
          Pedir serviço
        </button>
      </div>

      {open && (
        <ServiceDetails
          sub={sub}
          content={content}
          onClose={() => setOpen(false)}
          onRequest={() => {
            setOpen(false)
            request()
          }}
        />
      )}
    </div>
  )
}

type Tab = 'includes' | 'excludes' | 'prices'

/** "Saber mais": o que inclui, o que não inclui e o preço de cada item. */
function ServiceDetails({
  sub,
  content,
  onClose,
  onRequest,
}: {
  sub: ServiceSubcategory
  content: CatalogContent
  onClose: () => void
  onRequest: () => void
}) {
  const items = sub.items.filter((i) => !i.hidden)
  const tabs: { id: Tab; label: string }[] = [
    ...(content.includes.length ? [{ id: 'includes' as const, label: 'Inclui' }] : []),
    ...(content.excludes.length ? [{ id: 'excludes' as const, label: 'Não inclui' }] : []),
    ...(items.length ? [{ id: 'prices' as const, label: 'Preços' }] : []),
  ]
  const [tab, setTab] = useState<Tab | undefined>(tabs[0]?.id)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={sub.name}
        className="relative flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-3 pt-6">
          <div>
            <h2 className="text-xl font-extrabold text-brand-700">{sub.name}</h2>
            <p className="mt-1 text-sm leading-snug text-brand-500">{sub.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex-shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {tabs.length > 1 && (
          <div className="flex gap-6 border-b border-gray-100 px-6">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  '-mb-px border-b-[3px] pb-2.5 pt-1 text-[15px] font-bold transition-colors',
                  tab === t.id ? 'border-brand-900 text-brand-700' : 'border-transparent text-gray-400 hover:text-brand-500',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'includes' && <Bullets items={content.includes} included />}
          {tab === 'excludes' && <Bullets items={content.excludes} included={false} />}
          {tab === 'prices' && (
            <ul className="divide-y divide-gray-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 py-2.5">
                  <div>
                    <p className="text-sm text-brand-700">{item.name}</p>
                    {item.notes?.trim() && <p className="mt-0.5 text-xs text-gray-400">{item.notes}</p>}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-semibold text-brand-700">{euro(item.price)}</p>
                    {item.unit && <p className="text-[11px] text-gray-400">por {item.unit}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex gap-2 rounded-xl bg-accent-50 p-3 text-xs leading-relaxed text-brand-600">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-700" />
            {sub.hasCustomQuote
              ? 'Este serviço é orçamentado pelo técnico no local, depois de avaliar o trabalho.'
              : 'O valor final é confirmado pelo técnico no local, antes de começar o trabalho. Acresce a taxa de deslocação.'}
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onRequest}
            className="w-full rounded-full bg-brand-900 py-3.5 text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-black"
          >
            Pedir serviço
          </button>
        </div>
      </div>
    </div>
  )
}

function Bullets({ items, included }: { items: string[]; included: boolean }) {
  return (
    <ul className="space-y-2.5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3 text-sm leading-snug text-brand-700">
          {included ? (
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
          ) : (
            <X className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
          )}
          {t}
        </li>
      ))}
    </ul>
  )
}
