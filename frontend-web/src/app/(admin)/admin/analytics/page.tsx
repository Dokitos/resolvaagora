'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import type { AnalyticsData } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { formatDateShort, SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import {
  Star, CheckCircle, FileText, BarChart2, Users, Wrench, ClipboardList,
  TrendingUp, Timer, MapPin, Gift, Repeat, XCircle,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16']

function formatMinutes(min: number | null): string {
  if (min === null) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.analytics()
      .then(setData)
      .catch((err: any) => toast.error(err?.message ?? 'Erro ao carregar análises'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return <p className="text-center text-gray-400 py-12">Não foi possível carregar as análises.</p>

  const specialtyChartData = data.requestsBySpecialty.map((item) => ({
    name: SPECIALTY_LABELS[item.specialty],
    count: item.count,
    icon: SPECIALTY_ICONS[item.specialty],
  }))

  const funnelTotal = data.funnel.draft + data.funnel.inProgress + data.funnel.completed + data.funnel.cancelled
  const funnelStages = [
    { label: 'Por converter', value: data.funnel.draft, color: '#9ca3af' },
    { label: 'Em curso', value: data.funnel.inProgress, color: '#3b82f6' },
    { label: 'Concluídos', value: data.funnel.completed, color: '#10b981' },
    { label: 'Cancelados/Rejeitados', value: data.funnel.cancelled, color: '#ef4444' },
  ]

  const growthChartData = data.growth.map((g) => ({
    date: formatDateShort(g.date),
    'Novos clientes': g.newClients,
    'Novos pedidos': g.newRequests,
  }))

  const maxRatingCount = Math.max(1, ...data.ratingDistribution.map((r) => r.count))
  const maxDistrictCount = Math.max(1, ...data.byDistrict.map((d) => d.count))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Análises</h1>
        <p className="text-sm text-gray-500 mt-0.5">Crescimento, operação e qualidade da plataforma</p>
      </div>

      {/* Totais gerais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Clientes" value={data.totals.clients} icon={Users} color="blue" />
        <StatCard title="Técnicos" value={data.totals.technicians} icon={Wrench} color="purple" />
        <StatCard title="Pedidos" value={data.totals.serviceRequests} icon={ClipboardList} color="yellow" />
        <StatCard title="Avaliação Média" value={data.averageRating > 0 ? `${data.averageRating.toFixed(1)} / 5` : '—'} icon={Star} color="yellow" />
        <StatCard title="Aprovação de Orçamentos" value={`${data.quoteAcceptanceRate}%`} icon={FileText} color="green" />
        <StatCard title="Taxa de Conclusão" value={`${data.completionRate}%`} icon={CheckCircle} color="green" />
      </div>

      {/* Crescimento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" />
            Crescimento — últimos 30 dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={growthChartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} interval={4} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
              <Tooltip contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
              <Legend wrapperStyle={{ fontSize: 13 }} />
              <Line type="monotone" dataKey="Novos clientes" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Novos pedidos" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funil de conversão */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-400" />
              Funil de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {funnelStages.map((s) => {
              const pct = funnelTotal > 0 ? Math.round((s.value / funnelTotal) * 100) : 0
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{s.label}</span>
                    <span className="text-sm text-gray-500">{s.value} ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: s.color }} />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Tempos operacionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-gray-400" />
              Tempos Médios de Operação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Até atribuir técnico</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatMinutes(data.operational.avgAssignmentMinutes)}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Até o técnico chegar</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatMinutes(data.operational.avgArrivalMinutes)}</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500">Execução do trabalho</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{formatMinutes(data.operational.avgExecutionMinutes)}</p>
              </div>
              <div className="p-4 rounded-lg bg-brand-50">
                <p className="text-xs text-gray-500">Total (pago → concluído)</p>
                <p className="text-lg font-bold text-brand-900 mt-1">{formatMinutes(data.operational.avgTotalMinutes)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Calculado a partir do histórico real dos últimos 90 dias.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição de avaliações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-gray-400" />
              Distribuição de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.ratingDistribution.map((r) => (
              <div key={r.stars} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-14 flex items-center gap-0.5">{r.stars} <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" /></span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: `${(r.count / maxRatingCount) * 100}%` }} />
                </div>
                <span className="text-sm text-gray-500 w-6 text-right">{r.count}</span>
              </div>
            ))}
            {data.recentReviews.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Ainda sem avaliações.</p>
            ) : (
              <div className="pt-3 mt-3 border-t border-gray-100 space-y-3 max-h-64 overflow-y-auto">
                {data.recentReviews.map((rev) => (
                  <div key={rev.id} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{rev.clientName}</span>
                      <span className="flex items-center gap-0.5 text-xs text-gray-500">
                        {rev.rating} <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">Técnico: {rev.technicianName} · {formatDateShort(rev.createdAt)}</p>
                    {rev.comment && <p className="text-gray-600 mt-0.5">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top técnicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-gray-400" />
              Melhores Técnicos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.topTechnicians.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Ainda sem serviços concluídos.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase">
                    <th className="text-left px-6 py-2.5 font-medium">Técnico</th>
                    <th className="text-right px-6 py-2.5 font-medium">Concluídos</th>
                    <th className="text-right px-6 py-2.5 font-medium">Avaliação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.topTechnicians.map((t) => (
                    <tr key={t.technicianId} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-900 font-medium">{t.name}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{t.completedCount}</td>
                      <td className="px-6 py-3 text-right text-gray-600">
                        {t.avgRating ? `${t.avgRating.toFixed(1)} ★` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retenção + Referrals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-gray-400" />
              Retenção &amp; Convites
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500">Clientes com &gt;1 pedido</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{data.clientRetention.repeatRate}%</p>
              <p className="text-xs text-gray-400 mt-0.5">{data.clientRetention.repeatClients} de {data.clientRetention.totalClients} clientes</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 flex items-center gap-1"><Gift className="h-3.5 w-3.5" /> Convites concretizados</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{data.referrals.completed}</p>
              <p className="text-xs text-gray-400 mt-0.5">de {data.referrals.total} convites enviados</p>
            </div>
          </CardContent>
        </Card>

        {/* Por distrito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              Pedidos por Distrito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.byDistrict.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Sem dados disponíveis.</p>
            ) : data.byDistrict.map((d) => (
              <div key={d.district} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24 truncate">{d.district}</span>
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(d.count / maxDistrictCount) * 100}%` }} />
                </div>
                <span className="text-sm text-gray-500 w-6 text-right">{d.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Pedidos por especialidade (já existia, mantido) */}
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
