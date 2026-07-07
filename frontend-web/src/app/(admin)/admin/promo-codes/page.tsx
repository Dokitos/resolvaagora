'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Trash2, Tag, Users } from 'lucide-react'

type Promo = {
  id: string; code: string; description?: string
  discountType: 'PERCENT' | 'FIXED'; discountValue: number
  minOrderValue?: number; maxUses?: number; usedCount: number
  expiresAt?: string; isActive: boolean
}
type Referral = {
  id: string; status: string; createdAt: string
  referrer?: { firstName: string; lastName: string }
  referred?: { firstName: string; lastName: string }
}

export default function AdminPromoCodesPage() {
  const [promos, setPromos] = useState<Promo[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [form, setForm] = useState({ code: '', description: '', discountType: 'PERCENT', discountValue: '', minOrderValue: '', maxUses: '' })
  const [saving, setSaving] = useState(false)

  async function load() {
    const [p, r] = await Promise.all([adminApi.promoCodes(), adminApi.referrals()])
    setPromos(p); setReferrals(r)
  }
  useEffect(() => { load() }, [])

  async function create() {
    if (!form.code.trim() || !form.discountValue) return toast.error('Código e valor são obrigatórios')
    setSaving(true)
    try {
      await adminApi.createPromoCode({
        code: form.code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      })
      toast.success('Código criado')
      setForm({ code: '', description: '', discountType: 'PERCENT', discountValue: '', minOrderValue: '', maxUses: '' })
      load()
    } catch (err: any) { toast.error(err.message) } finally { setSaving(false) }
  }

  async function toggle(p: Promo) {
    await adminApi.updatePromoCode(p.id, { isActive: !p.isActive })
    load()
  }
  async function remove(p: Promo) {
    if (!confirm(`Eliminar o código ${p.code}?`)) return
    await adminApi.deletePromoCode(p.id); load()
  }

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Códigos promocionais & Referências</h1>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Tag className="h-4 w-4" />Criar código</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <Input placeholder="CÓDIGO" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <Input placeholder="Descrição (opcional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              options={[{ value: 'PERCENT', label: '% Percentagem' }, { value: 'FIXED', label: '€ Fixo' }]}
            />
            <Input type="number" placeholder={form.discountType === 'PERCENT' ? 'Desconto %' : 'Desconto €'} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} />
            <Input type="number" placeholder="Valor mínimo € (opc.)" value={form.minOrderValue} onChange={(e) => setForm({ ...form, minOrderValue: e.target.value })} />
            <Input type="number" placeholder="Máx. usos (opc.)" value={form.maxUses} onChange={(e) => setForm({ ...form, maxUses: e.target.value })} />
          </div>
          <div className="mt-3">
            <Button onClick={create} loading={saving} className="bg-brand-600 hover:bg-brand-700">Criar código</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Códigos ({promos.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Código</th>
                <th className="px-4 py-3 text-left">Desconto</th>
                <th className="px-4 py-3 text-left">Usos</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {promos.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-bold">{p.code}</p>
                    {p.description && <p className="text-xs text-gray-400">{p.description}</p>}
                  </td>
                  <td className="px-4 py-3">{p.discountType === 'PERCENT' ? `${Number(p.discountValue)}%` : `${Number(p.discountValue)}€`}</td>
                  <td className="px-4 py-3">{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ''}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggle(p)}>
                      <Badge className={p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(p)} className="text-brand-600 hover:text-brand-700"><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {promos.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sem códigos.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Referências ({referrals.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Quem convidou</th>
                <th className="px-4 py-3 text-left">Convidado</th>
                <th className="px-4 py-3 text-left">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {referrals.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{r.referrer ? `${r.referrer.firstName} ${r.referrer.lastName}` : '—'}</td>
                  <td className="px-4 py-3">{r.referred ? `${r.referred.firstName} ${r.referred.lastName}` : '—'}</td>
                  <td className="px-4 py-3"><Badge>{r.status}</Badge></td>
                </tr>
              ))}
              {referrals.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sem referências.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
