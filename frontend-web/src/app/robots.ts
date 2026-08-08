import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/services', '/account', '/booking', '/admin', '/technician', '/api'],
      },
    ],
    sitemap: 'https://www.resolvaagora.pt/sitemap.xml',
  }
}
