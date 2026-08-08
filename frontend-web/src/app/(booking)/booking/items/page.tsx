'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus } from 'lucide-react'
import { findSubcategory } from '@/lib/data/services-catalog'
import { useBookingStore } from '@/lib/store/booking-store'
import { formatCurrency } from '@/lib/utils'
import { PriceSummaryBar } from '@/components/ui/price-summary-bar'

export default function ItemsPage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)
  const subcategoryId = useBookingStore((s) => s.subcategoryId)
  const itemQuantities = useBookingStore((s) => s.itemQuantities)
  const setItemQuantity = useBookingStore((s) => s.setItemQuantity)
  const itemsTotal = useBookingStore((s) => s.itemsTotal())

  const sub = categoryId && subcategoryId ? findSubcategory(categoryId, subcategoryId) : null

  useEffect(() => {
    if (!sub) router.replace('/booking/category')
  }, [sub, router])

  if (!sub) return null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{sub.name}</h1>
        <p className="text-sm text-gray-500 mt-1">Escolha os itens e quantidades que precisa.</p>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
        {sub.items.map((item) => {
          const qty = itemQuantities[item.id] ?? 0
          return (
            <div key={item.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {formatCurrency(item.price)}{item.unit ? ` / ${item.unit}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setItemQuantity(item.id, Math.max(0, qty - 1))}
                  disabled={qty === 0}
                  className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 disabled:opacity-30"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-sm font-medium">{qty}</span>
                <button
                  onClick={() => setItemQuantity(item.id, qty + 1)}
                  className="h-8 w-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:border-blue-400"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <PriceSummaryBar
        lines={sub.items
          .filter((item) => (itemQuantities[item.id] ?? 0) > 0)
          .map((item) => ({ label: `${itemQuantities[item.id]}x ${item.name}`, amount: item.price * itemQuantities[item.id] }))}
        total={itemsTotal}
        ctaLabel="Continuar"
        onCta={() => router.push('/booking/details')}
      />
    </div>
  )
}
