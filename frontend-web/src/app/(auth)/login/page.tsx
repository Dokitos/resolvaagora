'use client'

import { useState } from 'react'
import { getSession, signIn } from 'next-auth/react'
import {
  isPopupCancelled,
  signInWithApple,
  signInWithGoogle,
  socialLoginEnabled,
} from '@/lib/firebase/client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff } from 'lucide-react'
import { AuthExperience } from '@/components/layout/auth-experience'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password obrigatória'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  /**
   * Volta ao sítio de onde veio (`?from=`, posto pelo layout da reserva) se
   * for um cliente — os outros papéis não têm acesso à reserva e ficavam num
   * ciclo de volta ao login. Só caminhos internos, nunca outro domínio.
   */
  async function goAfterLogin() {
    const from = new URLSearchParams(window.location.search).get('from')
    if (from && from.startsWith('/') && !from.startsWith('//')) {
      const session = await getSession()
      if (session?.user.role === 'CLIENT') {
        router.push(from)
        return
      }
    }
    router.push('/')
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    const res = await signIn('credentials', { ...data, redirect: false })

    if (res?.error) {
      const msg = res.error === 'CredentialsSignin' ? 'Email ou password incorretos' : res.error
      toast.error(msg)
      setLoading(false)
      return
    }

    toast.success('Bem-vindo!')
    await goAfterLogin()
  }

  /**
   * Autentica no fornecedor e troca o ID token pela sessão, através do
   * provider `social` do NextAuth.
   */
  async function onSocial(provider: 'google' | 'apple') {
    setLoading(true)
    try {
      const { idToken, name } = provider === 'google'
        ? await signInWithGoogle()
        : await signInWithApple()

      const res = await signIn('social', { idToken, name: name ?? '', redirect: false })
      if (res?.error) {
        toast.error(res.error === 'CredentialsSignin' ? 'Não foi possível iniciar sessão' : res.error)
        setLoading(false)
        return
      }

      toast.success('Bem-vindo!')
      await goAfterLogin()
    } catch (err) {
      // Fechar a janela do fornecedor não é um erro a comunicar.
      if (!isPopupCancelled(err)) {
        toast.error('Não foi possível iniciar sessão com esse fornecedor')
      }
      setLoading(false)
    }
  }

  return (
    <AuthExperience mode="login">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" aria-busy={loading}>
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="nome@email.pt"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="password"
              label="Palavra-passe"
              type={showPassword ? "text" : "password"}
              placeholder="A sua palavra-passe"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} aria-pressed={showPassword} aria-label={showPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'} className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-muted hover:text-ink">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPassword ? 'Ocultar' : 'Mostrar'} palavra-passe</button>
            <Button type="submit" className="premium-button w-full min-h-12" loading={loading}>
              Entrar
            </Button>
          </form>

          {socialLoginEnabled && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">ou</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => onSocial('google')}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 premium-button min-h-12 rounded-xl border border-line bg-white px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Continuar com Google
                </button>
                <button
                  type="button"
                  onClick={() => onSocial('apple')}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 premium-button min-h-12 rounded-xl bg-ink px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-900 disabled:opacity-50"
                >
                  Continuar com Apple
                </button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{' '}
            <Link href="/register" className="text-ink font-semibold underline decoration-accent-500 underline-offset-4 hover:text-accent-700">
              Registar
            </Link>
          </p>
    </AuthExperience>
  )
}
