'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { adminApi } from '@/lib/api/admin'
import { SPECIALTY_LABELS } from '@/lib/utils'
import type { Specialty } from '@/lib/api/types'

// Deriva da fonte única de verdade (SPECIALTY_LABELS) para não dessincronizar
// quando se adicionam novas especialidades.
const SPECIALTIES = Object.keys(SPECIALTY_LABELS) as Specialty[]

const DISTRICTS = [
  'Aveiro', 'Beja', 'Braga', 'Bragança', 'Castelo Branco', 'Coimbra',
  'Évora', 'Faro', 'Guarda', 'Leiria', 'Lisboa', 'Portalegre',
  'Porto', 'Santarém', 'Setúbal', 'Viana do Castelo', 'Vila Real',
  'Viseu', 'Açores', 'Madeira',
]

interface TechnicianFormProps {
  technicianId?: string
  defaultValues?: {
    firstName: string
    lastName: string
    phone: string
    dailyServiceLimit: number
    specialties: Specialty[]
    coverageDistricts: string[]
  }
}

export function TechnicianForm({ technicianId, defaultValues }: TechnicianFormProps) {
  const router = useRouter()
  const isEdit = !!technicianId

  const [form, setForm] = useState({
    firstName: defaultValues?.firstName ?? '',
    lastName: defaultValues?.lastName ?? '',
    email: '',
    password: '',
    phone: defaultValues?.phone ?? '',
    dailyServiceLimit: defaultValues?.dailyServiceLimit ?? 8,
  })
  const [specialties, setSpecialties] = useState<Specialty[]>(defaultValues?.specialties ?? [])
  const [districts, setDistricts] = useState<string[]>(defaultValues?.coverageDistricts ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Obrigatório'
    if (!form.lastName.trim()) e.lastName = 'Obrigatório'
    if (!isEdit && !form.email.trim()) e.email = 'Obrigatório'
    if (!isEdit && !form.password.trim()) e.password = 'Obrigatório'
    if (!isEdit && form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (!form.phone.trim()) e.phone = 'Obrigatório'
    if (specialties.length === 0) e.specialties = 'Seleccione pelo menos uma especialidade'
    if (districts.length === 0) e.districts = 'Seleccione pelo menos um distrito'
    return e
  }

  function toggleSpecialty(s: Specialty) {
    setSpecialties((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    )
  }

  function toggleDistrict(d: string) {
    setDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setErrors({})
    setSubmitting(true)
    setServerError('')

    try {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dailyServiceLimit: Number(form.dailyServiceLimit),
        specialties,
        coverageDistricts: districts,
      }
      if (!isEdit) {
        payload.email = form.email.trim()
        payload.password = form.password
      }

      if (isEdit) {
        await adminApi.updateTechnician(technicianId, payload)
      } else {
        await adminApi.createTechnician(payload)
      }
      router.push('/admin/technicians')
      router.refresh()
    } catch (err: any) {
      setServerError(err?.response?.data?.message ?? 'Erro ao guardar técnico')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dados pessoais</h2>
        <div className="grid grid-cols-2 gap-4">
          <Input
            id="firstName"
            label="Primeiro nome"
            value={form.firstName}
            onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
            error={errors.firstName}
          />
          <Input
            id="lastName"
            label="Apelido"
            value={form.lastName}
            onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
            error={errors.lastName}
          />
        </div>
        <Input
          id="phone"
          label="Telefone"
          placeholder="+351912345678"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          error={errors.phone}
        />
        <Input
          id="dailyLimit"
          label="Limite de serviços/dia"
          type="number"
          min={1}
          max={20}
          value={form.dailyServiceLimit}
          onChange={(e) => setForm((f) => ({ ...f, dailyServiceLimit: Number(e.target.value) }))}
        />
      </Card>

      {!isEdit && (
        <Card className="p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Acesso</h2>
          <Input
            id="email"
            label="Email"
            type="email"
            placeholder="tecnico@empresa.pt"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            error={errors.email}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            error={errors.password}
          />
        </Card>
      )}

      <Card className="p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Especialidades</h2>
        <div className="grid grid-cols-2 gap-2">
          {SPECIALTIES.map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={specialties.includes(s)}
                onChange={() => toggleSpecialty(s)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{SPECIALTY_LABELS[s]}</span>
            </label>
          ))}
        </div>
        {errors.specialties && <p className="text-xs text-red-600">{errors.specialties}</p>}
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Distritos de cobertura</h2>
        <div className="grid grid-cols-3 gap-2">
          {DISTRICTS.map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={districts.includes(d)}
                onChange={() => toggleDistrict(d)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{d}</span>
            </label>
          ))}
        </div>
        {errors.districts && <p className="text-xs text-red-600">{errors.districts}</p>}
      </Card>

      {serverError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{serverError}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'A guardar…' : isEdit ? 'Guardar alterações' : 'Criar técnico'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
