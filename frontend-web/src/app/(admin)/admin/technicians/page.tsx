'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/api/admin'
import type { Technician } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SPECIALTY_LABELS } from '@/lib/utils'
import { Plus, Wrench, Pencil } from 'lucide-react'

const STATUS_BADGE: Record<string, { label: string; variant: any }> = {
  AVAILABLE:   { label: 'Disponível',  variant: 'success'  },
  BUSY:        { label: 'Ocupado',     variant: 'warning'  },
  UNAVAILABLE: { label: 'Indisponível', variant: 'default' },
  ON_LEAVE:    { label: 'De férias',   variant: 'default'  },
}

export default function AdminTechniciansPage() {
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.technicians().then(setTechnicians).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Técnicos</h1>
        <Link href="/admin/technicians/new">
          <Button size="sm"><Plus className="h-4 w-4" />Novo técnico</Button>
        </Link>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left">Técnico</th>
                <th className="px-4 py-3 text-left">Especialidades</th>
                <th className="px-4 py-3 text-left">Distritos</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Limite/dia</th>
                <th className="px-4 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {technicians.map((tech) => (
                <tr key={tech.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{tech.firstName} {tech.lastName}</p>
                        <p className="text-xs text-gray-400">{tech.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tech.specialties?.map((s) => (
                        <Badge key={s.specialty} variant="info" className="text-xs">
                          {SPECIALTY_LABELS[s.specialty]}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tech.coverageDistricts?.map((d) => (
                        <span key={d.district} className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-600">
                          {d.district}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[tech.status]?.variant}>
                      {STATUS_BADGE[tech.status]?.label || tech.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{tech.dailyServiceLimit} serviços</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/technicians/${tech.id}/edit`}>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Pencil className="h-3 w-3" />Editar
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {technicians.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">Nenhum técnico registado</div>
          )}
        </div>
      </Card>
    </div>
  )
}
