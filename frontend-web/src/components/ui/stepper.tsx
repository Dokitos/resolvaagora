import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StepperProps {
  total: number
  current: number // 1-based
  className?: string
}

export function Stepper({ total, current, className }: StepperProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            step < current && 'bg-blue-600',
            step === current && 'bg-blue-600',
            step > current && 'bg-gray-200',
          )}
        />
      ))}
    </div>
  )
}

interface StepperDotsProps {
  labels: string[]
  current: number // 1-based
}

export function StepperDots({ labels, current }: StepperDotsProps) {
  return (
    <ol className="flex items-center w-full">
      {labels.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <li key={label} className={cn('flex items-center', step < labels.length && 'flex-1')}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0',
                  done && 'bg-blue-600 text-white',
                  active && 'bg-blue-600 text-white ring-4 ring-blue-100',
                  !done && !active && 'bg-gray-200 text-gray-500',
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span className={cn('text-[11px] whitespace-nowrap', active ? 'text-gray-900 font-medium' : 'text-gray-400')}>
                {label}
              </span>
            </div>
            {step < labels.length && (
              <div className={cn('h-0.5 flex-1 mx-1', done ? 'bg-blue-600' : 'bg-gray-200')} />
            )}
          </li>
        )
      })}
    </ol>
  )
}
