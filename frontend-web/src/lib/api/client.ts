import axios from 'axios'
import { getSession } from 'next-auth/react'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? process.env.API_URL ?? 'http://localhost:3001/api/v1'

export const api = axios.create({ baseURL: BASE_URL })

// Client-side interceptor: injects Bearer token
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    const session = await getSession()
    if (session?.user?.accessToken) {
      config.headers.Authorization = `Bearer ${session.user.accessToken}`
    }
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    // Session expired — sign out and go to login
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const { signOut } = await import('next-auth/react')
      await signOut({ callbackUrl: '/login', redirect: true })
      return new Promise(() => {}) // keep pending while redirect happens
    }

    const data = err.response?.data
    const message =
      (data && typeof data === 'object' && data.message) ||
      (!err.response ? 'Sem resposta do servidor (verifique se o backend está em execução)' : `Erro ${err.response.status}`)
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message))
  },
)
