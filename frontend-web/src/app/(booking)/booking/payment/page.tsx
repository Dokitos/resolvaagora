'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CreditCard, Smartphone, Landmark } from 'lucide-react'
import { useBookingStore } from '@/lib/store/booking-store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const METHODS = [
  { icon: Smartphone, title: 'MB Way', description: 'Confirme o pagamento na app do seu banco.' },
  { icon: CreditCard, title: 'Cartão', description: 'Visa, Mastercard ou American Express.' },
  { icon: Landmark, title: 'Multibanco', description: 'Pague com referência em qualquer ATM.' },
]

export default function PaymentMethodPage() {
  const router = useRouter()
  const categoryId = useBookingStore((s) => s.categoryId)

  useEffect(() => {
    if (!categoryId) router.replace('/booking/category')
  }, [categoryId, router])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Método de pagamento</h1>
        <p className="text-sm text-gray-500 mt-1">Vai poder escolher entre estas opções no passo seguinte.</p>
      </div>

      <div className="space-y-2">
        {METHODS.map((m) => (
          <Card key={m.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <m.icon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{m.title}</p>
                <p className="text-xs text-gray-500">{m.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full" size="lg" onClick={() => router.push('/booking/confirm')}>
        Continuar
      </Button>
    </div>
  )
}
