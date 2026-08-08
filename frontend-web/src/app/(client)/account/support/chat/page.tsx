'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Send } from 'lucide-react'
import { supportApi } from '@/lib/api/support'
import type { SupportMessage } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import { cn, formatDate } from '@/lib/utils'
import { useNotificationsSocket } from '@/lib/hooks/use-notifications-socket'

const POLL_INTERVAL_MS = 15000

export default function SupportChatPage() {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    const data = await supportApi.getMessages()
    setMessages(data)
    supportApi.markAllRead().catch(() => {})
  }

  useEffect(() => {
    load()
    // Fallback de polling caso o WebSocket não esteja disponível/ligado.
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useNotificationsSocket({
    onSupportMessage: (msg) => {
      if (msg.senderRole === 'CLIENT') return
      load()
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    if (!text.trim()) return
    setSending(true)
    const body = text.trim()
    setText('')
    try {
      const msg = await supportApi.sendMessage(body)
      setMessages((prev) => [...prev, msg])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 pb-4">
        <Link href="/account/support">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-lg font-bold text-gray-900">Chat com o suporte</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((m) => (
          <div key={m.id} className={cn('flex', m.senderRole === 'CLIENT' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[75%] rounded-2xl px-3.5 py-2.5',
                m.senderRole === 'CLIENT' ? 'bg-accent-600 text-white' : 'bg-white border border-gray-200 text-gray-900',
              )}
            >
              {m.senderRole !== 'CLIENT' && <p className="text-[11px] font-semibold text-accent-600 mb-0.5">Suporte</p>}
              <p className="text-sm whitespace-pre-line">{m.body}</p>
              <p className={cn('text-[10px] mt-1', m.senderRole === 'CLIENT' ? 'text-white/70' : 'text-gray-400')}>
                {formatDate(m.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-12">Envie uma mensagem para começar.</p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escreva uma mensagem..."
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
        />
        <Button size="sm" onClick={handleSend} loading={sending} disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
