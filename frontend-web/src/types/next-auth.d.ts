import type { DefaultSession, DefaultUser } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'
import type { Role } from '@/lib/api/types'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      accessToken: string
    } & DefaultSession['user']
  }

  interface User extends DefaultUser {
    role: Role
    accessToken: string
    refreshToken: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string
    role: Role
    accessToken: string
    refreshToken: string
  }
}
