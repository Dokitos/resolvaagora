import type { Metadata } from 'next'
import { Mail, Phone, MessageCircle, MapPin } from 'lucide-react'
import { SiteHeader } from '../_components/site-header'
import { SiteFooter } from '../_components/site-footer'
import { ContactForm } from './contact-form'

export const metadata: Metadata = {
  title: 'Contactos',
  description: 'Fale com a equipa ResolvaAgora por email, telefone, WhatsApp ou pelo formulário de contacto.',
  alternates: { canonical: '/contactos' },
}

const CHANNELS = [
  { icon: Mail, title: 'Email', value: 'suporte@resolvaagora.pt', href: 'mailto:suporte@resolvaagora.pt' },
  { icon: Phone, title: 'Telefone', value: '+351 21 000 0000', href: 'tel:+351210000000' },
  { icon: MessageCircle, title: 'WhatsApp', value: 'Resposta rápida por mensagem', href: 'https://wa.me/351910000000' },
  { icon: MapPin, title: 'Morada', value: 'Rua Dr. Justino de Carvalho 4, Samouco', href: undefined },
]

export default function ContactosPage() {
  return (
    <div className="min-h-screen bg-white text-brand-700">
      <SiteHeader />

      <section className="bg-gradient-to-br from-brand-700 to-brand-900 py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">Fala connosco</h1>
          <p className="mt-3 max-w-xl text-white/70">A nossa equipa está disponível de 2ª a 6ª, das 9h às 19h.</p>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-2">
          <div className="space-y-4">
            {CHANNELS.map((c) => {
              const Body = (
                <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-accent-500">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-accent-50">
                    <c.icon className="h-5 w-5 text-accent-600" />
                  </span>
                  <div>
                    <p className="font-bold text-brand-700">{c.title}</p>
                    <p className="text-sm text-brand-500">{c.value}</p>
                  </div>
                </div>
              )
              return c.href ? (
                <a key={c.title} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  {Body}
                </a>
              ) : (
                <div key={c.title}>{Body}</div>
              )
            })}
          </div>

          <ContactForm />
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
