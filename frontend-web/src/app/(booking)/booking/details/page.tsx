'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useBookingStore } from '@/lib/store/booking-store'
import { Textarea } from '@/components/ui/textarea'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { Button } from '@/components/ui/button'

const MAX_CHARS = 300
const MIN_CHARS = 10

export default function DetailsPage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)
  const description = useBookingStore((s) => s.description)
  const photos = useBookingStore((s) => s.photos)
  const setDetails = useBookingStore((s) => s.setDetails)

  useEffect(() => {
    if (!categoryId) router.replace('/booking/category')
  }, [categoryId, router])

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
