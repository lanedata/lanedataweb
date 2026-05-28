import { createClient } from '@/lib/supabase/server'
import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lanedata.es'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('slug, updated_at')
    .eq('status', 'published')
    .order('updated_at', { ascending: false })

  const articleUrls: MetadataRoute.Sitemap = (articles ?? []).map((a) => ({
    url: `${siteUrl}/articulo/${a.slug}`,
    lastModified: new Date(a.updated_at),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/buscar`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
    ...articleUrls,
  ]
}
