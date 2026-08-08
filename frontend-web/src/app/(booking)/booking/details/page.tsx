'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBookingStore } from '@/lib/store/booking-store'
import { useCatalogStore } from '@/lib/store/catalog-store'
import { findSubcategory } from '@/lib/data/services-catalog'
import { Textarea } from '@/components/ui/textarea'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { Button } from '@/components/ui/button'

const MAX_CHARS = 300
const MIN_CHARS = 10

export default function DetailsPage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)
  const subcategoryId = useBookingStore((s) => s.subcategoryId)
  const description = useBookingStore((s) => s.description)
  const photos = useBookingStore((s) => s.photos)
  const setDetails = useBookingStore((s) => s.setDetails)
  const categories = useCatalogStore((s) => s.categories)

  useEffect(() => {
    if (!categoryId) {
      router.replace('/booking/category')
      return
    }
    // Sem subcategoria escolhida não há como chegar aqui legitimamente: em
    // booking/category/page.tsx toda subcategoria (com ou sem
    // `hasCustomQuote`) passa por setSubcategory() antes de navegar para
    // /booking/items ou diretamente para /booking/details. Um acesso direto
    // a esta rota sem subcategoryId é um salto inválido no wizard.
    if (!subcategoryId) {
      router.replace('/booking/category')
      return
    }
    const sub = findSubcategory(categoryId, subcategoryId, categories)
    if (!sub) {
      router.replace('/booking/category')
    }
  }, [categoryId, subcategoryId, categories, router])

  const valid = description.trim().length >= MIN_CHARS

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Descreva o problema</h1>
        <p className="text-sm text-gray-500 mt-1">Quanto mais detalhe, melhor o técnico se prepara.</p>
      </div>

      <Textarea
        value={description}
        maxLength={MAX_CHARS}
        rows={6}
        placeholder="Ex: A torneira da cozinha está a pingar e não consigo fechar completamente..."
        onChange={(e) => setDetails(e.target.value, photos)}
      />
      <p className="text-xs text-gray-400 text-right -mt-2">{description.length}/{MAX_CHARS}</p>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Fotos (opcional, até 5)</p>
        <PhotoUpload photos={photos} onChange={(next) => setDetails(description, next)} />
      </div>

      <Button className="w-full" size="lg" disabled={!valid} onClick={() => router.push('/booking/schedule')}>
        Continuar
      </Button>
    </div>
  )
}
