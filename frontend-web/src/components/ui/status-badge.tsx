import { cn, STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'
import type { ServiceStatus } from '@/lib/api/types'

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </span>
  )
}
