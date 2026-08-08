const STORAGE_KEY = 'resolvaagora-cookie-consent'
const OPEN_EVENT = 'cookie-preferences:open'
const UPDATE_EVENT = 'cookie-preferences:updated'

export interface CookiePreferences {
  necessary: true
  analytics: boolean
  marketing: boolean
  decidedAt: string
}

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CookiePreferences) : null
  } catch {
    return null
  }
}

export function saveCookiePreferences(prefs: Omit<CookiePreferences, 'necessary' | 'decidedAt'>) {
  const full: CookiePreferences = { necessary: true, ...prefs, decidedAt: new Date().toISOString() }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(full))
  window.dispatchEvent(new Event(UPDATE_EVENT))
}

/** Reabre o banner/gestor de preferências — usado pelo link "Gerir cookies" no footer. */
export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

export function onOpenCookiePreferences(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler)
  return () => window.removeEventListener(OPEN_EVENT, handler)
}
