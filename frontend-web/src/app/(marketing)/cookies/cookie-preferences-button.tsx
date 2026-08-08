'use client'

import { Cookie } from 'lucide-react'
import { openCookiePreferences } from '@/lib/cookie-consent'

export function CookiePreferencesButton() {
  return (
    <button
      onClick={openCookiePreferences}
      className="inline-flex items-center gap-2 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-bold text-brand-900 no-underline transition-colors hover:bg-accent-600"
    >
      <Cookie className="h-4 w-4" />
      Gerir preferências de cookies
    </button>
  )
}
