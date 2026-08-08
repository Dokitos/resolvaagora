'use client'

import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { SERVICE_CATEGORIES, findCategory } from '@/lib/data/services-catalog'
import { useBookingStore } from '@/lib/store/booking-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function CategoryPage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)
  const setCategory = useBookingStore((s) => s.setCategory)
  const setSubcategory = useBookingStore((s) => s.setSubcategory)

  const category = categoryId ? findCategory(categoryId) : null

  if (!category) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Que serviço precisa?</h1>
          <p className="text-sm text-gray-500 mt-1">Escolha uma categoria para começar.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <p className="mt-2 font-semibold text-sm text-gray-900">{cat.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">desde {cat.basePrice}€</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <button onClick={() => setCategory('')} className="text-xs text-blue-600 font-medium mb-2">
          ← Mudar categoria
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span>{category.emoji}</span> {category.name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">{category.description}</p>
      </div>

      <div className="space-y-2">
        {category.subcategories.map((sub) => (
          <Card key={sub.id} className="hover:border-blue-300 transition-colors">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-sm text-gray-900">{sub.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub.description}</p>
                {sub.hasCustomQuote && (
                  <p className="text-[11px] text-blue-600 mt-1">Orçamento feito no local</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSubcategory(sub.id)
                  router.push(sub.hasCustomQuote ? '/booking/details' : '/booking/items')
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
