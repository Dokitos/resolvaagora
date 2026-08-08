import { cn } from '@/lib/utils'
import { User } from 'lucide-react'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-20 h-20 text-2xl',
}

function initials(name?: string) {
  if (!name) return null
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const label = initials(name)

  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex items-center justify-center bg-blue-100 text-blue-600 font-semibold flex-shrink-0',
        sizes[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name ?? 'Avatar'} className="w-full h-full object-cover" />
      ) : label ? (
        label
      ) : (
        <User className="h-1/2 w-1/2" />
      )}
    </div>
  )
}
