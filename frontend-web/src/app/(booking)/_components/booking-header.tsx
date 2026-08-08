'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, X } from 'lucide-react'
import { BOOKING_STEPS, stepIndex } from '@/lib/booking/steps'
import { useBookingStore } from '@/lib/store/booking-store'

export function BookingHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const reset = useBookingStore((s) => s.reset)

  if (pathname.startsWith('/booking/success')) return null

  const idx = stepIndex(pathname)
  const current = idx >= 0 ? idx + 1 : 1
  const step = idx >= 0 ? BOOKING_STEPS[idx] : null

  function handleClose() {
    if (window.confirm('Sair da reserva? O progresso desta sessão será perdido.')) {
      reset()
      router.push('/dashboard')
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 p-1 -ml-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium text-gray-900">{step?.label ?? 'Reserva'}</span>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 p-1 -mr-1">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="max-w-xl mx-auto px-4 pb-3">
        <div className="flex items-center gap-1">
          {BOOKING_STEPS.map((s, i) => (
            <div
              key={s.path}
              className={
                i + 1 <= current
                  ? 'h-1.5 flex-1 rounded-full bg-blue-600'
                  : 'h-1.5 flex-1 rounded-full bg-gray-200'
              }
            />
          ))}
        </div>
      </div>
    </header>
  )
}
