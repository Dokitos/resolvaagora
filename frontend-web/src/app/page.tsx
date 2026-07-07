import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (!session) redirect('/login')
  if (session.user.role === 'ADMIN') redirect('/admin/dashboard')
  if (session.user.role === 'CLIENT') redirect('/dashboard')
  if (session.user.role === 'TECHNICIAN') redirect('/technician/dashboard')

  redirect('/login')
}
