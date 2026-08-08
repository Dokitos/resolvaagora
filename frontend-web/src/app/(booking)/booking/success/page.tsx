'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { useBookingStore } from '@/lib/store/booking-store'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export default function SuccessPage() {
  const router = useRouter()
  const reset = useBookingStore((s) => s.reset)
  // Capturados uma única vez no primeiro render — reset() (chamado ao navegar
  // para fora) não deve fazer este ecrã "esquecer" o pedido que acabou de criar.
  const initial = useRef({ id: useBookingStore.getState().createdRequestId, total: useBookingStore.getState().grandTotal() })

  useEffect(() => {
    if (!initial.current.id) router.replace('/dashboard')
  }, [router])

  function goToOrder() {
    const id = initial.current.id
    reset()
    router.push(id ? `/services/${id}` : '/services')
  }

  function goHome() {
    reset()
    router.push('/dashboard')
  }

  if (!initial.current.id) return null

  return (
    <div className="flex flex-col items-center text-center gap-4 pt-8">
      <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle2 className="h-9 w-9 text-green-600" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pedido confirmado!</h1>
        <p className="text-sm text-gray-500 mt-1">
          Total pago: {formatCurrency(initial.current.total)}. Vai receber uma notificação assim que um técnico aceitar o pedido.
        </p>
      </div>

      <div className="w-full space-y-2 pt-4">
        <Button className="w-full" size="lg" onClick={goToOrder}>Ver o meu pedido</Button>
        <Button className="w-full" variant="outline" size="lg" onClick={goHome}>Voltar ao início</Button>
      </div>
    </div>
  )
}
