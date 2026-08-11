import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { ArchiveBrowser } from '@/components/ArchiveBrowser'
import { createStaticClient } from '@/lib/supabase/static'
import type { Metadata } from 'next'
import type { ArticlePreview } from '@/types'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'Archivo de análisis',
  description: 'Todos los análisis de atletismo de lanedata ordenados por fecha. Busca por atleta, prueba o campeonato.',
  alternates: { canonical: `${siteUrl}/archivo/` },
  openGraph: {
    title: 'Archivo de análisis · lanedata',
    description: 'Todo el archivo de análisis del atletismo español, con buscador.',
    url: `${siteUrl}/archivo/`,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default async function ArchivoPage() {
  const supabase = createStaticClient()

  const { data } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image_url, category, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })

  const articles: ArticlePreview[] = data ?? []

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">

        {/* Header */}
        <section className="mb-10">
          <div className="section-label">lanedata · archivo</div>
          <h1 className="section-title text-ink">
            Archivo
          </h1>
          <p className="mt-4 text-sm text-ink/50">
            {articles.length} {articles.length === 1 ? 'análisis publicado' : 'análisis publicados'} · busca y explora todo el archivo
          </p>
        </section>

        {articles.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center border border-ink/[0.14] bg-cream/40 text-center p-12">
            <p className="font-brand text-xl font-bold text-ink/35">Aún no hay análisis publicados</p>
          </div>
        ) : (
          <ArchiveBrowser articles={articles} />
        )}

      </main>
      <Footer />
    </>
  )
}
