import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.resolvaagora.pt'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = ['', '/servicos', '/sobre', '/contactos', '/termos', '/privacidade', '/cookies', '/login', '/register']

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/servicos' ? 0.9 : 0.6,
  }))
}
