'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import type { ServiceRequest, Technician } from '@/lib/api/types'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency, SPECIALTY_LABELS, SLA_METRIC_LABELS } from '@/lib/utils'
import { ArrowLeft, RefreshCw, AlertTriangle, Phone, Mail, MessageCircle, Send, Trash2, XCircle } from 'lucide-react'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho', AWAITING_PAYMENT: 'Aguarda pagamento', PAID: 'Pago',
  IN_DISTRIBUTION: 'Em distribuição', ASSIGNED: 'Atribuído', IN_TRANSIT: 'Em trânsito',
  ARRIVED: 'No local', IN_DIAGNOSIS: 'Em diagnóstico', QUOTE_SENT: 'Orçamento enviado',
  QUOTE_APPROVED: 'Orçamento aprovado', IN_EXECUTION: 'Em execução', COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado', QUOTE_REJECTED: 'Orçamento rejeitado', EXPIRED: 'Expirado',
}
const EDITABLE_STATUSES = ['ASSIGNED', 'IN_TRANSIT', 'ARRIVED', 'IN_DIAGNOSIS', 'IN_EXECUTION', 'COMPLETED', 'CANCELLED']

export default function AdminServiceRequestDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const [sr, setSr] = useState<ServiceRequest | null>(null)
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [selectedTech, setSelectedTech] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  // chat
  const [messages, setMessages] = useState<any[]>([])
  const [draft, setDraft] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)
  const clientUserId = (sr?.client as any)?.userId as string | undefined

  async function load() {
    const [s, t] = await Promise.all([adminApi.getServiceRequest(id), adminApi.technicians({ status: 'AVAILABLE' })])
    setSr(s); setTechnicians(t); setNewStatus(s.status)
    if ((s.client as any)?.userId) {
      adminApi.clientMessages((s.client as any).userId).then(setMessages).catch(() => {})
    }
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [id])

  useEffect(() => {
    function onMsg(e: Event) {
      const msg = (e as CustomEvent).detail
      if (clientUserId && msg.clientUserId === clientUserId) setMessages((p) => [...p, msg])
    }
    window.addEventListener('admin:support-message', onMsg)
    return () => window.removeEventListener('admin:support-message', onMsg)
  }, [clientUserId])

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }) }, [messages])

  async function handleReassign() {
    if (!selectedTech) return toast.error('Selecione um técnico')
    setBusy(true)
    try { await adminApi.reassign(id, selectedTech); toast.success('Pedido redistribuído'); await load() }
    catch (err: any) { toast.error(err.message) } finally { setBusy(false) }
  }

  async function handleStatus() {
    if (!sr || newStatus === sr.status) return
    setBusy(true)
    try { await adminApi.editServiceRequest(id, { status: newStatus }); toast.success('Estado atualizado'); await load() }
    catch (err: any) { toast.error(err.message) } finally { setBusy(false) }
  }

  async function handleCancel() {
    const reason = window.prompt('Motivo do cancelamento:', 'Cancelado pelo administrador')
    if (reason === null) return
    setBusy(true)
    try { await adminApi.cancelServiceRequest(id, reason); toast.success('Pedido cancelado'); await load() }
    catch (err: any) { toast.error(err.message) } finally { setBusy(false) }
  }

  async function handleDelete() {
    if (!window.confirm('Eliminar definitivamente este pedido? Esta ação não pode ser revertida.')) return
    setBusy(true)
    try { await adminApi.deleteServiceRequest(id); toast.success('Pedido eliminado'); router.push('/admin/service-requests') }
    catch (err: any) { toast.error(err.message); setBusy(false) }
  }

  async function sendMessage() {
    if (!clientUserId || !draft.trim()) return
    try {
      const msg = await adminApi.sendClientMessage(clientUserId, draft.trim(), id)
      setMessages((p) => [...p, msg]); setDraft('')
    } catch (err: any) { toast.error(err.message) }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
  if (!sr) return <p>Pedido não encontrado.</p>

  const techOptions = technicians.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}` }))
  const statusOptions = EDITABLE_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] }))
  const payments = (sr as any).payments as Array<{ id: string; type: string; amount: number; status: string; paidAt?: string }> | undefined
  const paidTotal = (payments ?? []).filter((p) => p.status === 'COMPLETED').reduce((a, p) => a + Number(p.amount), 0)
  const problemPhotos = sr.photos?.filter((p) => p.type === 'PROBLEM' || p.uploadedByRole === 'CLIENT') ?? []
  const proofPhotos = sr.photos?.filter((p) => p.type === 'PROOF') ?? []
  const client = sr.client as any
  const phone = client?.phone as string | undefined

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/service-requests"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{SPECIALTY_LABELS[sr.specialty]}</h1>
          <p className="text-sm text-gray-400">{sr.id}</p>
        </div>
        <StatusBadge status={sr.status} />
      </div>

      {/* Moderation bar */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-6">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-500">Alterar estado</label>
            <div className="flex gap-2 mt-1">
              <Select options={statusOptions} value={newStatus} onChange={(e) => setNewStatus(e.target.value)} />
              <Button onClick={handleStatus} loading={busy} disabled={newStatus === sr.status} className="bg-brand-600 hover:bg-brand-700">Guardar</Button>
            </div>
          </div>
          <Button onClick={handleCancel} loading={busy} variant="outline" className="text-amber-700 border-amber-300"><XCircle className="h-4 w-4 mr-1" />Cancelar</Button>
          <Button onClick={handleDelete} loading={busy} variant="outline" className="text-brand-700 border-brand-300"><Trash2 className="h-4 w-4 mr-1" />Eliminar</Button>
        </CardContent>
      </Card>

      {/* SLA */}
      {sr.slaAlerts && sr.slaAlerts.length > 0 && (
        <div className="space-y-2">
          {sr.slaAlerts.map((alert) => (
            <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg ${alert.level === 'CRITICAL' ? 'bg-brand-50 border border-brand-200' : 'bg-amber-50 border border-amber-200'}`}>
              <AlertTriangle className={`h-4 w-4 ${alert.level === 'CRITICAL' ? 'text-brand-600' : 'text-amber-600'}`} />
              <p className="text-sm font-medium">{SLA_METRIC_LABELS[alert.metric]} — SLA {alert.level === 'CRITICAL' ? 'Crítico' : 'em Aviso'}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Redistribuir */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />Redistribuir</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-500">Atribuir manualmente a outro técnico disponível.</p>
            <Select options={techOptions} placeholder="Selecione técnico..." value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} />
            <Button onClick={handleReassign} loading={busy} className="w-full" variant="outline">Confirmar redistribuição</Button>
          </CardContent>
        </Card>

        {/* Valores */}
        <Card>
          <CardHeader><CardTitle>Valores</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Taxa de deslocação</span>
              <span>{formatCurrency(Number(sr.displacementFee))} {sr.isDisplacementFeePaid ? <Badge className="ml-1 bg-green-100 text-green-700">paga</Badge> : <Badge className="ml-1 bg-amber-100 text-amber-700">por pagar</Badge>}</span>
            </div>
            {sr.quote && (
              <div className="flex justify-between"><span className="text-gray-500">Trabalho (orçamento)</span><span>{formatCurrency(Number(sr.quote.totalCost))}</span></div>
            )}
            {payments && payments.length > 0 && (
              <div className="border-t pt-2 mt-2 space-y-1">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between">
                    <span className="text-gray-500">{p.type === 'DISPLACEMENT' ? 'Pagamento deslocação' : 'Pagamento serviço'}</span>
                    <span>{formatCurrency(Number(p.amount))} <Badge className="ml-1">{p.status}</Badge></span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between font-semibold border-t pt-2 mt-2">
              <span>Total pago pelo cliente</span><span className="text-brand-600">{formatCurrency(paidTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cliente + contacto */}
      {client && (
        <Card>
          <CardHeader><CardTitle>Cliente</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-medium">{client.firstName} {client.lastName}</span>
            {phone && (
              <>
                <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-accent-600 hover:underline"><Phone className="h-4 w-4" />{phone}</a>
                <a href={`https://wa.me/${phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-green-600 hover:underline"><MessageCircle className="h-4 w-4" />WhatsApp</a>
              </>
            )}
            {client.email && <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1 text-gray-600 hover:underline"><Mail className="h-4 w-4" />{client.email}</a>}
          </CardContent>
        </Card>
      )}

      {/* Chat de suporte */}
      {clientUserId && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-4 w-4" />Chat de suporte</CardTitle></CardHeader>
          <CardContent>
            <div ref={chatRef} className="max-h-64 overflow-auto space-y-2 mb-3 bg-gray-50 rounded-lg p-3">
              {messages.length === 0 && <p className="text-center text-sm text-gray-400 py-6">Sem mensagens com este cliente.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${m.senderRole === 'ADMIN' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200'}`}>
                    {m.body}
                    <div className={`text-[10px] mt-0.5 ${m.senderRole === 'ADMIN' ? 'text-white/70' : 'text-gray-400'}`}>{formatDate(m.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                placeholder="Mensagem para o cliente..." className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-600/30" />
              <Button onClick={sendMessage} className="bg-brand-600 hover:bg-brand-700"><Send className="h-4 w-4" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de estados */}
      {(sr as any).statusHistory && (
        <Card>
          <CardHeader><CardTitle>Histórico de estados</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-50">
              {(sr as any).statusHistory.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={h.newStatus} />
                    {h.notes && <span className="text-xs text-gray-400">{h.notes}</span>}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(h.createdAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fotos */}
      {(problemPhotos.length > 0 || proofPhotos.length > 0) && (
        <Card>
          <CardHeader><CardTitle>Fotos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {problemPhotos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Fotos do cliente</p>
                <div className="grid grid-cols-4 gap-2">
                  {problemPhotos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); setLightbox(p.url) }}>
                      <img src={p.url} alt="Problema" className="rounded-lg aspect-square object-cover w-full cursor-zoom-in" />
                    </a>
                  ))}
                </div>
              </div>
            )}
            {proofPhotos.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Fotos de prova (técnico)</p>
                <div className="grid grid-cols-4 gap-2">
                  {proofPhotos.map((p) => (
                    <a key={p.id} href={p.url} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); setLightbox(p.url) }}>
                      <img src={p.url} alt="Prova" className="rounded-lg aspect-square object-cover w-full cursor-zoom-in" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
        </div>
      )}
    </div>
  )
}
