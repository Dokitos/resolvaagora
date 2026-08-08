'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
  danger?: boolean
}

interface DropdownProps {
  trigger: React.ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
}

export function Dropdown({ trigger, items, align = 'right' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)}>{trigger}</button>

      {open && (
        <div
          className={cn(
            'absolute top-12 w-48 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setOpen(false)
                item.onClick()
              }}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50',
                item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700',
              )}
            >
              {item.icon && <item.icon className="h-4 w-4" />}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
