'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { adminApi } from '@/lib/api/admin'
import type { Technician } from '@/lib/api/types'
import { TechnicianForm } from '../../_components/technician-form'

export default function EditTechnicianPage({ params }: { params: { id: string } }) {
  const [technician, setTechnician] = useState<Technician | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    adminApi.technicians().then((list) => {
      const t = list.find((x) => x.id === params.id)
      if (t) setTechnician(t)
      else setNotFound(true)
    }).finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
  if (notFound || !technician) return <p className="text-gray-500">Técnico não encontrado.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/technicians" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Editar técnico</h1>
      </div>
      <TechnicianForm
        technicianId={technician.id}
        defaultValues={{
          firstName: technician.firstName,
          lastName: technician.lastName,
          phone: technician.phone ?? '',
          dailyServiceLimit: technician.dailyServiceLimit ?? 8,
          specialties: technician.specialties?.map((s) => s.specialty) ?? [],
          coverageDistricts: technician.coverageDistricts?.map((d) => d.district) ?? [],
        }}
      />
    </div>
  )
}
