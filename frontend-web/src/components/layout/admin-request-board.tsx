'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowUpRight, CalendarDays, MapPin, Star, UserRound, Wrench } from 'lucide-react'
import type { ServiceRequest, ServiceStatus } from '@/lib/api/types'
import { formatDate, SPECIALTY_LABELS } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'

// Grouping is presentation only: the service's exact state and existing actions stay in its detail page.
export const REQUEST_STAGES: { id: string; title: string; statuses: ServiceStatus[] }[] = [
  { id: 'pending', title: 'Por atribuir', statuses: ['DRAFT', 'AWAITING_PAYMENT', 'PAID', 'IN_DISTRIBUTION'] },
  { id: 'scheduled', title: 'Agendados', statuses: ['ASSIGNED', 'IN_TRANSIT', 'ARRIVED'] },
  { id: 'working', title: 'Em execução', statuses: ['IN_DIAGNOSIS', 'QUOTE_SENT', 'QUOTE_APPROVED', 'IN_EXECUTION'] },
  { id: 'completed', title: 'Concluídos', statuses: ['COMPLETED'] },
  { id: 'archived', title: 'Arquivados', statuses: ['CANCELLED', 'QUOTE_REJECTED', 'EXPIRED'] },
]

export function AdminRequestBoard({ requests }: { requests: ServiceRequest[] }) {
  return (
    <div role="region" aria-label="Quadro de pedidos da página atual" tabIndex={0} className="overflow-x-auto rounded-2xl pb-2">
      <div className="admin-board">
        {REQUEST_STAGES.map(stage => {
          const items = requests.filter(request => stage.statuses.includes(request.status))
          return <section key={stage.id} aria-labelledby={`stage-${stage.id}`} className="admin-board-column">
            <header className="mb-4 flex items-center justify-between gap-3 px-1 pt-1"><h2 id={`stage-${stage.id}`} className="text-sm font-semibold">{stage.title}</h2><span className="admin-stage-count flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold">{items.length}</span></header>
            <div className="space-y-3">{items.map(sr => {
              const alerts = sr.slaAlerts?.filter(alert => !alert.resolvedAt) ?? []
              const critical = alerts.some(alert => alert.level === 'CRITICAL')
              return <Link key={sr.id} href={`/admin/service-requests/${sr.id}`} className={`admin-order-card ${sr.isPriority || alerts.length ? 'is-priority' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-2"><span className="admin-muted font-mono text-[10px]">#{sr.id.slice(0, 8).toUpperCase()}</span>{alerts.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600"><AlertTriangle className="h-3 w-3" />{critical ? 'SLA crítico' : 'Alerta SLA'}</span>}{sr.isPriority && <Star aria-label="Prioritário" className="ml-auto h-3.5 w-3.5 text-accent-700" />}</div>
                <div className="mt-3 flex items-center gap-2"><Wrench aria-hidden="true" className="admin-brand-accent h-4 w-4 shrink-0" /><h3 className="text-[13px] font-semibold">{SPECIALTY_LABELS[sr.specialty] ?? sr.specialty}</h3></div>
                <p className="admin-muted mt-2 line-clamp-2 min-h-9 text-xs leading-[18px]">{sr.description || 'Sem descrição'}</p>
                <div className="admin-muted mt-4 space-y-2 text-[11px]">
                  {sr.address?.city && <p className="flex items-center gap-2"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{sr.address.city}</span></p>}
                  <p className="flex items-center gap-2"><CalendarDays className="h-3 w-3 shrink-0" />{sr.confirmedDate || sr.scheduledDate ? formatDate((sr.confirmedDate || sr.scheduledDate)!) : 'Sem data agendada'}</p>
                  <p className="flex items-center gap-2"><UserRound className="h-3 w-3 shrink-0" /><span className="truncate">{sr.client ? `${sr.client.firstName} ${sr.client.lastName}` : 'Cliente não disponível'}</span></p>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2"><StatusBadge status={sr.status} /><ArrowUpRight aria-hidden="true" className="admin-muted h-4 w-4 shrink-0" /></div>
                <p className="admin-muted mt-3 border-t border-gray-100 pt-3 text-[10px]">{sr.technician ? `Técnico: ${sr.technician.firstName} ${sr.technician.lastName}` : 'Técnico não atribuído'}</p>
              </Link>
            })}</div>
            {items.length === 0 && <p className="admin-muted rounded-xl border border-dashed border-gray-200 px-3 py-8 text-center text-xs leading-5">Sem pedidos nesta etapa<br/>na página atual.</p>}
          </section>
        })}
      </div>
    </div>
  )
}
