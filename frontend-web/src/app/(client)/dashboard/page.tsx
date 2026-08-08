'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import { bannersApi } from '@/lib/api/banners'
import { subscriptionsApi } from '@/lib/api/subscriptions'
import type { ServiceRequest, HomeBanner, SubscriptionPlan } from '@/lib/api/types'
import { useBookingStore } from '@/lib/store/booking-store'
import { usePublicSettings } from '@/lib/hooks/use-public-settings'
import { SERVICE_CATEGORIES } from '@/lib/data/services-catalog'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatCurrency, SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import { Plus, ClipboardList, AlertTriangle, Star, ShieldCheck, Award, Users } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const setCategory = useBookingStore((s) => s.setCategory)
  const { settings } = usePublicSettings()
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [loading, setLoading] = useState(true)

  function startBooking(categoryId?: string) {
    if (categoryId) setCategory(categoryId)
    router.push('/booking/category')
  }

  useEffect(() => {
    serviceRequestsApi.list({ limit: 5 }).then(setRequests).finally(() => setLoading(false))
    bannersApi.list().then(setBanners).catch(() => {})
    subscriptionsApi.plans().then((plans) => setPlan(plans[0] ?? null)).catch(() => {})
  }, [])

  const pending = requests.filter((r) =>
    ['QUOTE_SENT', 'AWAITING_PAYMENT', 'ASSIGNED', 'IN_TRANSIT', 'IN_EXECUTION'].includes(r.status),
  )

  function handleBannerClick(banner: HomeBanner) {
    if (banner.actionType === 'category' && banner.actionTarget) startBooking(banner.actionTarget)
    else if (banner.actionType === 'subscription') router.push('/account/subscription')
    else if (banner.actionType === 'url' && banner.actionTarget) window.open(banner.actionTarget, '_blank')
  }

  return (
    <div className="space-y-6">
      {settings?.maintenanceMode && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            {settings.maintenanceMessage || 'Estamos em manutenção. Alguns serviços podem estar temporariamente indisponíveis.'}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Início</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os seus serviços técnicos</p>
        </div>
        <Button onClick={() => startBooking()}>
          <Plus className="h-4 w-4" />
          Novo pedido
        </Button>
      </div>

      {/* Banners */}
      {banners.length > 0 && (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1">
          {banners.map((banner) => (
            <button
              key={banner.id}
              onClick={() => handleBannerClick(banner)}
              className="relative flex-shrink-0 w-72 h-32 rounded-2xl overflow-hidden snap-start text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={banner.imageUrl} alt={banner.title ?? ''} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {(banner.title || banner.subtitle) && (
                <div className="absolute bottom-0 left-0 right-0 p-3.5">
                  {banner.title && <p className="text-white font-bold text-sm">{banner.title}</p>}
                  {banner.subtitle && <p className="text-white/80 text-xs mt-0.5">{banner.subtitle}</p>}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Pendentes */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Pedidos em curso ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-gray-50 p-0">
            {pending.map((sr) => (
              <Link
                key={sr.id}
                href={`/services/${sr.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{SPECIALTY_ICONS[sr.specialty]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{SPECIALTY_LABELS[sr.specialty]}</p>
                    <p className="text-xs text-gray-500">{formatDate(sr.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {sr.quote && (
                    <span className="text-sm font-medium text-gray-700">
                      {formatCurrency(Number(sr.quote.totalCost))}
                    </span>
                  )}
                  <StatusBadge status={sr.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Promo subscrição */}
      {plan && (
        <Link
          href="/account/subscription"
          className="flex items-center gap-4 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white"
        >
          <div className="w-11 h-11 rounded-xl bg-accent-500/20 flex items-center justify-center flex-shrink-0">
            <Star className="h-5 w-5 text-accent-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold">{plan.name}</p>
            <p className="text-sm text-white/70 mt-0.5">
              {plan.freeVisitsCount} visitas grátis/ano · {plan.displacementDiscountPct}% desconto em deslocações
            </p>
          </div>
        </Link>
      )}

      {/* Categorias */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Que serviço precisa?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => startBooking(cat.id)}
              className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col items-center gap-2 hover:border-accent-300 hover:shadow-md transition-all"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-sm font-medium text-gray-700 text-center">{cat.name}</span>
              <span className="text-xs text-gray-400">desde {cat.basePrice}€</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recentes */}
      {requests.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Pedidos recentes
            </CardTitle>
            <Link href="/services" className="text-xs text-accent-600 hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-gray-50 p-0">
            {requests.map((sr) => (
              <Link
                key={sr.id}
                href={`/services/${sr.id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{SPECIALTY_ICONS[sr.specialty]}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{SPECIALTY_LABELS[sr.specialty]}</p>
                    <p className="text-xs text-gray-400">{formatDate(sr.createdAt)}</p>
                  </div>
                </div>
                <StatusBadge status={sr.status} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {!loading && requests.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
          <ClipboardList className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Ainda não tem pedidos</p>
          <p className="text-sm text-gray-400 mt-1">Crie o seu primeiro pedido de serviço</p>
          <Button className="mt-4" size="sm" onClick={() => startBooking()}>
            <Plus className="h-4 w-4" />
            Criar pedido
          </Button>
        </div>
      )}

      {/* Porque escolher-nos */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <div className="text-center">
          <ShieldCheck className="h-6 w-6 text-accent-600 mx-auto" />
          <p className="text-xs text-gray-600 mt-1.5">Técnicos certificados</p>
        </div>
        <div className="text-center">
          <Award className="h-6 w-6 text-accent-600 mx-auto" />
          <p className="text-xs text-gray-600 mt-1.5">6 meses de garantia</p>
        </div>
        <div className="text-center">
          <Users className="h-6 w-6 text-accent-600 mx-auto" />
          <p className="text-xs text-gray-600 mt-1.5">Suporte dedicado</p>
        </div>
      </div>
    </div>
  )
}
