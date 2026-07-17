'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Settings, Megaphone, Wrench, Gift } from 'lucide-react'

type AppSettings = {
  maintenanceMode: boolean
  maintenanceMessage?: string | null
  registrationEnabled: boolean
  paymentsEnabled: boolean
  paymentsTestMode: boolean
}

type ReferralConfig = {
  rewardAmount: number | string
  shareMessage?: string | null
  isActive: boolean
}

export default function AdminSettingsPage() {
  const [s, setS] = useState<AppSettings | null>(null)
  const [bc, setBc] = useState({ target: 'ALL_CLIENTS', title: '', body: '' })
  const [sending, setSending] = useState(false)
  const [rc, setRc] = useState<ReferralConfig | null>(null)
  const [savingRc, setSavingRc] = useState(false)

  useEffect(() => {
    adminApi.settings().then(setS)
    adminApi.referralConfig().then(setRc)
  }, [])

  async function saveReferral() {
    if (!rc) return
    setSavingRc(true)
    try {
      const updated = await adminApi.updateReferralConfig({
        rewardAmount: Number(rc.rewardAmount) || 0,
        shareMessage: (rc.shareMessage ?? '').trim() || null,
        isActive: rc.isActive,
      })
      setRc(updated)
      toast.success('Programa de referências atualizado')
    } catch (err: any) { toast.error(err.message) } finally { setSavingRc(false) }
  }

  async function patch(data: Partial<AppSettings>) {
    const updated = await adminApi.updateSettings(data)
    setS(updated)
    toast.success('Definições atualizadas')
  }

  async function send() {
    if (!bc.title.trim() || !bc.body.trim()) return toast.error('Título e mensagem obrigatórios')
    setSending(true)
    try {
      const r = await adminApi.broadcast(bc)
      toast.success(`Notificação enviada a ${r.sent} utilizador(es)`)
      setBc({ ...bc, title: '', body: '' })
    } catch (err: any) { toast.error(err.message) } finally { setSending(false) }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Definições da aplicação</h1>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Wrench className="h-4 w-4" />Gestão da app</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {!s ? <p className="text-sm text-gray-400 py-4">A carregar...</p> : (
            <>
              <Toggle label="Modo de manutenção" desc="Bloqueia novos pedidos na app." value={s.maintenanceMode} onChange={(v) => patch({ maintenanceMode: v })} danger />
              {s.maintenanceMode && (
                <div className="py-2">
                  <Input placeholder="Mensagem de manutenção (opcional)" defaultValue={s.maintenanceMessage ?? ''} onBlur={(e) => patch({ maintenanceMessage: e.target.value })} />
                </div>
              )}
              <Toggle label="Permitir registo de novas contas" value={s.registrationEnabled} onChange={(v) => patch({ registrationEnabled: v })} />
              <Toggle label="Pagamentos ativos" value={s.paymentsEnabled} onChange={(v) => patch({ paymentsEnabled: v })} />
              <Toggle label="Pagamentos em modo de teste" desc="Simula os pagamentos sem cobrar." value={s.paymentsTestMode} onChange={(v) => patch({ paymentsTestMode: v })} />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-4 w-4" />Convida Amigos (referências)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {!rc ? <p className="text-sm text-gray-400 py-4">A carregar...</p> : (
            <>
              <Toggle label="Programa ativo" desc="Mostra o convite na app dos clientes." value={rc.isActive} onChange={(v) => setRc({ ...rc, isActive: v })} />
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Recompensa por amigo (€)</label>
                <Input type="number" step="0.01" value={String(rc.rewardAmount)} onChange={(e) => setRc({ ...rc, rewardAmount: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Mensagem de partilha</label>
                <textarea
                  value={rc.shareMessage ?? ''}
                  onChange={(e) => setRc({ ...rc, shareMessage: e.target.value })}
                  placeholder="Usa {code} para inserir o código do cliente. Ex: Junta-te à ResolvaAgora com o meu código {code}!"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/30 min-h-20"
                />
                <p className="text-xs text-gray-400 mt-1">Dica: escreve <code>{'{code}'}</code> onde queres que apareça o código do cliente.</p>
              </div>
              <Button onClick={saveReferral} loading={savingRc} className="bg-brand-600 hover:bg-brand-700">Guardar</Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" />Enviar notificação</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={bc.target}
            onChange={(e) => setBc({ ...bc, target: e.target.value })}
            options={[
              { value: 'ALL_CLIENTS', label: 'Todos os clientes' },
              { value: 'ALL_TECHNICIANS', label: 'Todos os técnicos' },
            ]}
          />
          <Input placeholder="Título" value={bc.title} onChange={(e) => setBc({ ...bc, title: e.target.value })} />
          <textarea
            placeholder="Mensagem"
            value={bc.body}
            onChange={(e) => setBc({ ...bc, body: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-600/30 min-h-24"
          />
          <Button onClick={send} loading={sending} className="bg-brand-600 hover:bg-brand-700">
            <Settings className="h-4 w-4 mr-1" />Enviar notificação
          </Button>
          <p className="text-xs text-gray-400">Aparece no ecrã de notificações da app dos destinatários (em tempo real).</p>
        </CardContent>
      </Card>
    </div>
  )
}

function Toggle({ label, desc, value, onChange, danger }: { label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? (danger ? 'bg-brand-600' : 'bg-green-500') : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
