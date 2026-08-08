'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useBookingStore } from '@/lib/store/booking-store'
import { submitBooking } from '@/lib/booking/submit'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StripeCheckout } from '@/components/payment/stripe-checkout'

export default function ConfirmPage() {
  const router = useRouter()
  const state = useBookingStore()
  const [loading, setLoading] = useState(false)
  const [checkout, setCheckout] = useState<{ clientSecret: string; publishableKey?: string } | null>(null)
  const isSubmittingRef = useRef(false)

  useEffect(() => {
    if (!state.categoryId) router.replace('/booking/category')
  }, [state.categoryId, router])

  async function handlePay() {
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setLoading(true)
    try {
      let requestId = state.createdRequestId
      if (!requestId) {
        const created = await submitBooking(state)
        requestId = created.id
        state.setCreatedRequestId(requestId)
      }

      const result = await serviceRequestsApi.payFull(requestId, state.itemsTotal())

      if (result.simulated) {
        finishSuccess()
        return
      }

      if (result.clientSecret) {
        setCheckout({ clientSecret: result.clientSecret, publishableKey: result.publishableKey })
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
      isSubmittingRef.current = false
    }
  }

  function finishSuccess() {
    router.push('/booking/success')
  }

  if (checkout) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">Finalize o pagamento</h1>
        <StripeCheckout
          clientSecret={checkout.clientSecret}
          publishableKey={checkout.publishableKey}
          ctaLabel={`Pagar ${formatCurrency(state.grandTotal())}`}
          onSuccess={finishSuccess}
          onError={() => {}}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Confirme e pague</h1>
        <p className="text-sm text-gray-500 mt-1">Cancelamento gratuito até à data e hora agendadas.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Serviço</span>
            <span>{formatCurrency(state.itemsTotal())}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Taxa de deslocação</span>
            <span>{formatCurrency(state.useFreeVisit ? 0 : state.displacementFee)}</span>
          </div>
          {state.promoDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>Desconto</span>
              <span>-{formatCurrency(state.promoDiscount)}</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-1.5 flex justify-between text-sm font-semibold text-gray-900">
            <span>Total (IVA incluído)</span>
            <span>{formatCurrency(state.grandTotal())}</span>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400">
        Ao continuar aceita os{' '}
        <Link href="/account/terms" className="text-blue-600 underline" target="_blank">
          Termos e Condições
        </Link>{' '}
        do ResolvaAgora.
      </p>

      <Button className="w-full" size="lg" loading={loading} onClick={handlePay}>
        Pagar {formatCurrency(state.grandTotal())}
      </Button>
    </div>
  )
}
