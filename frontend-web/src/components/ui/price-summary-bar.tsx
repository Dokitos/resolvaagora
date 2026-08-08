'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { Button } from './button'

export interface PriceLine {
  label: string
  amount: number
}

interface PriceSummaryBarProps {
  lines: PriceLine[]
  total: number
  ctaLabel: string
  onCta: () => void
  ctaLoading?: boolean
  ctaDisabled?: boolean
}

export function PriceSummaryBar({ lines, total, ctaLabel, onCta, ctaLoading, ctaDisabled }: PriceSummaryBarProps) {
  const [expanded, setExpanded] = useState(false)

  if (total <= 0) {
    return (
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 z-30">
        <div className="max-w-xl mx-auto">
          <Button className="w-full" size="lg" onClick={onCta} loading={ctaLoading} disabled={ctaDisabled}>
            {ctaLabel}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
      <div className="max-w-xl mx-auto">
        {expanded && (
          <div className="px-4 pt-4 space-y-1.5 border-b border-gray-100 pb-3">
            {lines.map((line) => (
              <div key={line.label} className="flex justify-between text-sm text-gray-600">
                <span>{line.label}</span>
                <span>{formatCurrency(line.amount)}</span>
              </div>
            ))}
            <p className="text-[11px] text-gray-400 pt-1">IVA incluído</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-4 py-2 text-sm"
        >
          <span className="flex items-center gap-1 font-semibold text-gray-900">
            Total {formatCurrency(total)}
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </span>
        </button>

        <div className="px-4 pb-4">
          <Button className="w-full" size="lg" onClick={onCta} loading={ctaLoading} disabled={ctaDisabled}>
            {ctaLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
