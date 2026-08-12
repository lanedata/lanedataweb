export const dynamic = 'force-static'

import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /calendario y /calendarapp existen y funcionan, pero no son secciones
        // públicas: no se enlazan ni se indexan (ver app/calendario/page.tsx).
        disallow: ['/admin', '/login', '/calendario', '/calendarapp', '/test', '/devhistorias'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
