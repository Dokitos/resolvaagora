'use client'

import type { HomeBanner } from '@/lib/api/types'
import { cn } from '@/lib/utils'

interface BannerCarouselProps {
  banners: HomeBanner[]
  onBannerClick: (banner: HomeBanner) => void
  /** Tamanho dos cartões — 'sm' replica o carrossel compacto do dashboard, 'lg' é pensado para o site público. */
  size?: 'sm' | 'lg'
  className?: string
}

/**
 * Carrossel horizontal de banners reutilizável, com o mesmo padrão visual do
 * carrossel usado no dashboard do cliente logado — imagem de fundo, gradiente
 * escuro e título/subtítulo sobrepostos. Não depende de autenticação.
 */
export function BannerCarousel({ banners, onBannerClick, size = 'sm', className }: BannerCarouselProps) {
  if (banners.length === 0) return null

  const cardSize = size === 'lg' ? 'w-80 h-44 sm:w-96 sm:h-52' : 'w-72 h-32'

  return (
    <div className={cn('flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1', className)}>
      {banners.map((banner) => (
        <button
          key={banner.id}
          onClick={() => onBannerClick(banner)}
          className={cn('relative flex-shrink-0 rounded-2xl overflow-hidden snap-start text-left', cardSize)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.imageUrl} alt={banner.title ?? ''} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          {(banner.title || banner.subtitle) && (
            <div className="absolute bottom-0 left-0 right-0 p-3.5">
              {banner.title && (
                <p className={cn('font-bold text-white', size === 'lg' ? 'text-base' : 'text-sm')}>{banner.title}</p>
              )}
              {banner.subtitle && <p className="mt-0.5 text-xs text-white/80">{banner.subtitle}</p>}
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

export default BannerCarousel
