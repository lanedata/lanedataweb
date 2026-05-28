import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { HeroArticle } from '@/components/HeroArticle'
import { ArticleCard } from '@/components/ArticleCard'
import { SearchBar } from '@/components/SearchBar'
import { createStaticClient } from '@/lib/supabase/static'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'lanedata — El atletismo español con datos',
}

export default async function HomePage() {
  const supabase = createStaticClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image_url, category, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(16)

  const featured = articles?.[0] ?? null
  const rest = articles?.slice(1) ?? []

  return (
    <>
      <NavBar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">

        {/* ── Brand header ── */}
        <section className="py-12 sm:py-16">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-5">
              <svg
                viewBox="0 0 200 200"
                aria-label="lanedata"
                className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
              >
                <circle cx="100" cy="100" r="100" fill="#9FE88D" />
                <ellipse cx="74" cy="100" rx="14" ry="22" fill="#0D2A14" />
                <ellipse cx="126" cy="100" rx="14" ry="22" fill="#0D2A14" />
                <circle cx="78" cy="92" r="4" fill="#9FE88D" />
                <circle cx="130" cy="92" r="4" fill="#9FE88D" />
              </svg>
              <div>
                <h1 className="font-brand text-5xl font-extrabold tracking-brand text-ink sm:text-6xl md:text-7xl leading-none">
                  lanedata
                </h1>
                <p className="mt-2 label-mono text-ink/50">
                  El atletismo español con datos
                </p>
              </div>
            </div>

            <div className="w-full max-w-sm">
              <SearchBar />
            </div>
          </div>

          <div className="mt-8 h-px bg-ink/[0.1]" />
        </section>

        {/* ── Featured article ── */}
        {featured ? (
          <HeroArticle article={featured} />
        ) : (
          <EmptyState />
        )}

        {/* ── More articles ── */}
        {rest.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-ink/[0.1]" />
              <span className="label-mono text-ink/40">Más análisis</span>
              <div className="h-px flex-1 bg-ink/[0.1]" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

      </main>

      <Footer />
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-ink/[0.1] bg-cream/40 text-center p-12">
      <svg viewBox="0 0 200 200" className="w-16 h-16 mb-6 opacity-20" aria-hidden="true">
        <circle cx="100" cy="100" r="100" fill="#9FE88D" />
        <ellipse cx="74" cy="100" rx="14" ry="22" fill="#0D2A14" />
        <ellipse cx="126" cy="100" rx="14" ry="22" fill="#0D2A14" />
        <circle cx="78" cy="92" r="4" fill="#9FE88D" />
        <circle cx="130" cy="92" r="4" fill="#9FE88D" />
      </svg>
      <p className="font-brand text-xl font-bold text-ink/40">Aún no hay análisis publicados</p>
      <p className="mt-2 text-sm text-ink/30">
        Accede al{' '}
        <Link href="/admin" className="underline hover:text-ink/50">
          panel de administración
        </Link>{' '}
        para publicar el primero.
      </p>
    </div>
  )
}
