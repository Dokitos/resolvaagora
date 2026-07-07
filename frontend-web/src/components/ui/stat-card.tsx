import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; label: string }
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  className?: string
}

const colors = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600'   },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600'  },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600'      },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600' },
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', className }: StatCardProps) {
  const c = colors[color]
  return (
    <div className={cn('bg-white rounded-xl border border-gray-200 shadow-sm p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          {trend && (
            <p className={cn('text-xs mt-1 font-medium', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('rounded-xl p-3', c.icon)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}
