'use client'

import { cn } from '@/lib/utils'
import { forwardRef, useId } from 'react'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, id, ...props }, ref) => {
    const generatedId = useId()
    const fieldId = id ?? generatedId
    const errorId = `${fieldId}-error`
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <select
          id={fieldId}
          {...props}
          ref={ref}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined}
          className={cn(
            'w-full rounded-lg border border-line bg-white px-4 py-3 text-base bg-white',
            'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-transparent',
            error && 'border-red-400',
            className,
          )}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p id={errorId} role="alert" className="text-xs text-red-700">{error}</p>}
      </div>
    )
  },
)

Select.displayName = 'Select'
