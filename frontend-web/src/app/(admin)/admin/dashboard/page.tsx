'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AdminRequestBoard } from '@/components/layout/admin-request-board'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import type { DashboardMetrics, SlaAlert, AnalyticsData, ServiceRequest } from '@/lib/api/types'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusDonut, SpecialtyBars } from '@/components/charts/dashboard-charts'
import { formatCurrency, formatDate, SLA_METRIC_LABELS } from '@/lib/utils'
import { ClipboardList, Users, AlertTriangle, Euro, PieChart, BarChart3, ArrowUpRight, RefreshCw } from 'lucide-react'

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [alerts, setAlerts] = useState<SlaAlert[]>([])
  const [loading, setLoading] = useState(true)

  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [boardError, setBoardError] = useState(false)
  const [boardLoading, setBoardLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  useEffect(() => {
    const refresh = () => setRefreshKey(key => key + 1)
    window.addEventListener('admin:new-request', refresh)
    return () => window.removeEventListener('admin:new-request', refresh)
  }, [])
  useEffect(() => {
    let live = true
    setBoardLoading(true)
    setBoardError(false)
    adminApi.serviceRequests({ page: 1, limit: 20 })
      .then(data => { if (live) setRequests(data) })
      .catch(() => { if (live) setBoardError(true) })
      .finally(() => { if (live) setBoardLoading(false) })
    return () => { live = false }
  }, [refreshKey])

  useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.slaAlerts(), adminApi.analytics()])
      .then(([m, a, an]) => { setMetrics(m); setAlerts(a); setAnalytics(an) })
      .catch((err: any) => toast.error(err?.message ?? 'Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="admin-muted mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]">O seu centro de operações</p><h1 className="text-2xl font-bold text-gray-900">Visão geral</h1>
        <p className="text-sm text-gray-500 mt-2">Pedidos, equipa e alertas, num só lugar.</p></div><Link href="/admin/service-requests" className="premium-button inline-flex min-h-11 items-center gap-3 rounded-xl bg-accent-500 px-5 text-sm font-semibold text-brand-900">Abrir pedidos <ArrowUpRight className="h-4 w-4" /></Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pedidos hoje"
          value={metrics?.today.totalRequests ?? 0}
          icon={ClipboardList}
          color="blue"
        />
        <StatCard
          title="Receita hoje"
          value={formatCurrency(metrics?.today.revenue ?? 0)}
          icon={Euro}
          color="green"
        />
        <StatCard
          title="Técnicos disponíveis"
          value={metrics?.activeTechnicians ?? 0}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Alertas SLA activos"
          value={metrics?.activeAlerts ?? 0}
          icon={AlertTriangle}
          color={metrics?.activeAlerts && metrics.activeAlerts > 0 ? 'red' : 'green'}
        />
      </div>

      <section className="space-y-4" aria-labelledby="dashboard-board">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="dashboard-board" className="text-lg font-semibold">Pedidos a acompanhar</h2><p className="admin-muted mt-1 text-xs">Até 20 pedidos recentes. Abra um cartão para consultar os detalhes.</p></div><button type="button" aria-label="Atualizar quadro e indicadores" className="admin-icon-button border border-gray-200" disabled={boardLoading} onClick={() => setRefreshKey(key => key + 1)}><RefreshCw className={`h-4 w-4 ${boardLoading ? 'animate-spin' : ''}`} /></button></div>
        {boardError ? <div role="alert" className="admin-panel p-5 text-sm">Não foi possível carregar o quadro. <button type="button" onClick={() => setRefreshKey(key => key + 1)} className="font-semibold underline">Tentar novamente</button></div>
          : boardLoading ? <div role="status" className="admin-panel admin-muted p-8 text-center text-sm">A carregar pedidos…</div> : <AdminRequestBoard requests={requests} />}
      </section>
      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {metrics?.byStatus && metrics.byStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-4 w-4 text-brand-600" />
                Pedidos por estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StatusDonut data={metrics.byStatus} />
            </CardContent>
          </Card>
        )}

        {analytics?.requestsBySpecialty && analytics.requestsBySpecialty.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-accent-600" />
                Pedidos por especialidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SpecialtyBars data={analytics.requestsBySpecialty} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alertas SLA */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Alertas SLA activos ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`h-4 w-4 ${alert.level === 'CRITICAL' ? 'text-red-600' : 'text-yellow-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {SLA_METRIC_LABELS[alert.metric]}
                      </p>
                      <p className="text-xs text-gray-400">
                        Pedido: {alert.serviceRequest?.id.slice(0, 8) ?? '—'}... • {formatDate(alert.triggeredAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={alert.level === 'CRITICAL' ? 'danger' : 'warning'}>
                    {alert.level === 'CRITICAL' ? 'Crítico' : 'Aviso'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
