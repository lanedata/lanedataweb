'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { ArticleCard } from '@/components/ArticleCard'
import { SearchBar } from '@/components/SearchBar'
import type { ArticlePreview } from '@/types'

function SearchResults() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q')?.trim() ?? ''

  const [articles, setArticles] = useState<ArticlePreview[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    if (!query) {
      setArticles([])
      setSearched(false)
      return
    }

    setLoading(true)
    setSearched(true)
    const supabase = createClient()

    supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, category, published_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,html_content.ilike.%${query}%`)
      .order('published_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setArticles(data ?? [])
        setLoading(false)
      })
  }, [query])

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      {/* Header */}
      <section className="py-10 sm:py-14">
        <div className="mb-8">
          <div className="section-label">Archivo completo de análisis de atletismo español</div>
          <h1 className="section-title text-ink">
            Buscar
          </h1>
        </div>
        <SearchBar defaultValue={query} autoFocus={!query} />
      </section>

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-16">
          <span className="label-mono text-ink/30">Buscando…</span>
        </div>
      )}

      {!loading && searched && (
        <>
          <div className="mb-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink/[0.14]" />
            <span className="label-mono text-ink/40">
              {articles.length === 0
                ? `Sin resultados para "${query}"`
                : `${articles.length} resultado${articles.length !== 1 ? 's' : ''} para "${query}"`}
            </span>
            <div className="h-px flex-1 bg-ink/[0.14]" />
          </div>

          {articles.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="font-brand text-xl font-bold text-ink/30">No encontramos nada</p>
              <p className="mt-2 text-sm text-ink/25">
                Prueba con otro término — atleta, campeonato o prueba.
              </p>
            </div>
          )}
        </>
      )}

      {!query && !loading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="font-brand text-2xl font-bold text-ink/20 tracking-brand">
            Escribe para buscar
          </p>
        </div>
      )}
    </main>
  )
}

export default function SearchPage() {
  return (
    <>
      <NavBar />
      <Suspense fallback={
        <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6 text-center">
          <span className="label-mono text-ink/30">Cargando…</span>
        </main>
      }>
        <SearchResults />
      </Suspense>
      <Footer />
    </>
  )
}
