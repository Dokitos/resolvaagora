'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import type { ServiceRequest } from '@/lib/api/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { formatDate, SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import { Plus } from 'lucide-react'

const PAGE_SIZE = 10

export default function ServicesListPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    setLoading(true)
    serviceRequestsApi.list({ page, limit: PAGE_SIZE })
      .then((data) => {
        setRequests(data)
        if (data.length < PAGE_SIZE && page === 1) setTotal(data.length)
        else setTotal(Math.max(total, page * PAGE_SIZE + (data.length === PAGE_SIZE ? 1 : 0)))
      })
      .finally(() => setLoading(false))
  }, [page])

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Os meus serviços</h1>
        <Link href="/services/new">
          <Button size="sm"><Plus className="h-4 w-4" />Novo pedido</Button>
        </Link>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && requests.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">Nenhum pedido encontrado.</p>
            <Link href="/services/new">
              <Button className="mt-4" size="sm"><Plus className="h-4 w-4" />Criar pedido</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {requests.map((sr) => (
          <Link key={sr.id} href={`/services/${sr.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{SPECIALTY_ICONS[sr.specialty]}</span>
                  <div>
                    <p className="font-medium text-gray-900">{SPECIALTY_LABELS[sr.specialty]}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{sr.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(sr.createdAt)}</p>
                  </div>
                </div>
                <StatusBadge status={sr.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!loading && requests.length > 0 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}
