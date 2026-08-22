import type { JWT } from 'next-auth/jwt'
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { api } from '@/lib/api/client'
import type { Role } from '@/lib/api/types'

/**
 * O backend não devolve um campo `expiresIn` explícito no login/refresh —
 * assina o `accessToken` como um JWT normal com `expiresIn: '15m'` (ver
 * `backend/src/modules/auth/application/use-cases/login.use-case.ts`). Por
 * isso lemos o `exp` (segundos epoch) diretamente do JWT em vez de o backend
 * ter de ser alterado só para expor esse valor separadamente. Não validamos
 * a assinatura aqui — isso já é feito pelo backend em cada pedido; isto serve
 * só para o NextAuth saber quando vale a pena tentar renovar.
 */
function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    const json = Buffer.from(payload, 'base64').toString('utf-8')
    const { exp } = JSON.parse(json) as { exp?: number }
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/** Margem de segurança: renova um pouco antes do JWT expirar de facto. */
const REFRESH_SKEW_MS = 30 * 1000

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const res = await api.post('/auth/refresh', { refreshToken: token.refreshToken })
    const { accessToken, refreshToken } = res.data as { accessToken: string; refreshToken: string }

    return {
      ...token,
      accessToken,
      refreshToken,
      accessTokenExpires: decodeJwtExpiryMs(accessToken),
      error: undefined,
    }
  } catch (err) {
    // Não conseguimos renovar (refresh token expirado/revogado, backend em
    // baixo, etc.). Mantemos o token antigo — o interceptor 401 em
    // `@/lib/api/client.ts` já trata de forçar logout assim que uma chamada
    // real à API falhar com o accessToken expirado.
    console.error('[NextAuth] falha ao renovar accessToken:', err)
    return { ...token, error: 'RefreshAccessTokenError' as const }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await api.post('/auth/login', {
            email: credentials.email,
            password: credentials.password,
          })

          const { accessToken, refreshToken, user } = res.data

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            accessToken,
            refreshToken,
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Erro desconhecido'
          console.error('[NextAuth] login failed:', msg)
          throw new Error(Array.isArray(msg) ? msg.join(', ') : msg)
        }
      },
    }),

    /**
     * Entrada com Apple ou Google. O browser autentica-se no Firebase e passa
     * aqui o ID token; o backend valida-o e devolve a mesma sessão do login
     * com password, pelo que o resto do NextAuth não precisa de distinguir os
     * dois caminhos.
     */
    CredentialsProvider({
      id: 'social',
      name: 'social',
      credentials: {
        idToken: { label: 'ID token', type: 'text' },
        name: { label: 'Nome', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null

        try {
          const res = await api.post('/auth/social', {
            idToken: credentials.idToken,
            ...(credentials.name ? { name: credentials.name } : {}),
          })

          const { accessToken, refreshToken, user } = res.data

          return {
            id: user.id,
            email: user.email,
            role: user.role,
            accessToken,
            refreshToken,
          }
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Erro desconhecido'
          console.error('[NextAuth] social login failed:', msg)
          throw new Error(Array.isArray(msg) ? msg.join(', ') : msg)
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Login inicial — grava os tokens devolvidos pelo `authorize()`.
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.accessToken = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken
        token.accessTokenExpires = decodeJwtExpiryMs((user as any).accessToken)
        token.error = undefined
        return token
      }

      // AccessToken ainda válido — nada a fazer.
      if (typeof token.accessTokenExpires === 'number' && Date.now() < token.accessTokenExpires - REFRESH_SKEW_MS) {
        return token
      }

      // AccessToken expirado (ou sessão antiga sem `accessTokenExpires`
      // gravado) — tenta renová-lo com o refreshToken antes de continuar.
      return refreshAccessToken(token)
    },
    async session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as Role
      session.user.accessToken = token.accessToken as string
      if (token.error) (session as any).error = token.error
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
}
