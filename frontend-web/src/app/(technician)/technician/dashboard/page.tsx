'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { Card } from '@/components/ui/card'
import { Wrench, MapPin, Calendar, AlertCircle } from 'lucide-react'
import type { ServiceRequest } from '@/lib/api/types'

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Atribuído',
  IN_TRANSIT: 'Em trânsito',
  ARRIVED: 'Chegou',
  IN_DIAGNOSIS: 'Em diagnóstico',
  QUOTE_SENT: 'Orçamento enviado',
  QUOTE_APPROVED: 'Orçamento aprovado',
  IN_EXECUTION: 'Em execução',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-yellow-100 text-yellow-800',
  IN_TRANSIT: 'bg-blue-100 text-blue-800',
  ARRIVED: 'bg-purple-100 text-purple-800',
  IN_DIAGNOSIS: 'bg-orange-100 text-orange-800',
  QUOTE_SENT: 'bg-cyan-100 text-cyan-800',
  QUOTE_APPROVED: 'bg-green-100 text-green-800',
  IN_EXECUTION: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
}

const SPECIALTY_LABELS: Record<string, string> = {
  ELECTRICITY: 'Eletricidade',
  PLUMBING: 'Canalização',
  HVAC: 'AVAC',
  APPLIANCES: 'Eletrodomésticos',
}

const ACTIVE_STATUSES = new Set([
  'ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'IN_DIAGNOSIS',
  'QUOTE_SENT', 'QUOTE_APPROVED', 'IN_EXECUTION',
])

export default function TechnicianDashboard() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<ServiceRequest[]>('/technician/service-requests')
      .then((r) => setRequests(r.data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-12 gap-3 text-red-600">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  const active = requests.filter((r) => ACTIVE_STATUSES.has(r.status))
  const completed = requests.filter((r) => r.status === 'COMPLETED')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Painel do Técnico</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{active.length}</p>
          <p className="text-sm text-gray-500 mt-1">Em curso</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
          <p className="text-sm text-gray-500 mt-1">Concluídos</p>
        </Card>
        <Card className="p-4 text-center col-span-2 md:col-span-1">
          <p className="text-2xl font-bold text-gray-700">{requests.length}</p>
          <p className="text-sm text-gray-500 mt-1">Total atribuídos</p>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Serviços ativos</h2>
        {active.length === 0 ? (
          <Card className="p-10 text-center">
            <Wrench className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Não tem serviços ativos de momento.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {active.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">
                      {SPECIALTY_LABELS[r.specialty] ?? r.specialty}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{r.description}</p>
                  {r.address && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      {r.address.street}, {r.address.number} — {r.address.city}, {r.address.district}
                    </div>
                  )}
                  {r.scheduledDate && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      {new Date(r.scheduledDate).toLocaleDateString('pt-PT', {
                        day: '2-digit', month: 'long', year: 'numeric',
                      })}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
