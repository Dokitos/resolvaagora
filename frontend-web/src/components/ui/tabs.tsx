'use client'

import { cn } from '@/lib/utils'

interface Tab {
  value: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 border-b border-gray-200', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            value === tab.value
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
