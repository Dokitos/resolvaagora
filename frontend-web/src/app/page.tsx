import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { Landing } from './(marketing)/_components/landing'

export default async function Home() {
  const session = await getServerSession(authOptions)

  // Visitante sem sessão → página pública de marketing (landing 3D)
  if (!session) return <Landing />

  // Com sessão → encaminha para o portal certo consoante o papel
  if (session.user.role === 'ADMIN') redirect('/admin/dashboard')
  if (session.user.role === 'CLIENT') redirect('/dashboard')
  if (session.user.role === 'TECHNICIAN') redirect('/technician/dashboard')

  redirect('/login')
}
