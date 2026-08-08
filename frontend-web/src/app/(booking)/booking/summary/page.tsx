'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { CheckCircle2 } from 'lucide-react'
import { useBookingStore } from '@/lib/store/booking-store'
import { usePublicSettings } from '@/lib/hooks/use-public-settings'
import { findCategory, findSubcategory } from '@/lib/data/services-catalog'
import { promoApi } from '@/lib/api/promo'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import { slotLabel } from '@/components/ui/slot-picker'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { PriceSummaryBar } from '@/components/ui/price-summary-bar'

export default function SummaryPage() {
  const router = useRouter()
  const state = useBookingStore()
  const { settings } = usePublicSettings()
  const setDisplacementFee = useBookingStore((s) => s.setDisplacementFee)
  const setPromo = useBookingStore((s) => s.setPromo)
  const setNif = useBookingStore((s) => s.setNif)
  const setBilling = useBookingStore((s) => s.setBilling)

  const [showPromo, setShowPromo] = useState(false)
  const [promoInput, setPromoInput] = useState(state.promoCode)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMessage, setPromoMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [nifInput, setNifInput] = useState(state.nif)
  const [billingDifferent, setBillingDifferentLocal] = useState(state.billingDifferent)
  const [billingStreet, setBillingStreet] = useState(state.billingStreet)
  const [billingNumber, setBillingNumber] = useState(state.billingNumber)
  const [billingPostalCode, setBillingPostalCode] = useState(state.billingPostalCode)
  const [billingCity, setBillingCity] = useState(state.billingCity)

  useEffect(() => {
    if (!state.categoryId) router.replace('/booking/category')
  }, [state.categoryId, router])

  useEffect(() => {
    if (settings && !state.displacementFee) setDisplacementFee(settings.displacementFee)
  }, [settings, state.displacementFee, setDisplacementFee])

  const category = state.categoryId ? findCategory(state.categoryId) : undefined
  const sub = state.categoryId && state.subcategoryId ? findSubcategory(state.categoryId, state.subcategoryId) : undefined
  const pickedItems = sub?.items.filter((item) => (state.itemQuantities[item.id] ?? 0) > 0) ?? []
  const itemsTotal = state.itemsTotal()

  async function handleApplyPromo() {
    if (!promoInput.trim()) return
    setPromoLoading(true)
    try {
      const result = await promoApi.validate(promoInput.trim(), itemsTotal + state.displacementFee)
      if (result.valid && result.discount) {
        setPromo(promoInput.trim(), result.discount)
        setPromoMessage({ ok: true, text: `Desconto de ${formatCurrency(result.discount)} aplicado.` })
      } else {
        setPromo('', 0)
        setPromoMessage({ ok: false, text: result.message ?? 'Código inválido.' })
      }
    } catch (err: any) {
      setPromoMessage({ ok: false, text: err.message })
    } finally {
      setPromoLoading(false)
    }
  }

  function handleContinue() {
    setNif(nifInput)
    setBilling({
      different: billingDifferent,
      street: billingStreet,
      number: billingNumber,
      postalCode: billingPostalCode,
      city: billingCity,
    })
    router.push('/booking/payment')
  }

  const scheduleText = state.scheduledDate && state.scheduledHour !== null
    ? `${formatDateShort(state.scheduledDate)} · ${slotLabel(state.scheduledHour)}`
    : '—'

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Resumo do pedido</h1>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex justify-between items-start">
            <p className="text-sm font-semibold text-gray-900">{category?.name} · {sub?.name}</p>
            <button onClick={() => router.push('/booking/category')} className="text-xs text-blue-600 font-medium flex-shrink-0">Editar</button>
          </div>
          <p className="text-xs text-gray-500">{state.description}</p>
          {pickedItems.length > 0 && (
            <ul className="text-xs text-gray-600 pt-1 space-y-0.5">
              {pickedItems.map((item) => (
                <li key={item.id}>{state.itemQuantities[item.id]}x {item.name} — {formatCurrency(item.price)}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex justify-between items-start">
            <p className="text-sm font-semibold text-gray-900">Morada e horário</p>
            <button onClick={() => router.push('/booking/address')} className="text-xs text-blue-600 font-medium flex-shrink-0">Editar</button>
          </div>
          <p className="text-xs text-gray-600">{state.addressStreet}, {state.addressNumber}{state.addressFloor ? ` · ${state.addressFloor}` : ''}</p>
          <p className="text-xs text-gray-600">{state.postalCode} {state.city}, {state.district}</p>
          <p className="text-xs text-gray-600">{scheduleText}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex justify-between items-start">
            <p className="text-sm font-semibold text-gray-900">Contacto</p>
            <button onClick={() => router.push('/booking/contact')} className="text-xs text-blue-600 font-medium flex-shrink-0">Editar</button>
          </div>
          <p className="text-xs text-gray-600 flex items-center gap-1">
            +351 {state.phone}
            {state.otpVerified && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          {!showPromo ? (
            <Checkbox label="Tenho um código promocional" checked={showPromo} onChange={() => setShowPromo(true)} />
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input className="flex-1" placeholder="Código promocional" value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} />
                <Button variant="outline" loading={promoLoading} onClick={handleApplyPromo}>Aplicar</Button>
              </div>
              {promoMessage && (
                <p className={promoMessage.ok ? 'text-xs text-green-700' : 'text-xs text-red-600'}>{promoMessage.text}</p>
              )}
            </div>
          )}

          <Input label="NIF (para o recibo)" placeholder="Opcional" value={nifInput} onChange={(e) => setNifInput(e.target.value)} />

          <Checkbox
            label="Morada de faturação diferente"
            checked={billingDifferent}
            onChange={(e) => setBillingDifferentLocal(e.target.checked)}
          />
          {billingDifferent && (
            <div className="space-y-2 pt-1">
              <Input label="Rua" value={billingStreet} onChange={(e) => setBillingStreet(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Número" value={billingNumber} onChange={(e) => setBillingNumber(e.target.value)} />
                <Input label="Código postal" value={billingPostalCode} onChange={(e) => setBillingPostalCode(e.target.value)} />
              </div>
              <Input label="Cidade" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      <PriceSummaryBar
        lines={[
          { label: 'Serviço', amount: itemsTotal },
          { label: 'Taxa de deslocação', amount: state.useFreeVisit ? 0 : state.displacementFee },
          ...(state.promoDiscount > 0 ? [{ label: 'Desconto', amount: -state.promoDiscount }] : []),
        ]}
        total={state.grandTotal()}
        ctaLabel="Continuar para pagamento"
        onCta={handleContinue}
      />
    </div>
  )
}
