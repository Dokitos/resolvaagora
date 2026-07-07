'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, CreditCard, Users } from 'lucide-react'

interface FinancialData {
  displacement: { total: number; count: number }
  commissions: { total: number; count: number }
  subscriptions: { total: number; count: number }
  totalRevenue: number
  breakdown: { date: string; displacement: number; commissions: number; subscriptions: number }[]
}


export default function AdminFinancialsPage() {
  const [data, setData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().slice(0, 10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))

  async function load() {
    setLoading(true)
    const d = await adminApi.financials({ from, to })
    setData(d)
    setLoading(false)
  }

  useEffect(() => { load() }, [from, to])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-sm text-gray-500 mt-0.5">Resumo de receitas e comissões</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
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
                    {data.breakdown.map((row) => {
                      const total = row.displacement + row.commissions + row.subscriptions
                      return (
                        <tr key={row.date} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-900">{row.date}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(row.displacement)}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(row.commissions)}</td>
                          <td className="px-6 py-3 text-right text-gray-600">{formatCurrency(row.subscriptions)}</td>
                          <td className="px-6 py-3 text-right font-medium text-gray-900">{formatCurrency(total)}</td>
                        </tr>
                      )
                    })}
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
