'use client'

import { useEffect, useState } from 'react'
import { findCategory } from '@/lib/data/services-catalog'
import { useBookingStore } from '@/lib/store/booking-store'
import { useCatalogStore } from '@/lib/store/catalog-store'
import { catalogContentApi, contentFor, type CatalogContentMap } from '@/lib/api/catalog-content'
import { ServiceCard } from '@/components/catalog/service-card'
import { ServicePhoto, categoryIcon } from '@/components/catalog/service-photo'

export default function CategoryPage() {
  const categoryId = useBookingStore((s) => s.categoryId)
  const setCategory = useBookingStore((s) => s.setCategory)
  const [content, setContent] = useState<CatalogContentMap>({})

  const categories = useCatalogStore((s) => s.categories)
  const category = categoryId ? findCategory(categoryId, categories) : null

  useEffect(() => {
    // Só apresentação (fotografia, "Inclui / Não inclui") — a reserva segue sem ele.
    catalogContentApi.get().then(setContent).catch(() => {})
  }, [])

  if (!category) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Que serviço precisa?</h1>
          <p className="text-sm text-gray-500 mt-1">Escolha uma categoria para começar.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {categories.filter((cat) => !cat.hidden).map((cat) => {
            const Icon = categoryIcon(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className="flex flex-col items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-accent-500 hover:shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50">
                  <Icon className="h-5 w-5 text-brand-700" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">{cat.name}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">desde {cat.basePrice}€</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl bg-brand-900">
        <ServicePhoto
          categoryId={category.id}
          imageUrl={contentFor(content, category.id).imageUrl}
          alt={category.name}
          className="h-32"
          iconClassName="h-12 w-12"
        />
        <div className="p-4">
          <button onClick={() => setCategory('')} className="mb-1 text-xs font-medium text-accent-500">
            ← Mudar categoria
          </button>
          <h1 className="text-xl font-bold text-white">{category.name}</h1>
          <p className="mt-1 text-sm text-white/70">{category.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {category.subcategories.map((sub) => (
          <ServiceCard key={sub.id} category={category} sub={sub} content={contentFor(content, category.id, sub.id)} />
        ))}
      </div>
    </div>
  )
}
