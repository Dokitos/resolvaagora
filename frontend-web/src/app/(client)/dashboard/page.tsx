'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import type { ServiceRequest } from '@/lib/api/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatCurrency, SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import { Plus, ClipboardList, Star } from 'lucide-react'

export default function DashboardPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    serviceRequestsApi.list({ limit: 5 }).then(setRequests).finally(() => setLoading(false))
  }, [])

  const pending = requests.filter((r) =>
    ['QUOTE_SENT', 'AWAITING_PAYMENT', 'ASSIGNED', 'IN_TRANSIT', 'IN_EXECUTION'].includes(r.status),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Início</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie os seus serviços técnicos</p>
        </div>
        <Link href="/services/new">
          <Button>
            <Plus className="h-4 w-4" />
            Novo pedido
          </Button>
        </Link>
      </div>

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

      {/* Categorias */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Que serviço precisa?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['ELECTRICITY', 'PLUMBING', 'HVAC', 'APPLIANCES'] as const).map((specialty) => (
            <Link
              key={specialty}
              href={`/services/new?specialty=${specialty}`}
              className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col items-center gap-3 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <span className="text-3xl">{SPECIALTY_ICONS[specialty]}</span>
              <span className="text-sm font-medium text-gray-700 text-center">
                {SPECIALTY_LABELS[specialty]}
              </span>
            </Link>
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
            <Link href="/services" className="text-xs text-blue-600 hover:underline">
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
          <Link href="/services/new">
            <Button className="mt-4" size="sm">
              <Plus className="h-4 w-4" />
              Criar pedido
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
