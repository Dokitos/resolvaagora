'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import type { ServiceRequest, ServiceStatus } from '@/lib/api/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { formatDate, SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import { User, AlertTriangle, LayoutGrid, List, RefreshCw, Search, ClipboardList, Users } from 'lucide-react'
import { AdminRequestBoard } from '@/components/layout/admin-request-board'
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

  const [view, setView] = useState<'board' | 'list'>('board')
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [priority, setPriority] = useState('')
  const [error, setError] = useState(false)
  const visibleRequests = requests.filter(sr => {
    const text = [sr.id, sr.description, SPECIALTY_LABELS[sr.specialty], sr.client?.firstName, sr.client?.lastName, sr.technician?.firstName, sr.technician?.lastName, sr.address?.city].filter(Boolean).join(' ').toLocaleLowerCase('pt')
    return (!query.trim() || text.includes(query.trim().toLocaleLowerCase('pt')))
      && (!specialty || sr.specialty === specialty)
      && (!priority || (priority === 'priority' ? sr.isPriority : sr.slaAlerts?.some(alert => !alert.resolvedAt)))
  })
  const specialtyOptions = Object.entries(SPECIALTY_LABELS).map(([value, label]) => ({ value, label }))
  const assignedCount = requests.filter(sr => sr.technician).length
  const alertCount = requests.filter(sr => sr.slaAlerts?.some(alert => !alert.resolvedAt)).length

  // Auto-refresh when a new request arrives in real time (from the bell).
  useEffect(() => {
    const onNew = () => setRefreshKey((k) => k + 1)
    window.addEventListener('admin:new-request', onNew)
    return () => window.removeEventListener('admin:new-request', onNew)
  }, [])

  useEffect(() => {
    let live = true
    setLoading(true)
    setError(false)
    adminApi.serviceRequests({ status: status || undefined, page, limit: PAGE_SIZE })
      .then((data) => {
        if (!live) return
        setRequests(data)
        setTotal((page - 1) * PAGE_SIZE + data.length + (data.length === PAGE_SIZE ? 1 : 0))
      })
      .catch((err: any) => { if (live) { setError(true); toast.error(err?.message ?? 'Erro ao carregar pedidos') } })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [status, page, refreshKey])

  const totalPages = Math.max(page, Math.ceil(total / PAGE_SIZE) || 1)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="admin-muted mb-2 text-[10px] font-semibold uppercase tracking-[0.16em]">Operações</p><h1 className="text-2xl font-bold text-gray-900">Gestão de pedidos</h1><p className="admin-muted mt-2 text-sm">Organize os serviços e acompanhe cada etapa.</p></div>
        <div className="flex items-center gap-3"><button type="button" onClick={() => setRefreshKey(k => k + 1)} disabled={loading} className="admin-icon-button border border-gray-200" aria-label="Atualizar pedidos"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button><div className="w-48">
          <Select
            aria-label="Filtrar por estado"
            options={STATUS_FILTER_OPTIONS}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          />
        </div></div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3" aria-label="Resumo da página atual">
        {[{ title: 'Pedidos nesta página', value: requests.length, icon: ClipboardList }, { title: 'Com técnico atribuído', value: assignedCount, icon: Users }, { title: 'Com alertas SLA', value: alertCount, icon: AlertTriangle }].map(item => <div key={item.title} className="admin-stat"><span className="admin-stat-icon"><item.icon className="h-5 w-5" /></span><div><p className="text-2xl font-semibold">{loading ? '—' : item.value}</p><p className="admin-muted mt-1 text-xs">{item.title}</p></div></div>)}
      </div>
      <div className="admin-panel p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Vista de pedidos">
            <button type="button" className="admin-view-button" aria-pressed={view === 'board'} onClick={() => setView('board')}><LayoutGrid className="h-4 w-4" />Quadro</button>
            <button type="button" className="admin-view-button" aria-pressed={view === 'list'} onClick={() => setView('list')}><List className="h-4 w-4" />Lista</button>
          </div>
          <label className="admin-search flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border px-3"><Search className="admin-muted h-4 w-4 shrink-0" /><input aria-label="Pesquisar pedidos da página atual" type="search" placeholder="Pedido, cliente ou técnico…" className="min-w-0 w-full bg-transparent text-sm outline-none" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <div className="w-full sm:w-48"><Select aria-label="Filtrar especialidade na página atual" options={[{value:'',label:'Especialidades'}, ...specialtyOptions]} value={specialty} onChange={e => setSpecialty(e.target.value)} /></div>
          <div className="w-full sm:w-48"><Select aria-label="Filtrar prioridade na página atual" options={[{value:'',label:'Todas as prioridades'},{value:'priority',label:'Prioritários'},{value:'sla',label:'Com alertas SLA'}]} value={priority} onChange={e => setPriority(e.target.value)} /></div>
        </div>
        <p className="admin-muted mt-3 text-[11px]">Pesquisa, especialidade e prioridade filtram os {requests.length} pedidos desta página. Use a paginação para consultar os restantes.</p>
      </div>
      {error && <div role="alert" className="admin-panel flex flex-wrap items-center justify-between gap-3 p-5"><p className="text-sm">Não foi possível atualizar os pedidos.</p><button type="button" className="admin-view-button" onClick={() => setRefreshKey(k => k + 1)}>Tentar novamente</button></div>}
      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>}

      <div aria-busy={loading} className={loading ? 'pointer-events-none opacity-50' : ''}>
      {view === 'board' ? <AdminRequestBoard requests={visibleRequests} /> : <Card>
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
              {visibleRequests.map((sr) => (
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
          {!loading && visibleRequests.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhum pedido encontrado</div>
          )}
        </div>
      </Card>}
      </div>
      {!loading && view === 'board' && visibleRequests.length === 0 && <p role="status" className="admin-muted py-4 text-center text-sm">Nenhum pedido encontrado com estes filtros.</p>}
      {!loading && (requests.length > 0 || page > 1) && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
