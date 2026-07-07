'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { subscriptionsApi } from '@/lib/api/subscriptions'
import type { Subscription, SubscriptionPlan } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Star, CheckCircle, Zap, Gift, AlertTriangle } from 'lucide-react'

export default function SubscriptionPage() {
  const [current, setCurrent] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  async function load() {
    const [c, p] = await Promise.all([
      subscriptionsApi.current().catch(() => null),
      subscriptionsApi.plans(),
    ])
    setCurrent(c)
    setPlans(p)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubscribe(planId: string) {
    setSubscribing(planId)
    try {
      await subscriptionsApi.subscribe(planId)
      toast.success('Assinatura ativada com sucesso!')
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubscribing(null)
    }
  }

  async function handleCancel() {
    if (!confirm('Tem a certeza que quer cancelar a assinatura?')) return
    setCancelling(true)
    try {
      await subscriptionsApi.cancel()
      toast.success('Assinatura cancelada')
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assinatura</h1>
        <p className="text-sm text-gray-500 mt-0.5">Planos anuais com vantagens exclusivas</p>
      </div>

      {current && current.status === 'ACTIVE' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Star className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">{current.plan.name}</p>
                  <p className="text-sm text-blue-700">Válida até {formatDate(current.expiresAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-900">
                    {current.plan.freeVisitsCount - current.freeVisitsUsed}
                  </p>
                  <p className="text-xs text-blue-600">visitas grátis restantes</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  {cancelling ? 'A cancelar...' : 'Cancelar plano'}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 text-center">
                <Gift className="h-5 w-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">{current.plan.freeVisitsCount} visitas grátis/ano</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">{current.plan.displacementDiscountPct}% desconto deslocação</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <Zap className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-600">
                  {current.plan.priorityScheduling ? 'Agendamento prioritário' : 'Agendamento normal'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {(!current || current.status !== 'ACTIVE') && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800">
              Não tem assinatura ativa. Subscreva um plano para poupar em deslocações e ter visitas gratuitas.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isCurrentPlan = current?.plan.id === plan.id && current?.status === 'ACTIVE'
          return (
            <Card key={plan.id} className={isCurrentPlan ? 'border-blue-400 ring-2 ring-blue-200' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  {isCurrentPlan && <Badge variant="success">Ativo</Badge>}
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {formatCurrency(plan.yearlyPrice)}
                  <span className="text-sm font-normal text-gray-400">/ano</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-blue-500 shrink-0" />
                    {plan.freeVisitsCount} visitas gratuitas/ano
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                    {plan.displacementDiscountPct}% desconto na taxa de deslocação
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 shrink-0 ${plan.priorityScheduling ? 'text-yellow-500' : 'text-gray-300'}`} />
                    <span className={plan.priorityScheduling ? '' : 'text-gray-400 line-through'}>
                      Agendamento prioritário
                    </span>
                  </li>
                </ul>

                {!isCurrentPlan && (
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={subscribing === plan.id || (current?.status === 'ACTIVE')}
                  >
                    {subscribing === plan.id ? 'A processar...' : 'Subscrever'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
