import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { Landing } from './(marketing)/_components/landing'

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'ResolvaAgora',
  description:
    'Plataforma de serviços técnicos ao domicílio em Portugal — eletricidade, canalização, ar condicionado, pintura, montagem de móveis, limpeza, serralharia, jardinagem, revestimentos e TV/antenas.',
  url: 'https://www.resolvaagora.pt',
  logo: 'https://www.resolvaagora.pt/logo.png',
  email: 'suporte@resolvaagora.pt',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Rua Dr. Justino de Carvalho 4',
    addressLocality: 'Samouco',
    addressCountry: 'PT',
  },
  areaServed: 'PT',
  priceRange: '€€',
}

export default async function Home() {
  const session = await getServerSession(authOptions)

  // Visitante sem sessão → página pública de marketing
  if (!session) {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <Landing />
      </>
    )
  }

  // Com sessão → encaminha para o portal certo consoante o papel
  if (session.user.role === 'ADMIN') redirect('/admin/dashboard')
  if (session.user.role === 'CLIENT') redirect('/dashboard')
  if (session.user.role === 'TECHNICIAN') redirect('/technician/dashboard')

  redirect('/login')
}
