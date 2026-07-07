'use client'

import { useEffect, useState } from 'react'
import { clientApi } from '@/lib/api/client-api'
import type { Address } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MapPin, Plus, Pencil, Trash2, Star } from 'lucide-react'
import toast from 'react-hot-toast'

const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra',
  'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real',
  'Viseu', 'Açores', 'Madeira',
]

const emptyForm = {
  label: '', street: '', number: '', floor: '',
  postalCode: '', city: '', district: 'Lisboa', isDefault: false,
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    try { setAddresses(await clientApi.getAddresses()) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ ...emptyForm })
    setEditingId(null)
    setShowForm(true)
  }

  function openEdit(a: Address) {
    setForm({
      label: a.label, street: a.street, number: a.number, floor: a.floor ?? '',
      postalCode: a.postalCode, city: a.city, district: a.district, isDefault: a.isDefault,
    })
    setEditingId(a.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        label: form.label.trim(),
        street: form.street.trim(),
        number: form.number.trim(),
        floor: form.floor.trim() || undefined,
        postalCode: form.postalCode.trim(),
        city: form.city.trim(),
        district: form.district,
        isDefault: form.isDefault,
      }
      if (editingId) {
        await clientApi.updateAddress(editingId, payload)
        toast.success('Morada actualizada')
      } else {
        await clientApi.createAddress(payload as any)
        toast.success('Morada adicionada')
      }
      setShowForm(false)
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar morada')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Remover esta morada?')) return
    try {
      await clientApi.deleteAddress(id)
      toast.success('Morada removida')
      load()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao remover morada')
    }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">As minhas moradas</h1>
        {!showForm && (
          <Button size="sm" onClick={openNew}><Plus className="h-4 w-4" />Nova morada</Button>
        )}
      </div>

      {showForm && (
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-4">
            {editingId ? 'Editar morada' : 'Nova morada'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="label" label="Designação (ex: Casa, Escritório)"
              placeholder="Casa" value={form.label} required
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input id="street" label="Rua" value={form.street} required
                  onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                />
              </div>
              <Input id="number" label="Nº" value={form.number} required
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input id="floor" label="Andar / Fracção (opcional)" value={form.floor}
                onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
              />
              <Input id="postalCode" label="Código postal" placeholder="1200-001" value={form.postalCode} required
                onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input id="city" label="Cidade" value={form.city} required
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              />
              <div className="flex flex-col gap-1">
                <label htmlFor="district" className="text-sm font-medium text-gray-700">Distrito</label>
                <select
                  id="district"
                  value={form.district}
                  onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isDefault}
                onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700">Definir como morada predefinida</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'A guardar…' : 'Guardar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            </div>
          </form>
        </Card>
      )}

      {addresses.length === 0 && !showForm ? (
        <Card className="p-12 text-center">
          <MapPin className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Ainda não tem moradas guardadas.</p>
          <button onClick={openNew} className="mt-3 text-sm text-blue-600 hover:underline">Adicionar morada</button>
        </Card>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{a.label}</p>
                      {a.isDefault && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Star className="h-3 w-3" />Predefinida
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {a.street}, {a.number}{a.floor ? `, ${a.floor}` : ''}
                    </p>
                    <p className="text-sm text-gray-500">{a.postalCode} {a.city} — {a.district}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-blue-600 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
