import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import { SearchBar } from '@/components/SearchBar'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export function generateMetadata(): Metadata {
  return { title: 'Buscar' }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let articles: {
    id: string; title: string; slug: string; excerpt: string | null;
    cover_image_url: string | null; category: string | null; published_at: string | null;
  }[] = []

  if (query) {
    const supabase = await createClient()

    // Full-text search on title + excerpt via Postgres FTS,
    // plus fallback ILIKE for partial matches.
    const { data } = await supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, category, published_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .or(
        `title.ilike.%${query}%,excerpt.ilike.%${query}%,html_content.ilike.%${query}%`
      )
      .order('published_at', { ascending: false })
      .limit(30)

    articles = data ?? []
  }

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {/* Header */}
        <section className="py-10 sm:py-14">
          <div className="flex flex-col gap-2 mb-8">
            <h1 className="font-brand text-4xl font-extrabold tracking-brand text-ink">
              Buscar
            </h1>
            <p className="label-mono text-ink/40">
              Archivo completo de análisis de atletismo español
            </p>
          </div>

          <SearchBar defaultValue={query} autoFocus={!query} />
        </section>

        {/* Results */}
        {query && (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-ink/[0.1]" />
              <span className="label-mono text-ink/40">
                {articles.length === 0
                  ? `Sin resultados para "${query}"`
                  : `${articles.length} resultado${articles.length !== 1 ? 's' : ''} para "${query}"`}
              </span>
              <div className="h-px flex-1 bg-ink/[0.1]" />
            </div>

            {articles.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="font-brand text-xl font-bold text-ink/30">
                  No encontramos nada
                </p>
                <p className="mt-2 text-sm text-ink/25">
                  Prueba con otro término — atleta, campeonato o prueba.
                </p>
              </div>
            )}
          </>
        )}

        {!query && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="font-brand text-2xl font-bold text-ink/20 tracking-brand">
              Escribe para buscar
            </p>
          </div>
        )}
      </main>

      <Footer />
    </>
  )
}

export const revalidate = 60
