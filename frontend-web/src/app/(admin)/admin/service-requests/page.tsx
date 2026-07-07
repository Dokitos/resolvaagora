'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/api/admin'
import type { ServiceRequest, ServiceStatus } from '@/lib/api/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatDate, formatCurrency, SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import { MapPin, User, AlertTriangle } from 'lucide-react'
import { Pagination } from '@/components/ui/pagination'

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Todos os estados' },
  { value: 'IN_DISTRIBUTION', label: 'A distribuir' },
  { value: 'ASSIGNED', label: 'Atribuídos' },
  { value: 'QUOTE_SENT', label: 'Orçamento enviado' },
  { value: 'IN_EXECUTION', label: 'Em execução' },
  { value: 'COMPLETED', label: 'Concluídos' },
]

export default function AdminServiceRequestsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => { setPage(1) }, [status])

  // Auto-refresh when a new request arrives in real time (from the bell).
  useEffect(() => {
    const onNew = () => setRefreshKey((k) => k + 1)
    window.addEventListener('admin:new-request', onNew)
    return () => window.removeEventListener('admin:new-request', onNew)
  }, [])

  useEffect(() => {
    setLoading(true)
    adminApi.serviceRequests({ status: status || undefined, page, limit: PAGE_SIZE })
      .then((data) => {
        setRequests(data)
        if (data.length < PAGE_SIZE && page === 1) setTotal(data.length)
        else setTotal(Math.max(total, page * PAGE_SIZE + (data.length === PAGE_SIZE ? 1 : 0)))
      })
      .finally(() => setLoading(false))
  }, [status, page, refreshKey])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos de serviço</h1>
        <div className="w-52">
          <Select
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Pedido</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Técnico</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Alertas</th>
                <th className="px-4 py-3 text-left">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map((sr) => (
                <tr key={sr.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/service-requests/${sr.id}`} className="hover:text-blue-600">
                      <div className="flex items-center gap-2">
                        <span>{SPECIALTY_ICONS[sr.specialty]}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{SPECIALTY_LABELS[sr.specialty]}</p>
                          <p className="text-xs text-gray-400">{sr.id.slice(0, 8)}...</p>
                        </div>
                        {sr.isPriority && <Badge variant="info" className="text-xs">⭐ Prio</Badge>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {sr.client && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span>{sr.client.firstName} {sr.client.lastName}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {sr.technician ? (
                      <span className="text-sm text-gray-700">{sr.technician.firstName} {sr.technician.lastName}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Não atribuído</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sr.status} />
                  </td>
                  <td className="px-4 py-3">
                    {sr.slaAlerts && sr.slaAlerts.length > 0 && (
                      <AlertTriangle className={`h-4 w-4 ${sr.slaAlerts[0].level === 'CRITICAL' ? 'text-red-500' : 'text-yellow-500'}`} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-500">{formatDate(sr.createdAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && requests.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhum pedido encontrado</div>
          )}
        </div>
      </Card>

      {!loading && requests.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
