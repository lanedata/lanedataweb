export const dynamic = 'force-static'

import { createStaticClient } from '@/lib/supabase/static'
import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lanedata.es'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let articles: { slug: string; updated_at: string }[] = []
  try {
    const supabase = createStaticClient()
    const { data } = await supabase
      .from('articles')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
    articles = data ?? []
  } catch {
    // DB not ready yet — return minimal sitemap
  }

  const articleUrls: MetadataRoute.Sitemap = articles.map((a) => ({
    url: `${siteUrl}/articulo/${a.slug}/`,
    lastModified: new Date(a.updated_at),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/buscar/`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    ...articleUrls,
  ]
}
