'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export function ContactForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const subject = encodeURIComponent(`Contacto do site — ${name || 'Visitante'}`)
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`)
    window.location.href = `mailto:suporte@resolvaagora.pt?subject=${subject}&body=${body}`
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-bold text-brand-700">Envia-nos uma mensagem</h2>
      <Input label="Nome" required value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Textarea label="Mensagem" required rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
      <Button type="submit" className="w-full bg-accent-500 text-brand-900 hover:bg-accent-600">
        <Send className="h-4 w-4" />
        Enviar
      </Button>
    </form>
  )
}
