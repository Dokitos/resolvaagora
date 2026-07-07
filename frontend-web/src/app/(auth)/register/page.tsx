'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api/client'
import { Wrench } from 'lucide-react'

const schema = z.object({
  firstName: z.string().min(2, 'Nome obrigatório'),
  lastName: z.string().min(2, 'Apelido obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  phone: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await api.post('/auth/register', data)
      await signIn('credentials', { email: data.email, password: data.password, redirect: false })
      toast.success('Conta criada com sucesso!')
      router.push('/dashboard')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta')
    } finally {
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
            <h1 className="text-xl font-bold text-gray-900">Criar conta</h1>
            <p className="text-sm text-gray-500 mt-1">Registe-se gratuitamente</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input id="firstName" label="Nome" placeholder="Maria" error={errors.firstName?.message} {...register('firstName')} />
              <Input id="lastName" label="Apelido" placeholder="Santos" error={errors.lastName?.message} {...register('lastName')} />
            </div>
            <Input id="email" label="Email" type="email" placeholder="nome@email.pt" error={errors.email?.message} {...register('email')} />
            <Input id="phone" label="Telemóvel (opcional)" placeholder="+351 912 345 678" {...register('phone')} />
            <Input id="password" label="Password" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <Button type="submit" className="w-full" loading={loading}>
              Criar conta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
