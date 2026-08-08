import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input
          id={id}
          ref={ref}
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500',
            className,
          )}
          {...props}
        />
        {label}
      </label>
    )
  },
)

Checkbox.displayName = 'Checkbox'

interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, id, ...props }, ref) => {
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input
          id={id}
          ref={ref}
          type="radio"
          className={cn(
            'h-4 w-4 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500',
            className,
          )}
          {...props}
        />
        {label}
      </label>
    )
  },
)

Radio.displayName = 'Radio'
