'use client'

import Link from 'next/link'
import { Wrench } from 'lucide-react'
import { openCookiePreferences } from '@/lib/cookie-consent'

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700">
                <Wrench className="h-4 w-4 text-accent-500" />
              </span>
              <span className="text-base font-extrabold tracking-tight text-brand-700">
                Resolva<span className="text-accent-500">Agora</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-brand-500">
              Profissionais de confiança para a tua casa, em todo o país.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm text-brand-500 sm:gap-16">
            <div>
              <h4 className="font-semibold text-brand-700">Apoio</h4>
              <ul className="mt-3 space-y-1.5">
                <li><a href="mailto:suporte@resolvaagora.pt" className="hover:text-accent-600">suporte@resolvaagora.pt</a></li>
                <li><Link href="/contactos" className="hover:text-accent-600">Contactos</Link></li>
                <li><Link href="/termos" className="hover:text-accent-600">Termos e condições</Link></li>
                <li><Link href="/privacidade" className="hover:text-accent-600">Política de privacidade</Link></li>
                <li><Link href="/cookies" className="hover:text-accent-600">Política de cookies</Link></li>
                <li>
                  <button onClick={openCookiePreferences} className="text-left hover:text-accent-600">
                    Gerir preferências de cookies
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-brand-700">Empresa</h4>
              <ul className="mt-3 space-y-1.5">
                <li>
                  <Link href="/termos" className="hover:text-accent-600">Per4manceMD</Link>
                  {' '}· Douglas Miranda
                </li>
                <li>NIF 255568789</li>
                <li>Rua Dr. Justino de Carvalho 4, Samouco</li>
                <li><a href="https://www.resolvaagora.pt" className="hover:text-accent-600">www.resolvaagora.pt</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-200 pt-6 text-xs text-brand-500">
          © {new Date().getFullYear()} ResolvaAgora · Per4manceMD. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  )
}
