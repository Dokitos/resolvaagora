'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { serviceRequestsApi } from '@/lib/api/service-requests'
import type { ServiceRequest } from '@/lib/api/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { formatDate, formatCurrency, SPECIALTY_LABELS, SPECIALTY_ICONS } from '@/lib/utils'
import { ArrowLeft, MapPin, Wrench, Clock, CheckCircle, XCircle, AlertTriangle, Star } from 'lucide-react'
import Link from 'next/link'
import { differenceInHours, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Modal } from '@/components/ui/modal'

export default function ServiceDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [sr, setSr] = useState<ServiceRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectModal, setRejectModal] = useState(false)

  async function load() {
    const data = await serviceRequestsApi.get(id)
    setSr(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handlePayDisplacement() {
    setActionLoading(true)
    try {
      const result = await serviceRequestsApi.payDisplacement(id)
      // In production: integrate Stripe Elements
      // For now: mock success flow
      toast.success('Pagamento simulado com sucesso!')
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleApproveQuote() {
    setActionLoading(true)
    try {
      await serviceRequestsApi.approveQuote(id)
      toast.success('Orçamento aprovado! O técnico irá iniciar o trabalho.')
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRejectQuote() {
    setRejectModal(false)
    setActionLoading(true)
    try {
      await serviceRequestsApi.rejectQuote(id)
      toast('Orçamento rejeitado. A taxa de deslocação não é reembolsada.', { icon: 'ℹ️' })
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
  if (!sr) return <p>Pedido não encontrado.</p>

  const quoteExpiresIn = sr.quote?.expiresAt
    ? differenceInHours(parseISO(sr.quote.expiresAt), new Date())
    : null

  return (
    <>
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/services">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">
            {SPECIALTY_ICONS[sr.specialty]} {SPECIALTY_LABELS[sr.specialty]}
          </h1>
          <p className="text-sm text-gray-500">{formatDate(sr.createdAt)}</p>
        </div>
        <StatusBadge status={sr.status} />
      </div>

      {/* Pagar deslocação */}
      {sr.status === 'DRAFT' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">Pagamento necessário</p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Pague a taxa de deslocação de {formatCurrency(Number(sr.displacementFee))} para confirmar o pedido.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handlePayDisplacement} loading={actionLoading} className="w-full">
              Pagar {formatCurrency(Number(sr.displacementFee))} e confirmar
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Orçamento pendente */}
      {sr.status === 'QUOTE_SENT' && sr.quote && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Orçamento recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-blue-800">{sr.quote.description}</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Mão de obra</p>
                  <p className="font-semibold">{formatCurrency(Number(sr.quote.laborCost))}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-500 text-xs">Materiais</p>
                  <p className="font-semibold">{formatCurrency(Number(sr.quote.materialsCost))}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
                  <p className="text-gray-500 text-xs">Total c/ IVA</p>
                  <p className="font-bold text-blue-700">{formatCurrency(Number(sr.quote.totalCost))}</p>
                </div>
              </div>
              {quoteExpiresIn !== null && (
                <div className={`flex items-center gap-2 text-sm rounded-lg p-2 ${quoteExpiresIn < 8 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  <Clock className="h-4 w-4" />
                  {quoteExpiresIn > 0
                    ? `Expira em ${quoteExpiresIn}h`
                    : 'Orçamento expirado'}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="gap-3">
            <Button variant="danger" onClick={() => setRejectModal(true)} loading={actionLoading} className="flex-1">
              <XCircle className="h-4 w-4" />
              Rejeitar
            </Button>
            <Button onClick={handleApproveQuote} loading={actionLoading} className="flex-1">
              <CheckCircle className="h-4 w-4" />
              Aprovar orçamento
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Detalhes */}
      <Card>
        <CardHeader><CardTitle>Informações do pedido</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Descrição</p>
            <p className="text-sm text-gray-800 mt-1">{sr.description}</p>
          </div>

          {sr.address && (
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Morada</p>
              <div className="flex items-start gap-2 mt-1">
                <MapPin className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-800">
                  {sr.address.street} {sr.address.number}, {sr.address.city}
                </p>
              </div>
            </div>
          )}

          {sr.technician && (
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Técnico</p>
              <p className="text-sm text-gray-800 mt-1">
                {sr.technician.firstName} {sr.technician.lastName}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Taxa deslocação</p>
              <p className="text-sm font-medium text-gray-800 mt-1">
                {formatCurrency(Number(sr.displacementFee))}
                {sr.isFreeVisit && <span className="ml-2 text-xs text-green-600">(Gratuita)</span>}
              </p>
            </div>
            {sr.isPriority && (
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Prioridade</p>
                <p className="text-sm text-blue-600 font-medium mt-1">⭐ Prioritário</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Avaliar serviço */}
      {sr.status === 'COMPLETED' && !sr.review && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-amber-900">O seu serviço foi concluído!</p>
                <p className="text-sm text-amber-700 mt-0.5">Avalie o trabalho do técnico.</p>
              </div>
              <Link href={`/services/${id}/review`}>
                <Button size="sm" className="gap-1 bg-amber-500 hover:bg-amber-600">
                  <Star className="h-4 w-4" />Avaliar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review já submetida */}
      {sr.review && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-400" />A sua avaliação</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 mb-2">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className={`h-5 w-5 ${s <= sr.review!.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
              ))}
              <span className="text-sm text-gray-600 ml-2">{sr.review.rating}/5</span>
            </div>
            {sr.review.comment && <p className="text-sm text-gray-700">{sr.review.comment}</p>}
          </CardContent>
        </Card>
      )}

      {/* Fotos */}
      {sr.photos && sr.photos.filter((p) => p.type === 'PROOF').length > 0 && (
        <Card>
          <CardHeader><CardTitle>Provas do trabalho</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {sr.photos.filter((p) => p.type === 'PROOF').map((photo) => (
                <img key={photo.id} src={photo.url} alt="Prova" className="rounded-lg w-full aspect-square object-cover" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>

    <Modal
      open={rejectModal}
      onClose={() => setRejectModal(false)}
      title="Rejeitar orçamento"
      description="Tem a certeza? A taxa de deslocação não é reembolsada. O pedido ficará como rejeitado."
      confirmLabel="Rejeitar orçamento"
      cancelLabel="Cancelar"
      variant="danger"
      onConfirm={handleRejectQuote}
      loading={actionLoading}
    />
    </>
  )
}
