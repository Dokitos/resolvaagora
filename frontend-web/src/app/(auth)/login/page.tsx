'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
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
import { Wrench } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Password obrigatória'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

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
    router.push('/')
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
      router.push('/')
    } catch (err) {
      // Fechar a janela do fornecedor não é um erro a comunicar.
      if (!isPopupCancelled(err)) {
        toast.error('Não foi possível iniciar sessão com esse fornecedor')
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-3">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ResolvaAgora</h1>
            <p className="text-sm text-gray-500 mt-1">Inicie sessão na sua conta</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="nome@email.pt"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" loading={loading}>
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
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Continuar com Google
                </button>
                <button
                  type="button"
                  onClick={() => onSocial('apple')}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-900 disabled:opacity-50"
                >
                  Continuar com Apple
                </button>
              </div>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Não tem conta?{' '}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">
              Registar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
