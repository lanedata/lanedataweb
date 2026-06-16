import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import { createStaticClient } from '@/lib/supabase/static'
import { formatDateEs } from '@/lib/utils'
import type { Metadata } from 'next'
import type { ArticlePreview } from '@/types'

export const metadata: Metadata = {
  title: 'Archivo',
  description: 'Todos los análisis de lanedata ordenados por fecha.',
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

  // Group by year
  const byYear = articles.reduce<Record<string, ArticlePreview[]>>((acc, a) => {
    const year = a.published_at ? new Date(a.published_at).getFullYear().toString() : 'Sin fecha'
    if (!acc[year]) acc[year] = []
    acc[year].push(a)
    return acc
  }, {})

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">

        {/* Header */}
        <section className="mb-12">
          <p className="label-mono text-ink/40 mb-2">lanedata</p>
          <h1 className="font-brand text-4xl sm:text-5xl font-extrabold tracking-brand text-ink leading-none">
            Archivo
          </h1>
          <p className="mt-3 text-sm text-ink/50">
            {articles.length} {articles.length === 1 ? 'análisis publicado' : 'análisis publicados'}
          </p>
          <div className="mt-8 h-px bg-ink/[0.1]" />
        </section>

        {articles.length === 0 ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-ink/[0.1] bg-cream/40 text-center p-12">
            <p className="font-brand text-xl font-bold text-ink/35">Aún no hay análisis publicados</p>
          </div>
        ) : (
          <div className="space-y-16">
            {years.map(year => (
              <section key={year}>
                {/* Year marker */}
                <div className="flex items-center gap-4 mb-8">
                  <span className="font-brand text-3xl font-extrabold tracking-brand text-ink/15 select-none">
                    {year}
                  </span>
                  <div className="h-px flex-1 bg-ink/[0.07]" />
                  <span className="label-mono text-ink/30">
                    {byYear[year].length} {byYear[year].length === 1 ? 'análisis' : 'análisis'}
                  </span>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {byYear[year].map(article => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

      </main>
      <Footer />
    </>
  )
}
