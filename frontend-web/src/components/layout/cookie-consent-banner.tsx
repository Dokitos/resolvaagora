'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, ShieldCheck, BarChart3, Megaphone } from 'lucide-react'
import { getCookiePreferences, saveCookiePreferences, onOpenCookiePreferences } from '@/lib/cookie-consent'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/modal'

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false)
  const [customizing, setCustomizing] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    if (!getCookiePreferences()) setVisible(true)
    return onOpenCookiePreferences(() => {
      const current = getCookiePreferences()
      setAnalytics(current?.analytics ?? false)
      setMarketing(current?.marketing ?? false)
      setVisible(true)
    })
  }, [])

  function acceptAll() {
    saveCookiePreferences({ analytics: true, marketing: true })
    setVisible(false)
    setCustomizing(false)
  }

  function rejectNonEssential() {
    saveCookiePreferences({ analytics: false, marketing: false })
    setVisible(false)
    setCustomizing(false)
  }

  function saveCustom() {
    saveCookiePreferences({ analytics, marketing })
    setVisible(false)
    setCustomizing(false)
  }

  if (!visible) return null

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-8">
          <Cookie className="hidden h-8 w-8 flex-shrink-0 text-accent-600 sm:block" />
          <p className="flex-1 text-sm text-brand-600">
            Usamos cookies essenciais para o site funcionar e, com o seu consentimento, cookies analíticos e de
            marketing para melhorar a sua experiência. Pode aceitar tudo, recusar o que não é essencial, ou personalizar.{' '}
            <Link href="/cookies" className="font-semibold text-accent-700 underline">
              Saber mais
            </Link>
          </p>
          <div className="flex w-full flex-shrink-0 flex-wrap gap-2 sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => setCustomizing(true)}>Personalizar</Button>
            <Button variant="outline" size="sm" onClick={rejectNonEssential}>Rejeitar não essenciais</Button>
            <Button size="sm" className="bg-accent-500 text-brand-900 hover:bg-accent-600" onClick={acceptAll}>Aceitar tudo</Button>
          </div>
        </div>
      </div>

      <Dialog open={customizing} onClose={() => setCustomizing(false)} title="Preferências de cookies">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-600" />
              <div>
                <p className="text-sm font-semibold text-brand-700">Necessários</p>
                <p className="text-xs text-brand-500">Indispensáveis para iniciar sessão e usar o site. Não podem ser desligados.</p>
              </div>
            </div>
            <div className="mt-1 h-5 w-9 flex-shrink-0 rounded-full bg-accent-500" />
          </div>

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-brand-700">Analíticos</p>
                <p className="text-xs text-brand-500">Ajudam-nos a perceber como o site é usado, para o melhorar.</p>
              </div>
            </div>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 h-5 w-5 flex-shrink-0 accent-accent-600" />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-gray-200 p-4">
            <div className="flex items-start gap-3">
              <Megaphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-500" />
              <div>
                <p className="text-sm font-semibold text-brand-700">Marketing</p>
                <p className="text-xs text-brand-500">Usados para mostrar comunicações mais relevantes para si.</p>
              </div>
            </div>
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-1 h-5 w-5 flex-shrink-0 accent-accent-600" />
          </label>

          <Button className="w-full bg-accent-500 text-brand-900 hover:bg-accent-600" onClick={saveCustom}>Guardar preferências</Button>
        </div>
      </Dialog>
    </>
  )
}
