import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { BookingHeader } from './_components/booking-header'

// Ecrã imersivo do wizard de reserva — sem o chrome do ClientShell (bottom-nav/header
// completos), só um cabeçalho minimalista com progresso, igual à app.
export default async function BookingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login?from=/booking/category')
  if (session.user.role !== 'CLIENT') redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50">
      <BookingHeader />
      <main className="max-w-xl mx-auto px-4 py-6 pb-28">{children}</main>
    </div>
  )
}
