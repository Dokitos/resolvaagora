'use client'

import { cn } from '@/lib/utils'
import { forwardRef, useId } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
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
        <input
          id={fieldId}
          {...props}
          ref={ref}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={[props['aria-describedby'], error ? errorId : null].filter(Boolean).join(' ') || undefined}
          className={cn(
            'w-full rounded-lg border border-line bg-white px-4 py-3 text-base',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-accent-700 focus:border-transparent',
            'disabled:bg-gray-50 disabled:text-gray-500',
            error && 'border-red-400 focus:ring-red-400',
            className,
          )}
        />
        {error && <p id={errorId} role="alert" className="text-xs text-red-700">{error}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
