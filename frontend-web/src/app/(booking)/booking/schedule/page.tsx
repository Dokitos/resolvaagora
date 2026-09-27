'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { useBookingStore } from '@/lib/store/booking-store'
import {
  formatPostalInput,
  isPostalComplete,
  lookupPostalCode,
  toLocalDateString,
  type PostalCodeInfo,
} from '@/lib/booking/postal-lookup'
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not-found' | 'offline'>(
    postalCode && city ? 'found' : 'idle',
  )
  const [info, setInfo] = useState<PostalCodeInfo | null>(null)

  useEffect(() => {
    if (!categoryId) router.replace('/booking/category')
  }, [categoryId, router])

  // Pesquisa assim que o código fica completo, com espera curta para não
  // disparar a cada tecla. `cancelled` descarta respostas de um código que o
  // utilizador já alterou entretanto.
  useEffect(() => {
    if (!isPostalComplete(postalInput)) {
      setStatus('idle')
      setInfo(null)
      return
    }
    if (postalInput === postalCode && city) return // já resolvido antes

    let cancelled = false
    setStatus('loading')
    const timer = setTimeout(async () => {
      const r = await lookupPostalCode(postalInput)
      if (cancelled) return
      if (r === 'not-found') {
        setStatus('not-found')
        setInfo(null)
        setLocation(postalInput, '', '')
      } else if (r === 'offline') {
        // Sem rede não se trava a reserva, mas também não se inventa
        // localidade: o backend corrige o distrito ao criar a morada.
        setStatus('offline')
        setInfo(null)
        setLocation(postalInput, '', '')
      } else {
        setStatus('found')
        setInfo(r)
        setLocation(postalInput, r.municipality ?? r.locality ?? '', r.district ?? '')
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postalInput])

  const date = scheduledDate ? new Date(`${scheduledDate}T00:00:00`) : null
  const locationOk = status === 'found' || (status === 'offline' && isPostalComplete(postalInput))
  const valid = Boolean(locationOk && scheduledDate && scheduledHour !== null)

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
          inputMode="numeric"
          value={postalInput}
          onChange={(e) => setPostalInput(formatPostalInput(e.target.value))}
        />
        {status === 'loading' && <p className="mt-1.5 text-xs text-gray-500">A procurar a localização…</p>}
        {status === 'found' && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {[info?.streets[0], city, district].filter(Boolean).join(' · ')}
            {info?.precision === 'approximate' && <span className="text-amber-700"> (aproximada)</span>}
          </p>
        )}
        {status === 'not-found' && (
          <p className="mt-1.5 text-xs text-red-600">Código postal não encontrado — verifique os números.</p>
        )}
        {status === 'offline' && (
          <p className="mt-1.5 text-xs text-amber-700">
            Não foi possível confirmar a localidade agora. Pode continuar.
          </p>
        )}
      </div>

      <SlotPicker
        selectedDate={date}
        selectedHour={scheduledHour}
        onSelectDate={(d) => setScheduledDate(toLocalDateString(d))}
        onSelectHour={setScheduledHour}
      />

      <Button className="w-full" size="lg" disabled={!valid} onClick={() => router.push('/booking/contact')}>
        Continuar
      </Button>
    </div>
  )
}
