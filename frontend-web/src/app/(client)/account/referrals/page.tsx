'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ArrowLeft, Gift, Copy, MessageCircle } from 'lucide-react'
import { referralsApi } from '@/lib/api/referrals'
import type { ReferralsMe } from '@/lib/api/types'
import { Button } from '@/components/ui/button'

export default function ReferralsPage() {
  const [info, setInfo] = useState<ReferralsMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  function load() {
    setLoading(true)
    setError(false)
    referralsApi.getMine().then(setInfo).catch(() => setError(true)).finally(() => setLoading(false))
  }

  useEffect(load, [])

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-accent-600 border-t-transparent rounded-full animate-spin" /></div>
  }

  if (error || !info) {
    return (
      <div className="max-w-xl mx-auto text-center py-16 space-y-3">
        <p className="text-gray-500">Não foi possível carregar o teu código.</p>
        <Button variant="outline" onClick={load}>Tentar novamente</Button>
      </div>
    )
  }

  const code = info.code || '------'
  const message = info.shareMessage || `Junta-te à ResolvaAgora com o meu código ${code} e poupamos os dois! https://resolvaagora.pt`
  const reward = `${info.rewardAmount.toFixed(0)}€`

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/account">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Convida amigos</h1>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-center text-white">
        <Gift className="h-10 w-10 mx-auto text-accent-500" />
        <p className="mt-3 text-xl font-bold">Convida e ganha {reward}</p>
        <p className="mt-1.5 text-sm text-white/70">
          Partilha o teu código. Quando um amigo fizer o primeiro serviço, ganham {reward} cada.
        </p>

        <button
          onClick={() => copy(code, 'Código copiado!')}
          className="mt-5 mx-auto flex items-center gap-2.5 bg-white text-brand-900 rounded-xl px-5 py-3.5"
        >
          <span className="text-2xl font-black tracking-widest">{code}</span>
          <Copy className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-accent-700">{info.referredCount}</p>
          <p className="text-xs text-gray-500 mt-1">Amigos convidados</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-accent-700">{info.rewardTotal.toFixed(0)}€</p>
          <p className="text-xs text-gray-500 mt-1">Recompensas</p>
        </div>
      </div>

      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white font-bold py-3.5"
      >
        <MessageCircle className="h-5 w-5" />
        Partilhar no WhatsApp
      </a>

      <button
        onClick={() => copy(message, 'Mensagem copiada!')}
        className="w-full flex items-center justify-center gap-2 rounded-full border border-gray-300 text-gray-800 font-medium py-3"
      >
        <Copy className="h-4 w-4" />
        Copiar convite
      </button>

      {info.referrals.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-2">Histórico</h2>
          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
            {info.referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.status}</p>
                </div>
                <p className="text-sm font-semibold text-accent-700">{r.reward.toFixed(0)}€</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
