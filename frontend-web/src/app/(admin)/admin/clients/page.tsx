'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import { adminApi } from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Search, Send, User } from 'lucide-react'

type ClientRow = {
  id: string
  firstName: string
  lastName: string
  phone?: string
  user: { id: string; email: string; status: string; createdAt: string }
  _count: { serviceRequests: number }
}

type Message = {
  id: string
  clientUserId: string
  senderRole: 'ADMIN' | 'CLIENT'
  body: string
  createdAt: string
}

export default function AdminClientsPage() {
  const searchParams = useSearchParams()
  const preselect = searchParams.get('user')

  const [clients, setClients] = useState<ClientRow[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ClientRow | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadClients = useCallback(async () => {
    const data = await adminApi.clients({ search: search || undefined })
    setClients(data)
    return data as ClientRow[]
  }, [search])

  useEffect(() => { loadClients() }, [loadClients])

  // Auto-open a client passed via ?user= (from the notification bell)
  useEffect(() => {
    if (!preselect || selected) return
    loadClients().then((data) => {
      const match = data.find((c) => c.user.id === preselect)
      if (match) openClient(match)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselect])

  async function openClient(c: ClientRow) {
    setSelected(c)
    const msgs = await adminApi.clientMessages(c.user.id)
    setMessages(msgs)
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50)
  }

  // Live append of incoming client messages
  useEffect(() => {
    function onMsg(e: Event) {
      const msg = (e as CustomEvent).detail as Message
      if (selected && msg.clientUserId === selected.user.id) {
        setMessages((prev) => [...prev, msg])
        setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50)
      }
    }
    window.addEventListener('admin:support-message', onMsg)
    return () => window.removeEventListener('admin:support-message', onMsg)
  }, [selected])

  async function send() {
    if (!selected || !draft.trim()) return
    setSending(true)
    try {
      const msg = await adminApi.sendClientMessage(selected.user.id, draft.trim())
      setMessages((prev) => [...prev, msg])
      setDraft('')
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 50)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-xl font-bold text-gray-900 mb-4">Clientes & Suporte</h1>
      <div className="grid md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-9rem)]">
        {/* List */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Procurar cliente..."
                className="flex-1 bg-transparent py-2 text-sm outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto divide-y divide-gray-50">
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => openClient(c)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 ${selected?.id === c.id ? 'bg-brand-50' : ''}`}
              >
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.firstName} {c.lastName}</p>
                  <p className="text-xs text-gray-400 truncate">{c.user.email}</p>
                </div>
                {c.user.status !== 'ACTIVE' && (
                  <span className="ml-auto text-[10px] font-bold text-brand-600">{c.user.status}</span>
                )}
              </button>
            ))}
            {clients.length === 0 && <p className="p-6 text-sm text-gray-400 text-center">Nenhum cliente.</p>}
          </div>
        </div>

        {/* Chat */}
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Seleciona um cliente para ver a conversa de suporte.
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    {selected.firstName} {selected.lastName}
                    {selected.user.status !== 'ACTIVE' && <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">BLOQUEADO</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {selected.user.email}{selected.phone ? ` · ${selected.phone}` : ''} · {selected._count.serviceRequests} pedido(s)
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      const next = selected.user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                      await adminApi.setClientStatus(selected.user.id, next)
                      toast.success(next === 'SUSPENDED' ? 'Conta bloqueada' : 'Conta desbloqueada')
                      const data = await loadClients(); setSelected(data.find((c) => c.id === selected.id) ?? null)
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50"
                  >{selected.user.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'}</button>
                  <button
                    onClick={async () => {
                      if (!confirm('Eliminar este cliente?')) return
                      try { await adminApi.deleteClient(selected.user.id); toast.success('Cliente eliminado'); setSelected(null); loadClients() }
                      catch (err: any) { toast.error(err.message) }
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-brand-300 text-brand-600 hover:bg-brand-50"
                  >Eliminar</button>
                </div>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-gray-400 py-8">Sem mensagens. Envia a primeira.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.senderRole === 'ADMIN' ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                      <p>{m.body}</p>
                      <p className={`text-[10px] mt-1 ${m.senderRole === 'ADMIN' ? 'text-white/70' : 'text-gray-400'}`}>{formatDate(m.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') send() }}
                  placeholder="Escreve uma mensagem..."
                  className="flex-1 bg-gray-50 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-600/30"
                />
                <Button onClick={send} loading={sending} className="bg-brand-600 hover:bg-brand-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
