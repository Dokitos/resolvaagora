'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api/admin'
import type { DashboardMetrics, SlaAlert, AnalyticsData } from '@/lib/api/types'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusDonut, SpecialtyBars } from '@/components/charts/dashboard-charts'
import { formatCurrency, formatDate, SLA_METRIC_LABELS } from '@/lib/utils'
import { ClipboardList, Users, AlertTriangle, Euro, PieChart, BarChart3 } from 'lucide-react'

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [alerts, setAlerts] = useState<SlaAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.dashboard(), adminApi.slaAlerts(), adminApi.analytics()])
      .then(([m, a, an]) => { setMetrics(m); setAlerts(a); setAnalytics(an) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Operacional</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visão em tempo real das operações</p>
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
