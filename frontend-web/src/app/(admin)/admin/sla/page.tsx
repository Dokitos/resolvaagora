'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import type { SlaAlert } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, SLA_METRIC_LABELS, SPECIALTY_LABELS } from '@/lib/utils'
import { useNotificationsSocket } from '@/lib/hooks/use-notifications-socket'
import { AlertTriangle, CheckCircle, Info, Clock } from 'lucide-react'

const METRIC_EXPLANATIONS: Record<string, string> = {
  FIRST_RESPONSE: 'Tempo até um pedido em distribuição ser aceite por um técnico.',
  ARRIVAL: 'Tempo entre um técnico ser atribuído e chegar à morada do cliente.',
  RESOLUTION: 'Tempo total desde a criação do pedido até este ficar concluído.',
  QUOTE_EXPIRY: 'Orçamentos enviados ao cliente que estão perto de expirar sem resposta.',
}

type Tab = 'active' | 'resolved'

export default function AdminSlaPage() {
  const [alerts, setAlerts] = useState<SlaAlert[]>([])
  const [summary, setSummary] = useState<{ metric: string; warning: number; critical: number }[]>([])
  const [tab, setTab] = useState<Tab>('active')
  const [loading, setLoading] = useState(true)

  async function load(currentTab: Tab = tab) {
    setLoading(true)
    try {
      const [data, sum] = await Promise.all([
        adminApi.slaAlerts(currentTab === 'resolved'),
        adminApi.slaAlertsSummary(),
      ])
      setAlerts(data)
      setSummary(sum)
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar alertas SLA')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(tab) }, [tab])

  useNotificationsSocket({
    onSlaAlert: () => {
      // Um novo alerta foi disparado — recarrega para refletir em tempo real
      // sem obrigar o admin a atualizar a página manualmente.
      if (tab === 'active') load('active')
      adminApi.slaAlertsSummary().then(setSummary).catch(() => {})
    },
  })

  async function handleAcknowledge(id: string) {
    try {
      await adminApi.acknowledgeAlert(id)
      toast.success('Alerta marcado como resolvido')
      await load(tab)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const critical = alerts.filter((a) => a.level === 'CRITICAL')
  const warnings = alerts.filter((a) => a.level === 'WARNING')
  const totalActive = summary.reduce((s, m) => s + m.warning + m.critical, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SLA / Alertas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Monitorização dos tempos de resposta e execução dos pedidos</p>
      </div>

      {/* Explicação */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 space-y-1.5">
              <p>
                <strong>SLA</strong> (Service Level Agreement) é o tempo máximo aceitável para cada etapa de um
                pedido. Quando um pedido demora mais do que o esperado, esta página mostra um alerta automático:
              </p>
              <ul className="list-disc list-inside space-y-0.5">
                <li><Badge variant="warning" className="mr-1">Aviso</Badge> o tempo já ultrapassou o limite normal — vale a pena verificar.</li>
                <li><Badge variant="danger" className="mr-1">Crítico</Badge> o atraso é significativo — requer ação imediata (ex: redistribuir o pedido).</li>
              </ul>
              <p>
                Clicar em <strong>"Resolver"</strong> marca o alerta como tratado (não altera o pedido em si — usa isto depois de
                verificar ou agir sobre a situação). Os alertas atualizam-se automaticamente em tempo real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo por métrica */}
      {summary.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['FIRST_RESPONSE', 'ARRIVAL', 'RESOLUTION', 'QUOTE_EXPIRY'] as const).map((metric) => {
            const m = summary.find((s) => s.metric === metric)
            const total = (m?.warning ?? 0) + (m?.critical ?? 0)
            return (
              <Card key={metric}>
                <CardContent className="pt-4">
                  <p className="text-xs text-gray-500 font-medium">{SLA_METRIC_LABELS[metric]}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{total}</p>
                  <p className="text-xs text-gray-400 mt-1">{METRIC_EXPLANATIONS[metric]}</p>
                  {total > 0 && (
                    <div className="flex gap-2 mt-2">
                      {(m?.critical ?? 0) > 0 && <Badge variant="danger">{m!.critical} crítico(s)</Badge>}
                      {(m?.warning ?? 0) > 0 && <Badge variant="warning">{m!.warning} aviso(s)</Badge>}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'active' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Ativos {totalActive > 0 && `(${totalActive})`}
        </button>
        <button
          onClick={() => setTab('resolved')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'resolved' ? 'border-brand-600 text-brand-700' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Resolvidos recentemente
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && tab === 'active' && alerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Nenhum alerta ativo</p>
            <p className="text-sm text-gray-400 mt-1">Todos os SLAs estão a ser cumpridos</p>
          </CardContent>
        </Card>
      )}

      {!loading && tab === 'resolved' && alerts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Sem alertas resolvidos recentemente</p>
          </CardContent>
        </Card>
      )}

      {!loading && tab === 'active' && critical.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas Críticos ({critical.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AlertTable alerts={critical} onAcknowledge={handleAcknowledge} resolved={false} />
          </CardContent>
        </Card>
      )}

      {!loading && tab === 'active' && warnings.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-5 w-5" />
              Avisos ({warnings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <AlertTable alerts={warnings} onAcknowledge={handleAcknowledge} resolved={false} />
          </CardContent>
        </Card>
      )}

      {!loading && tab === 'resolved' && alerts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Resolvidos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <AlertTable alerts={alerts} onAcknowledge={handleAcknowledge} resolved />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AlertTable({ alerts, onAcknowledge, resolved }: { alerts: SlaAlert[]; onAcknowledge: (id: string) => void; resolved: boolean }) {
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
                {' • '}
                <Link href={`/admin/service-requests/${alert.serviceRequest.id}`} className="text-brand-600 hover:underline">
                  ver pedido
                </Link>
              </p>
            )}
            <p className="text-xs text-gray-400">
              {resolved && alert.resolvedAt ? `Resolvido em ${formatDate(alert.resolvedAt)}` : `Desde ${formatDate(alert.triggeredAt)}`}
            </p>
          </div>
          {!resolved && (
            <Button size="sm" variant="outline" onClick={() => onAcknowledge(alert.id)}>
              <CheckCircle className="h-3.5 w-3.5" />
              Resolver
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
