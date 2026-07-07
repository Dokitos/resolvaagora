import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { TechnicianShell } from '@/components/layout/technician-shell'

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'TECHNICIAN') redirect('/login')
  return <TechnicianShell>{children}</TechnicianShell>
}
