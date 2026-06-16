import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { HeroArticle } from '@/components/HeroArticle'
import { ArticleCard } from '@/components/ArticleCard'
import { createStaticClient } from '@/lib/supabase/static'
import type { Metadata } from 'next'
import Link from 'next/link'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: { absolute: 'lanedata · El atletismo español con datos' },
  description:
    'El atletismo español con datos: análisis, estadísticas, calendario de competiciones 2026 y calculadoras (puntos World Athletics, ritmo, predictor de marcas).',
  alternates: { canonical: '/' },
}

export default async function HomePage() {
  const supabase = createStaticClient()

  const { data: articles } = await supabase
    .from('articles')
    .select('id, title, slug, excerpt, cover_image_url, category, published_at')
    .eq('status', 'published')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(4)

  const featured = articles?.[0] ?? null
  const rest = articles?.slice(1) ?? [] // max 3

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Últimos análisis de lanedata',
    itemListElement: (articles ?? []).map((a, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/articulo/${a.slug}/`,
      name: a.title,
    })),
  }

  return (
    <>
      {(articles?.length ?? 0) > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      )}
      <NavBar />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Featured article ── */}
        {featured ? (
          <HeroArticle article={featured} />
        ) : (
          <EmptyState />
        )}

        {/* ── More articles (max 3) ── */}
        {rest.length > 0 && (
          <section className="mt-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-px flex-1 bg-ink/[0.1]" />
              <span className="label-mono text-ink/40">Más análisis</span>
              <div className="h-px flex-1 bg-ink/[0.1]" />
            </div>

            <div className="article-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-full border border-ink/[0.15] px-5 py-2.5 label-mono text-ink/55 hover:text-ink hover:border-ink/30 transition-colors duration-150"
              >
                Ver todos los análisis
                <svg width="12" height="9" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                  <path d="M1 5h12M8 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
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
