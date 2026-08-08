'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Phone, Mail, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const PHONE = '+351210000000'
const PHONE_DISPLAY = '+351 21 000 0000'
const EMAIL = 'suporte@resolvaagora.pt'
const WHATSAPP = '351910000000'

const FAQ = [
  {
    q: 'Como funciona o agendamento?',
    a: 'Escolhe o serviço, indica a morada e a data preferida, e confirma o pagamento. Um técnico certificado é atribuído ao teu pedido.',
  },
  {
    q: 'O valor apresentado é final?',
    a: 'O valor é um orçamento estimado. O orçamento final é determinado no local após levantamento das tarefas e está sujeito a confirmação.',
  },
  {
    q: 'Posso cancelar um pedido?',
    a: 'Sim. Podes cancelar gratuitamente enquanto o pedido estiver por confirmar, diretamente em "Os meus serviços".',
  },
  {
    q: 'Os serviços têm garantia?',
    a: 'Todos os serviços têm 6 meses de garantia sobre a mão de obra realizada.',
  },
]

function ContactTile({ icon: Icon, color, title, subtitle, href }: { icon: React.ComponentType<{ className?: string }>; color: string; title: string; subtitle: string; href: string }) {
  return (
    <Link
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      className="flex items-center gap-3.5 rounded-2xl border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors"
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </Link>
  )
}

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/account">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Ajuda e suporte</h1>
      </div>

      <div>
        <h2 className="font-bold text-gray-900">Fala connosco</h2>
        <p className="text-xs text-gray-500 mt-0.5">A nossa equipa está disponível de 2ª a 6ª, das 9h às 19h.</p>
      </div>

      <div className="space-y-2.5">
        <ContactTile icon={MessageCircle} color="bg-accent-50 text-accent-600" title="Chat com o suporte" subtitle="Falar com a nossa equipa dentro do site" href="/account/support/chat" />
        <ContactTile icon={Phone} color="bg-green-50 text-green-600" title="Ligar" subtitle={PHONE_DISPLAY} href={`tel:${PHONE}`} />
        <ContactTile icon={MessageCircle} color="bg-[#25D366]/10 text-[#25D366]" title="WhatsApp" subtitle="Resposta rápida por mensagem" href={`https://wa.me/${WHATSAPP}`} />
        <ContactTile icon={Mail} color="bg-brand-100 text-brand-700" title="Email" subtitle={EMAIL} href={`mailto:${EMAIL}?subject=Pedido de apoio`} />
      </div>

      <div>
        <h2 className="font-bold text-gray-900 mb-3">Perguntas frequentes</h2>
        <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100">
          {FAQ.map((item, i) => (
            <div key={item.q}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="text-sm font-medium text-gray-900">{item.q}</span>
                <ChevronDown className={cn('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', openFaq === i && 'rotate-180')} />
              </button>
              {openFaq === i && (
                <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{item.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
