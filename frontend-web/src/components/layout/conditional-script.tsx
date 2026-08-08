'use client'

/**
 * Gate para scripts de terceiros (Analytics, Meta Pixel, etc.) que só devem
 * ser injetados depois de o utilizador ter aceitado a categoria de cookies
 * correspondente no banner de consentimento (`@/lib/cookie-consent.ts`).
 *
 * Hoje a app ainda não tem nenhum script de terceiros configurado — este
 * componente existe para que, quando um for adicionado no futuro, passe
 * sempre por aqui em vez de ser colado diretamente no `layout.tsx` (o que
 * ignoraria o consentimento do utilizador e violaria o que o banner de
 * cookies promete).
 *
 * Uso:
 *   <ConditionalScript category="analytics" src="https://.../ga.js" />
 *   <ConditionalScript category="marketing">
 *     {`window.fbq = ...`}
 *   </ConditionalScript>
 */

import { useEffect, useState } from 'react'
import Script from 'next/script'
import { getCookiePreferences, type CookiePreferences } from '@/lib/cookie-consent'

type ConsentCategory = keyof Omit<CookiePreferences, 'decidedAt'>

const UPDATE_EVENT = 'cookie-preferences:updated'

interface ConditionalScriptProps {
  /** Categoria de consentimento que tem de estar aceite para o script correr. */
  category: ConsentCategory
  /** URL do script externo (usa `next/script`). Omite se usares `children`. */
  src?: string
  /** Script inline — alternativa a `src`. */
  children?: string
  /** Passado ao `next/script` (default: 'afterInteractive'). */
  strategy?: 'afterInteractive' | 'lazyOnload' | 'worker'
  id?: string
}

function isCategoryAccepted(category: ConsentCategory): boolean {
  const prefs = getCookiePreferences()
  if (!prefs) return false
  return Boolean(prefs[category])
}

export function ConditionalScript({ category, src, children, strategy = 'afterInteractive', id }: ConditionalScriptProps) {
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    setAccepted(isCategoryAccepted(category))

    function onUpdate() {
      setAccepted(isCategoryAccepted(category))
    }

    window.addEventListener(UPDATE_EVENT, onUpdate)
    return () => window.removeEventListener(UPDATE_EVENT, onUpdate)
  }, [category])

  if (!accepted) return null
  if (src) return <Script id={id} src={src} strategy={strategy} />
  if (children) return <Script id={id} strategy={strategy}>{children}</Script>
  return null
}
