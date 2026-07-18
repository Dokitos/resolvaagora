'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api/admin'
import type { Subscription, SubscriptionPlan } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Users, Star, CheckCircle } from 'lucide-react'

interface SubscriptionRow extends Subscription {
  client?: { firstName: string; lastName: string; user?: { email: string } }
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' }> = {
  ACTIVE:    { label: 'Ativa',     variant: 'success' },
  EXPIRED:   { label: 'Expirada',  variant: 'danger' },
  CANCELLED: { label: 'Cancelada', variant: 'warning' },
  PENDING:   { label: 'Pendente',  variant: 'default' },
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<SubscriptionRow[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null)

  function loadPlans() {
    adminApi.plans().then(setPlans)
  }

  useEffect(() => {
    Promise.all([
      adminApi.subscriptions(),
      adminApi.plans(),
    ]).then(([s, p]) => {
      setSubs(s)
      setPlans(p)
    }).finally(() => setLoading(false))
  }, [])

  const filtered = filter ? subs.filter((s) => s.status === filter) : subs
  const active = subs.filter((s) => s.status === 'ACTIVE')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Assinaturas</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subs.length} assinaturas no total</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Assinaturas Ativas"
          value={active.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Receita Anual"
          value={formatCurrency(active.reduce((s, sub) => s + Number(sub.plan.yearlyPrice), 0))}
          icon={Star}
          color="green"
        />
        <StatCard
          title="Visitas Gratuitas Usadas"
          value={active.reduce((s, sub) => s + sub.freeVisitsUsed, 0)}
          icon={CheckCircle}
          color="yellow"
        />
      </div>

      {plans.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const planActive = subs.filter((s) => s.status === 'ACTIVE' && s.plan.id === plan.id)
            return (
              <Card key={plan.id} className="border-blue-100">
                <CardContent className="py-5">
                  {plan.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={plan.imageUrl} alt={plan.name} className="w-full h-28 object-cover rounded-lg mb-3" />
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{plan.name}</span>
                    <Badge variant="default">{planActive.length} ativos</Badge>
                  </div>
                  {plan.description && <p className="text-xs text-gray-500 mb-2">{plan.description}</p>}
                  <p className="text-2xl font-bold text-blue-600 mb-3">{formatCurrency(plan.yearlyPrice)}<span className="text-sm font-normal text-gray-400">/ano</span></p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    {(plan.benefits && plan.benefits.length > 0
                      ? plan.benefits
                      : [
                          `${plan.freeVisitsCount} visitas gratuitas`,
                          `${plan.displacementDiscountPct}% desconto em deslocação`,
                          ...(plan.priorityScheduling ? ['Agendamento prioritário'] : []),
                        ]
                    ).map((b, i) => (
                      <li key={i}>✓ {b}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => setEditing(plan)}
                    className="mt-4 w-full px-3 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-800"
                  >
                    Editar plano
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Lista de Assinaturas</CardTitle>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Todas</option>
              <option value="ACTIVE">Ativas</option>
              <option value="EXPIRED">Expiradas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Cliente</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Plano</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Início</th>
                    <th className="text-left px-6 py-3 font-medium text-gray-500">Expiração</th>
                    <th className="text-right px-6 py-3 font-medium text-gray-500">Visitas Usadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((sub) => {
                    const sm = STATUS_MAP[sub.status] ?? { label: sub.status, variant: 'default' as const }
                    return (
                      <tr key={sub.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">
                            {sub.client?.firstName} {sub.client?.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{sub.client?.user?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-gray-700">{sub.plan.name}</td>
                        <td className="px-6 py-4">
                          <Badge variant={sm.variant}>{sm.label}</Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(sub.startsAt)}</td>
                        <td className="px-6 py-4 text-gray-600">{formatDate(sub.expiresAt)}</td>
                        <td className="px-6 py-4 text-right text-gray-600">
                          {sub.freeVisitsUsed} / {sub.plan.freeVisitsCount}
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Sem assinaturas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <PlanEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); loadPlans() }}
        />
      )}
    </div>
  )
}

function PlanEditor({ plan, onClose, onSaved }: { plan: SubscriptionPlan; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(plan.name)
  const [description, setDescription] = useState(plan.description ?? '')
  const [imageUrl, setImageUrl] = useState(plan.imageUrl ?? '')
  const [benefits, setBenefits] = useState((plan.benefits ?? []).join('\n'))
  const [yearlyPrice, setYearlyPrice] = useState(String(plan.yearlyPrice))
  const [discount, setDiscount] = useState(String(plan.displacementDiscountPct))
  const [freeVisits, setFreeVisits] = useState(String(plan.freeVisitsCount))
  const [quoteExpiryDays, setQuoteExpiryDays] = useState(
    plan.quoteExpiryDays != null ? String(plan.quoteExpiryDays) : '',
  )
  const [priority, setPriority] = useState(plan.priorityScheduling)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError('')
    try {
      const { url } = await adminApi.uploadImage(file)
      setImageUrl(url)
    } catch {
      setError('Falha no upload da imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true); setError('')
    try {
      await adminApi.updatePlan(plan.id, {
        name,
        description: description.trim() || null,
        imageUrl: imageUrl.trim() || null,
        benefits: benefits.split('\n').map((b) => b.trim()).filter(Boolean),
        yearlyPrice: Number(yearlyPrice),
        displacementDiscountPct: Number(discount),
        freeVisitsCount: Number(freeVisits),
        quoteExpiryDays: quoteExpiryDays.trim() === '' ? null : Number(quoteExpiryDays),
        priorityScheduling: priority,
      })
      onSaved()
    } catch {
      setError('Não foi possível guardar.')
      setSaving(false)
    }
  }

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm'
  const label = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Editar plano</h2>

        <div className="space-y-3">
          <div>
            <label className={label}>Nome</label>
            <input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className={label}>Descrição</label>
            <textarea className={field} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className={label}>Imagem de destaque</label>
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="" className="w-full h-32 object-cover rounded-lg mb-2" />
            )}
            <input type="file" accept="image/*" onChange={handleUpload} className="text-sm" />
            {uploading && <p className="text-xs text-gray-400 mt-1">A carregar…</p>}
          </div>
          <div>
            <label className={label}>Benefícios (um por linha)</label>
            <textarea className={field} rows={4} value={benefits} onChange={(e) => setBenefits(e.target.value)}
              placeholder={'Ex:\n50% de desconto na deslocação\n2 visitas grátis por ano'} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={label}>Preço/ano (€)</label>
              <input className={field} type="number" step="0.01" value={yearlyPrice} onChange={(e) => setYearlyPrice(e.target.value)} />
            </div>
            <div>
              <label className={label}>Desconto (%)</label>
              <input className={field} type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <label className={label}>Visitas grátis</label>
              <input className={field} type="number" value={freeVisits} onChange={(e) => setFreeVisits(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={label}>Prazo p/ aceitar orçamento (dias)</label>
            <input className={field} type="number" min="1" value={quoteExpiryDays}
              onChange={(e) => setQuoteExpiryDays(e.target.value)}
              placeholder="Padrão: 2 dias (deixar vazio)" />
            <p className="text-xs text-gray-400 mt-1">Clientes deste plano têm este prazo para aceitar/recusar orçamentos. Vazio = 2 dias (padrão).</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
            Agendamento prioritário
          </label>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving || uploading}
            className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50">
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
