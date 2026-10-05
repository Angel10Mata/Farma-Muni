import { MetadataRoute } from 'next'

// Reglas para buscadores
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/farmamuni/', '/api/', '/login'],
    },
  }
}