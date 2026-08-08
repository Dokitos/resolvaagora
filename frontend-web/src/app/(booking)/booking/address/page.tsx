'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useBookingStore } from '@/lib/store/booking-store'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export default function AddressPage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)
  const postalCode = useBookingStore((s) => s.postalCode)
  const city = useBookingStore((s) => s.city)
  const district = useBookingStore((s) => s.district)
  const addressStreet = useBookingStore((s) => s.addressStreet)
  const addressNumber = useBookingStore((s) => s.addressNumber)
  const addressFloor = useBookingStore((s) => s.addressFloor)
  const addressObservations = useBookingStore((s) => s.addressObservations)
  const setAddress = useBookingStore((s) => s.setAddress)

  const [street, setStreet] = useState(addressStreet)
  const [number, setNumber] = useState(addressNumber)
  const [floor, setFloor] = useState(addressFloor)
  const [observations, setObservations] = useState(addressObservations)

  useEffect(() => {
    if (!categoryId) router.replace('/booking/category')
    else if (!postalCode) router.replace('/booking/schedule')
  }, [categoryId, postalCode, router])

  const valid = street.trim().length > 0 && number.trim().length > 0

  function handleContinue() {
    setAddress({ street, number, floor, observations })
    router.push('/booking/summary')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Morada do serviço</h1>
        <div className="flex items-center justify-between mt-1">
          <p className="text-sm text-gray-500">{city}, {district} · {postalCode}</p>
          <button onClick={() => router.push('/booking/schedule')} className="text-xs text-blue-600 font-medium">
            Alterar
          </button>
        </div>
      </div>

      <Input label="Rua *" value={street} onChange={(e) => setStreet(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Número da porta *" value={number} onChange={(e) => setNumber(e.target.value)} />
        <Input label="Andar" value={floor} onChange={(e) => setFloor(e.target.value)} />
      </div>
      <Textarea
        label="Observações"
        rows={3}
        placeholder="Ex: código de acesso, referência do prédio..."
        value={observations}
        onChange={(e) => setObservations(e.target.value)}
      />

      <Button className="w-full" size="lg" disabled={!valid} onClick={handleContinue}>
        Continuar
      </Button>
    </div>
  )
}
