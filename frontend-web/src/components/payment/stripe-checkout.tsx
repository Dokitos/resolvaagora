'use client'

import { useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { getStripe } from '@/lib/stripe'
import { Button } from '@/components/ui/button'

interface StripeCheckoutProps {
  clientSecret: string
  publishableKey?: string
  ctaLabel?: string
  returnUrl?: string
  onSuccess: () => void
  onError?: (message: string) => void
}

/**
 * Checkout genérico via Stripe PaymentElement (não CardElement) — mostra
 * dinamicamente os métodos configurados na conta Stripe (Cartão, MB Way,
 * Multibanco), sem lista fixa no código. Reutilizado no wizard de reserva,
 * no pagamento de pedido existente, e na subscrição.
 */
export function StripeCheckout({ clientSecret, publishableKey, ctaLabel = 'Pagar', returnUrl, onSuccess, onError }: StripeCheckoutProps) {
  const stripePromise = useMemo(() => getStripe(publishableKey), [publishableKey])

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, locale: 'pt' }}>
      <CheckoutForm ctaLabel={ctaLabel} returnUrl={returnUrl} onSuccess={onSuccess} onError={onError} />
    </Elements>
  )
}

function CheckoutForm({
  ctaLabel, returnUrl, onSuccess, onError,
}: { ctaLabel: string; returnUrl?: string; onSuccess: () => void; onError?: (message: string) => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)

  // Depois de um redirect (Multibanco/MB Way podem exigir), confirma o estado ao regressar.
  useEffect(() => {
    if (!stripe) return
    const clientSecretParam = new URLSearchParams(window.location.search).get('payment_intent_client_secret')
    if (!clientSecretParam) return
    stripe.retrievePaymentIntent(clientSecretParam).then(({ paymentIntent }) => {
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        onSuccess()
      } else if (paymentIntent?.status === 'requires_payment_method') {
        onError?.('O pagamento não foi concluído. Tente novamente.')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripe])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl ?? window.location.href },
      redirect: 'if_required',
    })

    setLoading(false)

    if (error) {
      const message = error.message ?? 'Não foi possível processar o pagamento.'
      toast.error(message)
      onError?.(message)
      return
    }

    if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!stripe || !elements}>
        {ctaLabel}
      </Button>
    </form>
  )
}
