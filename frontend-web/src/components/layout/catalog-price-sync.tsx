'use client'

import { useEffect } from 'react'
import { useCatalogStore } from '@/lib/store/catalog-store'

/** Carrega os preços do catálogo (edições do admin) uma vez por sessão de browser. */
export function CatalogPriceSync() {
  const loadPrices = useCatalogStore((s) => s.loadPrices)

  useEffect(() => {
    loadPrices()
  }, [loadPrices])

  return null
}
