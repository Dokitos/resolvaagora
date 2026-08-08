import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/** Singleton loadStripe — evita recarregar o script Stripe.js a cada render. */
export function getStripe(publishableKey?: string) {
  const key = publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) return Promise.resolve(null)
  if (!stripePromise) stripePromise = loadStripe(key)
  return stripePromise
}
