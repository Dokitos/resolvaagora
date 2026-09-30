import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight, Search, SearchX } from 'lucide-react'
import { mergeServicePrices } from '@/lib/data/services-catalog'
import { searchCatalog } from '@/lib/data/catalog-search'
import { contentFor, type CatalogContentMap } from '@/lib/api/catalog-content'
import { DEFAULT_API_URL } from '@/lib/api/client'
import { ServiceCard } from '@/components/catalog/service-card'
import { ServicePhoto, categoryIcon } from '@/components/catalog/service-photo'
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

/** Fotografias, selos e "Inclui / Não inclui". Sem eles a página continua completa. */
async function getCatalogContent(): Promise<CatalogContentMap> {
  try {
    const res = await fetch(`${API_URL}/service-content`, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error('failed')
    return await res.json()
  } catch {
    return {}
  }
}

export default async function ServicosPage({ searchParams }: { searchParams: { q?: string } }) {
  const [all, content] = await Promise.all([getServiceCategories(), getCatalogContent()])
  const categories = all.filter((cat) => !cat.hidden)
  const query = (searchParams.q ?? '').trim().slice(0, 80)
  const hits = query ? searchCatalog(categories, query) : null

  return (
    <div className="min-h-screen bg-white text-brand-700">
      <SiteHeader />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Todos os nossos serviços</h1>
          <p className="mt-3 max-w-2xl text-white/70">
            Uma rede de técnicos especializados para cada tipo de serviço em casa, com preço à vista e garantia de 6 meses.
          </p>

          {/* GET simples: a pesquisa funciona mesmo antes de o JavaScript carregar. */}
          <form action="/servicos" className="mt-7 flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-xl">
            <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
            <input
              name="q"
              defaultValue={query}
              maxLength={80}
              placeholder="Ex: Fuga de água na cozinha"
              className="min-w-0 flex-1 bg-transparent py-2 text-sm text-brand-900 outline-none placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="flex-shrink-0 rounded-full bg-brand-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-black"
            >
              Procurar
            </button>
          </form>

          {!hits && (
            <nav className="mt-7 flex flex-wrap gap-2" aria-label="Categorias">
              {categories.map((cat) => {
                const Icon = categoryIcon(cat.id)
                return (
                  <a
                    key={cat.id}
                    href={`#${cat.id}`}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/20"
                  >
                    <Icon className="h-4 w-4 text-accent-500" />
                    {cat.name}
                  </a>
                )
              })}
            </nav>
          )}
        </div>
      </section>

      {hits ? (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-xl font-extrabold sm:text-2xl">
                {hits.length ? `${hits.length} ${hits.length === 1 ? 'serviço' : 'serviços'} para “${query}”` : `Não encontrámos “${query}”`}
              </h2>
              <Link href="/servicos" className="text-sm font-bold text-accent-700 hover:text-accent-900">
                Ver todos os serviços
              </Link>
            </div>

            {hits.length ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {hits.map(({ category, sub }) => (
                  <ServiceCard
                    key={`${category.id}:${sub.id}`}
                    category={category}
                    sub={sub}
                    content={contentFor(content, category.id, sub.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-10 flex flex-col items-center text-center">
                <SearchX className="h-12 w-12 text-gray-300" />
                <p className="mt-3 max-w-md text-brand-500">
                  Experimenta outra palavra, ou fala connosco e ajudamos a encontrar o serviço certo.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl space-y-16 px-5 sm:px-8">
            {categories.map((cat) => {
              const catContent = contentFor(content, cat.id)
              return (
                <div key={cat.id} id={cat.id} className="scroll-mt-24">
                  <div className="grid overflow-hidden rounded-3xl bg-brand-900 sm:grid-cols-[2fr_3fr]">
                    <ServicePhoto
                      categoryId={cat.id}
                      imageUrl={catContent.imageUrl}
                      alt={cat.name}
                      className="h-44 sm:h-full sm:min-h-[200px]"
                      iconClassName="h-16 w-16"
                    />
                    <div className="flex flex-col justify-center p-6 sm:p-8">
                      {catContent.badge && (
                        <span className="mb-3 w-fit rounded-full bg-accent-500 px-3 py-1 text-xs font-bold text-brand-900">
                          {catContent.badge}
                        </span>
                      )}
                      <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{cat.name}</h2>
                      <p className="mt-2 max-w-xl text-white/70">{cat.description}</p>
                      <p className="mt-4 text-sm text-white/60">
                        Desde <span className="text-lg font-extrabold text-accent-500">{cat.basePrice}€</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.subcategories.map((sub) => (
                      <ServiceCard key={sub.id} category={cat} sub={sub} content={contentFor(content, cat.id, sub.id)} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

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
