'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import toast from 'react-hot-toast'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

/**
 * Eliminação da conta pelo próprio.
 *
 * Existe também na app, por exigência da diretriz 5.1.1(v) da App Store, mas
 * faz sentido no site pela mesma razão: quem se registou aqui deve poder
 * desfazê-lo aqui, sem instalar nada.
 */
export default function DeleteAccountPage() {
  const [password, setPassword] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  async function remove() {
    setBusy(true)
    try {
      await api.post('/auth/delete-account', password ? { password } : {})
      toast.success('A sua conta foi eliminada.')
      await signOut({ callbackUrl: '/' })
    } catch (err: any) {
      const message = err?.response?.data?.message
      toast.error(
        Array.isArray(message)
          ? message.join(', ')
          : message ?? 'Não foi possível eliminar a conta.',
      )
      setBusy(false)
      setConfirming(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg p-4">
      <Link
        href="/account"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>

      <h1 className="text-xl font-bold text-gray-900">Eliminar conta</h1>

      <div className="mt-5 flex gap-3 rounded-lg bg-red-50 p-4">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
        <p className="text-sm text-red-900">
          Ao eliminar a conta perde o acesso imediatamente. Esta ação não pode ser anulada.
        </p>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-bold text-gray-900">O que é eliminado</h2>
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          <li>• Nome, telefone, NIF e fotografia</li>
          <li>• Moradas guardadas</li>
          <li>• Notificações e mensagens de apoio</li>
          <li>• Contas Apple ou Google associadas</li>
        </ul>
      </section>

      <section className="mt-5">
        <h2 className="text-sm font-bold text-gray-900">O que é mantido, sem o identificar</h2>
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          <li>• Faturas e registos de pagamento, que a lei obriga a guardar</li>
          <li>• Histórico dos serviços já concluídos</li>
        </ul>
      </section>

      <p className="mt-5 text-sm text-gray-500">
        Se tiver pedidos em curso, conclua-os ou cancele-os primeiro. Uma subscrição ativa é
        cancelada automaticamente.
      </p>

      <div className="mt-6">
        <Input
          id="password"
          label="Palavra-passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Deixe em branco se entrou com Apple ou Google"
        />
      </div>

      {confirming ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-900">Tem a certeza?</p>
          <p className="mt-1 text-sm text-gray-500">Esta ação é definitiva.</p>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={remove}
              loading={busy}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Sim, eliminar
            </Button>
            <Button
              onClick={() => setConfirming(false)}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setConfirming(true)}
          className="mt-6 w-full bg-red-600 text-white hover:bg-red-700"
        >
          Eliminar a minha conta
        </Button>
      )}
    </div>
  )
}
