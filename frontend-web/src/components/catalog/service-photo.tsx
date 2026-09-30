import {
  Zap,
  Droplets,
  PaintRoller,
  Sofa,
  Snowflake,
  WashingMachine,
  Sparkles,
  KeyRound,
  Trees,
  LayoutGrid,
  Tv,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Ícone de cada categoria — o mesmo mapa da app (service_photo.dart). */
export const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ELECTRICITY: Zap,
  PLUMBING: Droplets,
  PAINTING: PaintRoller,
  FURNITURE: Sofa,
  AC: Snowflake,
  APPLIANCES: WashingMachine,
  CLEANING: Sparkles,
  LOCKSMITH: KeyRound,
  GARDEN: Trees,
  FLOORING: LayoutGrid,
  TV_ANTENNA: Tv,
}

export function categoryIcon(categoryId: string) {
  return CATEGORY_ICONS[categoryId] ?? Wrench
}

/**
 * Fotografia de uma categoria, ou o fundo da marca com o ícone enquanto não
 * houver fotografia carregada no painel. O fundo foi desenhado para aguentar
 * o site sozinho — não é um "espaço vazio à espera".
 */
export function ServicePhoto({
  categoryId,
  imageUrl,
  alt = '',
  className,
  iconClassName = 'h-14 w-14',
}: {
  categoryId: string
  imageUrl?: string | null
  alt?: string
  className?: string
  iconClassName?: string
}) {
  const Icon = categoryIcon(categoryId)

  return (
    <div className={cn('relative overflow-hidden bg-gradient-to-br from-[#1C1C1C] to-[#2E2E2E]', className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URLs do armazenamento de uploads, sem domínio fixo para o next/image
        <img src={imageUrl} alt={alt} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <>
          <span className="pointer-events-none absolute -right-10 -top-8 h-16 w-44 -rotate-[28deg] bg-accent-500/20" />
          <span className="absolute inset-0 flex items-center justify-center">
            <Icon className={cn('text-accent-500', iconClassName)} />
          </span>
        </>
      )}
    </div>
  )
}
