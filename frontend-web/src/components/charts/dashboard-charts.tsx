'use client'

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import type { ServiceStatus, Specialty } from '@/lib/api/types'
import { STATUS_LABELS, SPECIALTY_LABELS } from '@/lib/utils'

// Paleta alinhada à marca (vermelho) + acentos frios para diferenciar fatias.
const PIE_COLORS = ['#161616', '#F5B301', '#F59E0B', '#10B981', '#9333EA', '#06B6D4', '#EC4899', '#64748B']

export function StatusDonut({ data }: { data: { status: ServiceStatus; count: number }[] }) {
  const chartData = data.map((d) => ({ name: STATUS_LABELS[d.status] ?? d.status, value: d.count }))
  const total = chartData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={64}
            outerRadius={98}
            paddingAngle={2}
            stroke="none"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v: number, n: string) => [`${v} pedido(s)`, n]}
            contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">{total}</span>
        <span className="text-xs text-gray-500">pedidos</span>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {chartData.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            {d.name} ({d.value})
          </div>
        ))}
      </div>
    </div>
  )
}

export function SpecialtyBars({ data }: { data: { specialty: Specialty; count: number }[] }) {
  const chartData = data.map((d) => ({ name: SPECIALTY_LABELS[d.specialty] ?? d.specialty, count: d.count }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF0F3" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={0} angle={-12} textAnchor="end" height={48} />
        <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: '#F9FAFB' }}
          formatter={(v: number) => [`${v} pedido(s)`, 'Total']}
          contentStyle={{ borderRadius: 10, border: '1px solid #E5E7EB', fontSize: 13 }}
        />
        <Bar dataKey="count" fill="#161616" radius={[6, 6, 0, 0]} maxBarSize={44} />
      </BarChart>
    </ResponsiveContainer>
  )
}
