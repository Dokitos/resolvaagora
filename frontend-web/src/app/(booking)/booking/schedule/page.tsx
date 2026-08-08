'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { useBookingStore } from '@/lib/store/booking-store'
import { lookupPostalParts } from '@/lib/booking/postal-lookup'
import { Input } from '@/components/ui/input'
import { SlotPicker } from '@/components/ui/slot-picker'
import { Button } from '@/components/ui/button'

export default function SchedulePage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)
  const postalCode = useBookingStore((s) => s.postalCode)
  const city = useBookingStore((s) => s.city)
  const district = useBookingStore((s) => s.district)
  const scheduledDate = useBookingStore((s) => s.scheduledDate)
  const scheduledHour = useBookingStore((s) => s.scheduledHour)
  const setLocation = useBookingStore((s) => s.setLocation)
  const setScheduledDate = useBookingStore((s) => s.setScheduledDate)
  const setScheduledHour = useBookingStore((s) => s.setScheduledHour)

  const [postalInput, setPostalInput] = useState(postalCode)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!categoryId) router.replace('/booking/category')
  }, [categoryId, router])

  function handlePostalBlur() {
    const parts = lookupPostalParts(postalInput)
    if (parts) {
      setLocation(postalInput, parts.city, parts.district)
      setNotFound(false)
    } else if (postalInput.trim()) {
      setNotFound(true)
      setLocation(postalInput, '', '')
    }
  }

  const date = scheduledDate ? new Date(`${scheduledDate}T00:00:00`) : null
  const valid = Boolean(city && district && scheduledDate && scheduledHour !== null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Localização e horário</h1>
        <p className="text-sm text-gray-500 mt-1">Onde e quando precisa do serviço.</p>
      </div>

      <div>
        <Input
          label="Código postal"
          placeholder="0000-000"
          value={postalInput}
          onChange={(e) => setPostalInput(e.target.value)}
          onBlur={handlePostalBlur}
        />
        {city && district && (
          <p className="mt-1.5 text-xs text-green-700 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> {city}, {district}
          </p>
        )}
        {notFound && (
          <p className="mt-1.5 text-xs text-red-600">Código postal não reconhecido — verifique e tente novamente.</p>
        )}
      </div>

      <SlotPicker
        selectedDate={date}
        selectedHour={scheduledHour}
        onSelectDate={(d) => setScheduledDate(d.toISOString().slice(0, 10))}
        onSelectHour={setScheduledHour}
      />

      <Button className="w-full" size="lg" disabled={!valid} onClick={() => router.push('/booking/contact')}>
        Continuar
      </Button>
    </div>
  )
}
