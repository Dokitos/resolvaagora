import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { mergeServicePrices } from '@/lib/data/services-catalog'
import { DEFAULT_API_URL } from '@/lib/api/client'
import { SiteHeader } from '../_components/site-header'
import { SiteFooter } from '../_components/site-footer'

export const metadata: Metadata = {
  title: 'Serviços',
  description:
    'Eletricidade, canalização, ar condicionado, pintura, montagem de móveis, limpeza, serralharia, jardinagem, revestimentos, TV e antenas — todos os serviços técnicos ao domicílio da ResolvaAgora, com preço à vista.',
  alternates: { canonical: '/servicos' },
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? DEFAULT_API_URL

async function getServiceCategories() {
  try {
    const res = await fetch(`${API_URL}/service-prices`, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error('failed')
    return mergeServicePrices(await res.json())
  } catch {
    return mergeServicePrices(null)
  }
}

export default async function ServicosPage() {
  const SERVICE_CATEGORIES = await getServiceCategories()

  return (
    <div className="min-h-screen bg-white text-brand-700">
      <SiteHeader />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Todos os nossos serviços</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Uma rede de técnicos especializados para cada tipo de serviço em casa, com preço à vista e garantia de 6 meses.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-7xl space-y-14 px-5 sm:px-8">
          {SERVICE_CATEGORIES.map((cat) => (
            <div key={cat.id} id={cat.id} className="scroll-mt-24 border-b border-gray-100 pb-14 last:border-0">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="flex items-center gap-3 text-2xl font-extrabold text-brand-700">
                  <span className="text-3xl">{cat.emoji}</span>
                  {cat.name}
                </h2>
                <span className="text-sm font-bold text-accent-700">desde {cat.basePrice}€</span>
              </div>
              <p className="mt-2 max-w-2xl text-brand-500">{cat.description}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {cat.subcategories.map((sub) => (
                  <Link
                    key={sub.id}
                    href="/login?from=/booking/category"
                    className="group rounded-xl border border-gray-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-accent-500 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-brand-700">{sub.name}</h3>
                      <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300 transition-colors group-hover:text-accent-600" />
                    </div>
                    <p className="mt-1 text-sm text-brand-500">{sub.description}</p>
                    {sub.hasCustomQuote ? (
                      <p className="mt-2 text-xs font-semibold text-accent-700">Orçamento feito no local</p>
                    ) : (
                      <p className="mt-2 text-xs text-brand-400">{sub.items.length} itens disponíveis</p>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="pb-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-brand-900 px-8 py-8 sm:flex-row sm:items-center sm:px-12">
            <div>
              <h2 className="text-xl font-extrabold text-white sm:text-2xl">Não encontraste o que precisas?</h2>
              <p className="mt-1 text-sm text-white/60">Fala connosco e ajudamos a encontrar o serviço certo.</p>
            </div>
            <Link
              href="/contactos"
              className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-bold text-brand-900 transition-colors hover:bg-accent-600"
            >
              Contactar-nos
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
