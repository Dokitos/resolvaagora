'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Tag, Save } from 'lucide-react'
import { servicePricesApi } from '@/lib/api/service-prices'
import { SERVICE_CATEGORIES, mergeServicePrices, type ServiceCategory } from '@/lib/data/services-catalog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminServicePricesPage() {
  const [categories, setCategories] = useState<ServiceCategory[]>(SERVICE_CATEGORIES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    servicePricesApi
      .get()
      .then((prices) => setCategories(mergeServicePrices(prices)))
      .catch(() => toast.error('Não foi possível carregar os preços atuais — a mostrar valores por omissão.'))
      .finally(() => setLoading(false))
  }, [])

  function updateCategoryPrice(categoryId: string, value: number) {
    setCategories((prev) => prev.map((c) => (c.id === categoryId ? { ...c, basePrice: value } : c)))
  }

  function updateItemPrice(categoryId: string, subcategoryId: string, itemId: string, value: number) {
    setCategories((prev) =>
      prev.map((c) =>
        c.id !== categoryId
          ? c
          : {
              ...c,
              subcategories: c.subcategories.map((s) =>
                s.id !== subcategoryId
                  ? s
                  : { ...s, items: s.items.map((i) => (i.id !== itemId ? i : { ...i, price: value })) },
              ),
            },
      ),
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      await servicePricesApi.save({
        categories: categories.map((c) => ({ categoryId: c.id, basePrice: c.basePrice })),
        items: categories.flatMap((c) =>
          c.subcategories.flatMap((s) =>
            s.items.map((i) => ({ categoryId: c.id, subcategoryId: s.id, itemId: i.id, price: i.price })),
          ),
        ),
      })
      toast.success('Preços guardados — já refletidos no site.')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  return (
    <div className="max-w-4xl space-y-6 pb-24">
      <div className="flex items-center justify-between sticky top-0 z-10 bg-gray-50 py-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Preços dos serviços
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Estes valores são os que aparecem no site e na app para cada serviço e item.
          </p>
        </div>
        <Button onClick={handleSave} loading={saving} className="bg-brand-600 hover:bg-brand-700">
          <Save className="h-4 w-4" />
          Guardar alterações
        </Button>
      </div>

      <div className="space-y-3">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <details open={cat.id === categories[0]?.id}>
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between select-none">
                <span className="flex items-center gap-2 font-semibold text-gray-900">
                  <span className="text-lg">{cat.emoji}</span>
                  {cat.name}
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">a partir de</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cat.basePrice}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateCategoryPrice(cat.id, Number(e.target.value))}
                      className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <span className="text-gray-500">€</span>
                  </div>
                </span>
              </summary>

              <CardContent className="border-t border-gray-100 pt-3 space-y-4">
                {cat.subcategories.map((sub) => (
                  <div key={sub.id}>
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">{sub.name}</p>
                    {sub.hasCustomQuote ? (
                      <p className="text-xs text-gray-400 italic">Orçamento feito no local — sem lista de preços.</p>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {sub.items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between py-2 gap-3">
                            <span className="text-sm text-gray-700">
                              {item.name}
                              {item.unit && <span className="text-gray-400"> / {item.unit}</span>}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price}
                                onChange={(e) => updateItemPrice(cat.id, sub.id, item.id, Number(e.target.value))}
                                className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                              <span className="text-gray-500 text-sm">€</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </details>
          </Card>
        ))}
      </div>

      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-end pl-60">
        <Button onClick={handleSave} loading={saving} size="lg" className="bg-brand-600 hover:bg-brand-700">
          <Save className="h-4 w-4" />
          Guardar alterações
        </Button>
      </div>
    </div>
  )
}
