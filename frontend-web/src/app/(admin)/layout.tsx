import './admin-theme.css'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth/options'
import { AdminShell } from '@/components/layout/admin-shell'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role !== 'ADMIN') redirect('/login')
  return <><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('resolvaagora-admin-theme');document.documentElement.dataset.adminTheme=t==='dark'||t==='light'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}catch(e){document.documentElement.dataset.adminTheme='light'}" }} /><AdminShell>{children}</AdminShell></>
}
