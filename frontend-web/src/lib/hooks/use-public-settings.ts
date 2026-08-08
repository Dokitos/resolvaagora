'use client'

import { useEffect, useState } from 'react'
import { settingsApi } from '@/lib/api/settings'
import type { PublicSettings } from '@/lib/api/types'

let cached: PublicSettings | null = null
let inflight: Promise<PublicSettings> | null = null

/** Hook cacheado (módulo) para GET /settings/public — evita repetir o pedido em cada página. */
export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings | null>(cached)
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    if (!inflight) {
      inflight = settingsApi.getPublic().then((s) => {
        cached = s
        return s
      })
    }
    inflight
      .then((s) => setSettings(s))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { settings, loading }
}
