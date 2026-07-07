'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api/admin'
import type { AnalyticsData } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import { Star, CheckCircle, FileText, BarChart2 } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.analytics().then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return null

  const specialtyChartData = data.requestsBySpecialty.map((item) => ({
    name: SPECIALTY_LABELS[item.specialty],
    count: item.count,
    icon: SPECIALTY_ICONS[item.specialty],
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Análises</h1>
        <p className="text-sm text-gray-500 mt-0.5">Métricas de desempenho da plataforma</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Avaliação Média"
          value={`${data.averageRating.toFixed(1)} / 5`}
          icon={Star}
          color="yellow"
        />
        <StatCard
          title="Taxa de Aprovação de Orçamentos"
          value={`${Math.round(data.quoteAcceptanceRate * 100)}%`}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Taxa de Conclusão"
          value={`${Math.round(data.completionRate * 100)}%`}
          icon={CheckCircle}
          color="green"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-gray-400" />
            Pedidos por Especialidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {specialtyChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={specialtyChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}
                  formatter={(v: number) => [v, 'Pedidos']}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {specialtyChartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-400 py-12">Sem dados disponíveis</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Especialidade</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-50">
            {data.requestsBySpecialty.map((item, i) => {
              const total = data.requestsBySpecialty.reduce((s, x) => s + x.count, 0)
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0
              return (
                <div key={item.specialty} className="flex items-center gap-4 px-6 py-4">
                  <span className="text-2xl">{SPECIALTY_ICONS[item.specialty]}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{SPECIALTY_LABELS[item.specialty]}</span>
                      <span className="text-sm text-gray-500">{item.count} pedidos ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
