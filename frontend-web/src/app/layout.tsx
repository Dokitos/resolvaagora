import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { CookieConsentBanner } from '@/components/layout/cookie-consent-banner'
import { CatalogPriceSync } from '@/components/layout/catalog-price-sync'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const SITE_URL = 'https://www.resolvaagora.pt'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ResolvaAgora — Serviços técnicos ao domicílio em Portugal',
    template: '%s · ResolvaAgora',
  },
  description:
    'Eletricistas, canalizadores, técnicos de AC, pintores e mais — profissionais verificados, com garantia, ao domicílio em Portugal. Peça, acompanhe e pague em segurança.',
  keywords: [
    'serviços técnicos domicílio',
    'eletricista Portugal',
    'canalizador Portugal',
    'técnico manutenção casa',
    'assistência técnica ao domicílio',
    'ResolvaAgora',
  ],
  authors: [{ name: 'Per4manceMD' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    siteName: 'ResolvaAgora',
    title: 'ResolvaAgora — Serviços técnicos ao domicílio em Portugal',
    description:
      'Eletricistas, canalizadores, técnicos de AC, pintores e mais — profissionais verificados, com garantia, ao domicílio em Portugal.',
    url: SITE_URL,
    images: [{ url: '/logo.png' }],
  },
  twitter: {
    card: 'summary',
    title: 'ResolvaAgora — Serviços técnicos ao domicílio em Portugal',
    description: 'Profissionais verificados, com garantia, ao domicílio em Portugal.',
    images: ['/logo.png'],
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <CookieConsentBanner />
        <CatalogPriceSync />
      </body>
    </html>
  )
}
