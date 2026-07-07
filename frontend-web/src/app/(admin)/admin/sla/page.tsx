'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import type { SlaAlert } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, SLA_METRIC_LABELS, SPECIALTY_LABELS } from '@/lib/utils'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function AdminSlaPage() {
  const [alerts, setAlerts] = useState<SlaAlert[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await adminApi.slaAlerts()
    setAlerts(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAcknowledge(id: string) {
    try {
      await adminApi.acknowledgeAlert(id)
      toast.success('Alerta marcado como resolvido')
      await load()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const critical = alerts.filter((a) => a.level === 'CRITICAL')
  const warnings = alerts.filter((a) => a.level === 'WARNING')

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SLA / Alertas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{alerts.length} alertas activos</p>
      </div>

      {alerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nenhum alerta activo</p>
            <p className="text-sm text-gray-400 mt-1">Todos os SLAs estão a ser cumpridos</p>
          </CardContent>
        </Card>
      )}

      {critical.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas Críticos ({critical.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AlertTable alerts={critical} onAcknowledge={handleAcknowledge} />
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              Avisos ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AlertTable alerts={warnings} onAcknowledge={handleAcknowledge} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AlertTable({ alerts, onAcknowledge }: { alerts: SlaAlert[]; onAcknowledge: (id: string) => void }) {
  return (
    <div className="divide-y divide-gray-100">
      {alerts.map((alert) => (
        <div key={alert.id} className="flex items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Badge variant={alert.level === 'CRITICAL' ? 'danger' : 'warning'}>
                {alert.level === 'CRITICAL' ? 'Crítico' : 'Aviso'}
              </Badge>
              <span className="text-sm font-medium text-gray-900">
                {SLA_METRIC_LABELS[alert.metric]}
              </span>
            </div>
            {alert.serviceRequest && (
              <p className="text-xs text-gray-500">
                {SPECIALTY_LABELS[alert.serviceRequest.specialty]} •{' '}
                {alert.serviceRequest.client?.firstName} {alert.serviceRequest.client?.lastName} •{' '}
                {alert.serviceRequest.address?.city}
              </p>
            )}
            <p className="text-xs text-gray-400">Desde {formatDate(alert.triggeredAt)}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onAcknowledge(alert.id)}>
            <CheckCircle className="h-3.5 w-3.5" />
            Resolver
          </Button>
        </div>
      ))}
    </div>
  )
}
