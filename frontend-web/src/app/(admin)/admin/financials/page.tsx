'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { adminApi, type FinancialsResponse } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDateShort, SPECIALTY_LABELS } from '@/lib/utils'
import type { Specialty } from '@/lib/api/types'
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  AlertTriangle,
  Wallet,
  Download,
  FileText,
  Award,
} from 'lucide-react'

const CHART_COLORS = ['#161616', '#F5B301', '#F59E0B', '#10B981', '#9333EA', '#06B6D4', '#EC4899', '#64748B', '#22C55E', '#EF4444', '#0EA5E9']

type QuickRange = 'today' | '7d' | 'month' | 'lastMonth' | 'year'

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function rangeFor(range: QuickRange): { from: string; to: string } {
  const now = new Date()
  switch (range) {
    case 'today': {
      return { from: toISODate(now), to: toISODate(now) }
    }
    case '7d': {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      return { from: toISODate(start), to: toISODate(now) }
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: toISODate(start), to: toISODate(now) }
    }
    case 'lastMonth': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0)
      return { from: toISODate(start), to: toISODate(end) }
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { from: toISODate(start), to: toISODate(now) }
    }
  }
}

const QUICK_RANGES: { key: QuickRange; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7d', label: 'Últimos 7 dias' },
  { key: 'month', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês passado' },
  { key: 'year', label: 'Este ano' },
]

export default function AdminFinancialsPage() {
  const [data, setData] = useState<FinancialsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return toISODate(d)
  })
  const [to, setTo] = useState(() => toISODate(new Date()))
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange | null>('month')

  async function load(f = from, t = to) {
    setLoading(true)
    try {
      const d = await adminApi.financials({ from: f, to: t })
      setData(d)
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [from, to])

  function applyQuickRange(key: QuickRange) {
    const { from: f, to: t } = rangeFor(key)
    setActiveQuickRange(key)
    setFrom(f)
    setTo(t)
  }

  const specialtyChartData = useMemo(() => {
    if (!data) return []
    return data.byCategory.map((c) => ({
      name: SPECIALTY_LABELS[c.specialty as Specialty] ?? c.specialty,
      value: c.total,
      count: c.count,
    }))
  }, [data])

  const breakdownChartData = useMemo(() => {
    if (!data) return []
    return data.breakdown.map((b) => ({
      ...b,
      label: formatDateShort(b.date),
    }))
  }, [data])

  function exportCSV() {
    if (!data) return
    const header = ['Data', 'Deslocação', 'Comissões', 'Assinaturas', 'Total']
    const rows = data.breakdown.map((r) => [
      r.date,
      r.displacement.toFixed(2),
      r.commissions.toFixed(2),
      r.subscriptions.toFixed(2),
      r.total.toFixed(2),
    ])
    const csv = [header, ...rows].map((row) => row.join(';')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro-resolvaagora-${from}-a-${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportPDF() {
    if (!data) return
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF()
      const generatedAt = new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }).format(new Date())

      doc.setFontSize(18)
      doc.setTextColor(22, 22, 22)
      doc.text('ResolvaAgora — Relatório Financeiro', 14, 18)

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Período: ${from} a ${to}`, 14, 26)
      doc.text(`Gerado em: ${generatedAt}`, 14, 32)

      doc.setFontSize(11)
      doc.setTextColor(22, 22, 22)
      const summaryLines = [
        `Receita total: ${formatCurrency(data.totalRevenue)}`,
        `Taxas de deslocação: ${formatCurrency(data.displacement.total)} (${data.displacement.count} serviços)`,
        `Comissões (15%): ${formatCurrency(data.commissions.total)} (${data.commissions.count} serviços)`,
        `Assinaturas: ${formatCurrency(data.subscriptions.total)} (${data.subscriptions.count} assinaturas)`,
        `Pagamentos pendentes: ${formatCurrency(data.pending.total)} (${data.pending.count} pedidos)`,
        `Pago a técnicos: ${formatCurrency(data.payouts.toTechnicians)}`,
        `Comissão retida pela plataforma: ${formatCurrency(data.payouts.platformCommission)}`,
      ]
      let y = 42
      for (const line of summaryLines) {
        doc.text(line, 14, y)
        y += 6
      }

      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Deslocação', 'Comissões', 'Assinaturas', 'Total']],
        body: data.breakdown.map((r) => [
          r.date,
          formatCurrency(r.displacement),
          formatCurrency(r.commissions),
          formatCurrency(r.subscriptions),
          formatCurrency(r.total),
        ]),
        headStyles: { fillColor: [22, 22, 22] },
        styles: { fontSize: 9 },
        margin: { left: 14, right: 14 },
      })

      if (data.byTechnician.length > 0) {
        const afterFirstTable = (doc as any).lastAutoTable?.finalY ?? y + 4
        autoTable(doc, {
          startY: afterFirstTable + 10,
          head: [['Técnico', 'Ganhos', 'Serviços']],
          body: data.byTechnician.map((t) => [t.name, formatCurrency(t.total), String(t.count)]),
          headStyles: { fillColor: [22, 22, 22] },
          styles: { fontSize: 9 },
          margin: { left: 14, right: 14 },
        })
      }

      doc.save(`financeiro-resolvaagora-${from}-a-${to}.pdf`)
    } catch (err: any) {
      toast.error('Erro ao gerar PDF')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Visão completa de receitas, comissões, pagamentos e técnicos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data || loading}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="primary" size="sm" onClick={exportPDF} disabled={!data || loading} loading={exporting}>
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {QUICK_RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => applyQuickRange(r.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activeQuickRange === r.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => { setActiveQuickRange(null); setFrom(e.target.value) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => { setActiveQuickRange(null); setTo(e.target.value) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Receita Total"
              value={formatCurrency(data.totalRevenue)}
              icon={DollarSign}
              color="blue"
            />
            <StatCard
              title="Taxas de Deslocação"
              value={formatCurrency(data.displacement.total)}
              subtitle={`${data.displacement.count} serviços`}
              icon={CreditCard}
              color="green"
            />
            <StatCard
              title="Comissões (15%)"
              value={formatCurrency(data.commissions.total)}
              subtitle={`${data.commissions.count} serviços concluídos`}
              icon={TrendingUp}
              color="purple"
            />
            <StatCard
              title="Assinaturas"
              value={formatCurrency(data.subscriptions.total)}
              subtitle={`${data.subscriptions.count} assinaturas`}
              icon={Users}
              color="yellow"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="Pagamentos Pendentes"
              value={formatCurrency(data.pending.total)}
              subtitle={`${data.pending.count} pedido(s) aguardam pagamento`}
              icon={AlertTriangle}
              color="red"
            />
            <StatCard
              title="Pago a Técnicos"
              value={formatCurrency(data.payouts.toTechnicians)}
              subtitle="Total de ganhos (Earning) no período"
              icon={Wallet}
              color="green"
            />
            <StatCard
              title="Comissão Retida"
              value={formatCurrency(data.payouts.platformCommission)}
              subtitle="Margem líquida da plataforma"
              icon={Award}
              color="purple"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Evolução da Receita</CardTitle>
            </CardHeader>
            <CardContent>
              {breakdownChartData.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Sem dados para o período selecionado</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={breakdownChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: number, n: string) => [formatCurrency(v), n]}
                      contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="total" name="Total" stroke="#161616" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="displacement" name="Deslocação" stroke="#10B981" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="commissions" name="Comissões" stroke="#9333EA" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="subscriptions" name="Assinaturas" stroke="#F59E0B" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Receita por Especialidade</CardTitle>
              </CardHeader>
              <CardContent>
                {specialtyChartData.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Sem dados para o período selecionado</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={specialtyChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={56}
                        outerRadius={92}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {specialtyChartData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, n: string) => [formatCurrency(v), n]}
                        contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Técnicos por Ganhos</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Técnico</th>
                        <th className="text-right px-6 py-3 font-medium text-gray-500">Ganhos</th>
                        <th className="text-right px-6 py-3 font-medium text-gray-500">Serviços</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {data.byTechnician.map((t) => (
                        <tr key={t.technicianId} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-900">{t.name}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(t.total)}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{t.count}</td>
                        </tr>
                      ))}
                      {data.byTechnician.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                            Sem ganhos registados no período
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Receita por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {specialtyChartData.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Sem dados para o período selecionado</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={specialtyChartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={56} />
                    <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(v: number) => [formatCurrency(v), 'Receita']}
                      contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13 }}
                    />
                    <Bar dataKey="value" fill="#161616" radius={[6, 6, 0, 0]} maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes por Dia</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Data</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Deslocação</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Comissões</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Assinaturas</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.breakdown.map((row) => (
                      <tr key={row.date} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-900">{row.date}</td>
                        <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(row.displacement)}</td>
                        <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(row.commissions)}</td>
                        <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(row.subscriptions)}</td>
                        <td className="px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(row.total)}</td>
                      </tr>
                    ))}
                    {data.breakdown.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                          Sem dados para o período selecionado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
