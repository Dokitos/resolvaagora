'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api/admin'
import type { Subscription, SubscriptionPlan } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Star, CheckCircle } from 'lucide-react'

interface SubscriptionRow extends Subscription {
  client?: { firstName: string; lastName: string; user?: { email: string } }
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' }> = {
  ACTIVE:    { label: 'Ativa',     variant: 'success' },
  EXPIRED:   { label: 'Expirada',  variant: 'danger' },
  CANCELLED: { label: 'Cancelada', variant: 'warning' },
  PENDING:   { label: 'Pendente',  variant: 'default' },
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    Promise.all([
      adminApi.subscriptions(),
      adminApi.plans(),
    ]).then(([s, p]) => {
      setSubs(s)
      setPlans(p)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = filter ? subs.filter((s) => s.status === filter) : subs
  const active = subs.filter((s) => s.status === 'ACTIVE')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assinaturas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subs.length} assinaturas no total</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assinaturas Ativas"
          value={active.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Receita Anual"
          value={formatCurrency(active.reduce((s, sub) => s + Number(sub.plan.yearlyPrice), 0))}
          icon={Star}
          color="green"
        />
        <StatCard
          title="Visitas Gratuitas Usadas"
          value={active.reduce((s, sub) => s + sub.freeVisitsUsed, 0)}
          icon={CheckCircle}
          color="yellow"
        />
      </div>

      {plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const planActive = subs.filter((s) => s.status === 'ACTIVE' && s.plan.id === plan.id)
            return (
              <Card key={plan.id} className="border-blue-100">
                <CardContent className="py-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{plan.name}</span>
                    <Badge variant="default">{planActive.length} ativos</Badge>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 mb-3">{formatCurrency(plan.yearlyPrice)}<span className="text-sm font-normal text-gray-400">/ano</span></p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>✓ {plan.freeVisitsCount} visitas gratuitas</li>
                    <li>✓ {plan.displacementDiscountPct}% desconto em deslocação</li>
                    {plan.priorityScheduling && <li>✓ Agendamento prioritário</li>}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Lista de Assinaturas</CardTitle>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todas</option>
              <option value="ACTIVE">Ativas</option>
              <option value="EXPIRED">Expiradas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Plano</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Início</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Expiração</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">Visitas Usadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((sub) => {
                    const sm = STATUS_MAP[sub.status] ?? { label: sub.status, variant: 'default' as const }
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            {sub.client?.firstName} {sub.client?.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{sub.client?.user?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{sub.plan.name}</td>
                        <td className="px-6 py-4">
                          <Badge variant={sm.variant}>{sm.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(sub.startsAt)}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(sub.expiresAt)}</td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {sub.freeVisitsUsed} / {sub.plan.freeVisitsCount}
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Sem assinaturas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
