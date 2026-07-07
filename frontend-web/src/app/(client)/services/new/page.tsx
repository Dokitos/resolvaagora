'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { api } from '@/lib/api/client'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SPECIALTY_LABELS } from '@/lib/utils'
import type { Address } from '@/lib/api/types'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  specialty: z.string().min(1, 'Selecione uma especialidade'),
  addressId: z.string().min(1, 'Selecione uma morada'),
  description: z.string().min(20, 'Descreva o problema (mínimo 20 caracteres)'),
  scheduledDate: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NewServicePage() {
  const router = useRouter()
  const params = useSearchParams()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { specialty: params.get('specialty') || '' },
  })

  useEffect(() => {
    api.get('/clients/me/addresses').then((r) => {
      setAddresses(r.data)
      const def = r.data.find((a: Address) => a.isDefault)
      if (def) setValue('addressId', def.id)
    })
  }, [setValue])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const sr = await serviceRequestsApi.create({
        ...data,
        specialty: data.specialty as any,
      })
      toast.success('Pedido criado! Agora pague a taxa de deslocação.')
      router.push(`/services/${sr.id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const specialtyOptions = Object.entries(SPECIALTY_LABELS).map(([value, label]) => ({ value, label }))
  const addressOptions = addresses.map((a) => ({
    value: a.id,
    label: `${a.label} — ${a.street} ${a.number}, ${a.city}`,
  }))

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Novo pedido de serviço</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Select
              id="specialty"
              label="Tipo de serviço *"
              options={specialtyOptions}
              placeholder="Selecione..."
              error={errors.specialty?.message}
              {...register('specialty')}
            />

            <Select
              id="addressId"
              label="Morada *"
              options={addressOptions}
              placeholder="Selecione uma morada..."
              error={errors.addressId?.message}
              {...register('addressId')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Descrição do problema *</label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                placeholder="Descreva detalhadamente o problema. Ex: A torneira da cozinha está a pingar e não consigo fechar completamente..."
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
            </div>

            <Input
              id="scheduledDate"
              label="Data preferida (opcional)"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              {...register('scheduledDate')}
            />

            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">💡 Como funciona</p>
              <ul className="mt-2 text-sm text-blue-700 space-y-1">
                <li>• Pague a taxa de deslocação para confirmar o pedido</li>
                <li>• O técnico deslocará ao local e enviará orçamento</li>
                <li>• Tem 48h para aceitar ou rejeitar o orçamento</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Criar pedido
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
