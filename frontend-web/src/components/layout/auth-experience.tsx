'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowUpRight, CalendarDays, MessageSquare, Wrench } from 'lucide-react'

export function AuthExperience({ mode, children }: { mode: 'login' | 'register'; children: ReactNode }) {
  const login = mode === 'login'
  return (
    <main className="auth-experience min-h-screen bg-canvas text-ink lg:grid lg:grid-cols-[1fr_1fr]">
      <aside className="relative isolate hidden overflow-hidden bg-ink text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <Image src="/images/home-technician.png" alt="Imagem ilustrativa de um técnico a cuidar de uma cozinha" fill priority sizes="50vw" className="auth-photo object-cover object-[65%_center]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/95 via-black/35 to-black/40" />
        <Link href="/" className="relative w-fit text-2xl font-extrabold tracking-tight">Resolva<span className="text-accent-500">Agora</span></Link>
        <div className="relative my-20 max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/20 px-4 py-2 text-xs font-medium backdrop-blur"><span className="h-2 w-2 rounded-full bg-accent-500" />A sua casa. O seu tempo.</span>
          <h2 className="mt-7 text-5xl font-semibold leading-[1.08] tracking-tight xl:text-6xl">Menos por resolver.<br/><span className="text-accent-500">Mais para viver.</span></h2>
          <p className="mt-6 max-w-sm text-base leading-7 text-white/85">Da pequena reparação ao próximo projeto. Tudo começa com um cuidado a menos no seu dia.</p>
          <div className="auth-floating mt-10 w-fit max-w-full rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-4"><span className="rounded-xl bg-accent-500 p-3 text-ink"><Wrench className="h-5 w-5" /></span><div><p className="text-sm font-semibold">A casa pede. Nós ajudamos.</p><p className="mt-1 text-xs text-white/75">Encontre o serviço certo para si.</p></div><ArrowUpRight className="h-5 w-5 shrink-0 text-accent-500" /></div>
          </div>
        </div>
        <div className="relative flex flex-wrap gap-6 border-t border-white/20 pt-6 text-xs text-white/85"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent-500" />Escolha o seu horário</span><span className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-accent-500" />Acompanhe cada passo</span></div>
      </aside>
      <section className="relative flex min-w-0 flex-col px-5 py-7 sm:px-10 lg:px-12 xl:px-20">
        <div className="flex items-center justify-between gap-4"><Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted transition-colors hover:text-ink"><ArrowLeft className="h-4 w-4" />Voltar ao site</Link><Link href={login ? '/register' : '/login'} className="min-h-11 rounded-full border border-line bg-white px-4 py-3 text-xs font-semibold transition-colors hover:border-accent-600">{login ? 'Criar conta' : 'Entrar'}</Link></div>
        <div className="auth-enter mx-auto my-auto w-full max-w-[420px] py-10">
          <p className="mb-8 text-xl font-extrabold tracking-tight lg:hidden">Resolva<span className="text-accent-700">Agora</span></p>
          <div className="relative mb-8 h-32 overflow-hidden rounded-2xl bg-ink lg:hidden">
            <Image src="/images/home-technician.png" alt="Imagem ilustrativa de uma reparação em casa" fill sizes="(max-width: 1023px) 420px, 1px" className="object-cover object-[65%_55%]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 to-transparent" />
            <p className="absolute bottom-5 left-5 max-w-[180px] text-xl font-semibold leading-tight text-white">A sua casa,<br/><span className="text-accent-500">em boas mãos.</span></p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700">{login ? 'Bom tê-lo de volta' : 'O seu próximo cuidado começa aqui'}</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-[44px]">{login ? 'Sinta-se em casa.' : 'Uma conta. Mais tranquilidade.'}</h1>
          <p className="mb-8 mt-4 text-sm leading-6 text-muted">{login ? 'Entre para gerir os seus pedidos e continuar de onde ficou.' : 'Registe-se gratuitamente para marcar serviços e acompanhar tudo num só lugar.'}</p>
          {children}
        </div>
        <footer className="mx-auto flex w-full max-w-[420px] flex-wrap justify-between gap-3 border-t border-line pt-5 text-xs text-muted"><span>© {new Date().getFullYear()} ResolvaAgora</span><div className="flex gap-4"><Link href="/privacidade" className="hover:text-ink">Privacidade</Link><Link href="/termos" className="hover:text-ink">Termos</Link></div></footer>
      </section>
    </main>
  )
}
