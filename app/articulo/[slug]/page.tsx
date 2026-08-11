import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { ArticleContent } from '@/components/ArticleContent'
import { CategoryBadge } from '@/components/CategoryBadge'
import { TableOfContents } from '@/components/TableOfContents'
import { ShareButton } from '@/components/ShareButton'
import { createStaticClient } from '@/lib/supabase/static'
import { formatDateEs, isoDate, readingTime, truncate } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lanedata.es'

interface Props {
  params: Promise<{ slug: string }>
}

// A standalone HTML document starts with <!DOCTYPE or <html
function isStandaloneHtml(content: string) {
  const s = content.trimStart().toLowerCase()
  return s.startsWith('<!doctype') || s.startsWith('<html')
}

export async function generateStaticParams() {
  try {
    const supabase = createStaticClient()
    const { data, error } = await supabase
      .from('articles')
      .select('slug')
      .eq('status', 'published')
    if (error || !data || data.length === 0) return [{ slug: '__empty' }]
    return data.map((a) => ({ slug: a.slug }))
  } catch {
    return [{ slug: '__empty' }]
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  if (slug === '__empty') return { title: 'lanedata' }
  const supabase = createStaticClient()

  const { data: article } = await supabase
    .from('articles')
    .select('title, excerpt, cover_image_url, published_at')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!article) return { title: 'Artículo no encontrado' }

  const description = article.excerpt
    ? truncate(article.excerpt, 160)
    : 'Análisis de atletismo español en lanedata.'

  const ogImage = article.cover_image_url || `${siteUrl}/og-image.png`

  return {
    title: article.title,
    description,
    alternates: { canonical: `${siteUrl}/articulo/${slug}/` },
    openGraph: {
      title: article.title,
      description,
      url: `${siteUrl}/articulo/${slug}`,
      images: [{ url: ogImage }],
      type: 'article',
      publishedTime: article.published_at ?? undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description,
      images: [ogImage],
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  if (slug === '__empty') notFound()
  const supabase = createStaticClient()

  const { data: article } = await supabase
    .from('articles')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!article) notFound()

  // ── Standalone HTML document → fullscreen iframe via srcdoc ──────────────
  // srcdoc embeds the HTML directly — no cross-origin issues, no content-type
  // problems (unlike Supabase Storage which forces text/plain for .html files).
  if (isStandaloneHtml(article.html_content)) {
    return (
      <iframe
        srcDoc={article.html_content}
        title={article.title}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
        allowFullScreen
      />
    )
  }

  // ── Inline HTML fragment → plantilla lanedata normal ──────────────────────
  const minutes = readingTime(article.html_content)
  const articleUrl = `${siteUrl}/articulo/${slug}`
  const description = article.excerpt ? truncate(article.excerpt, 160) : 'Análisis de atletismo español en lanedata.'

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description,
    image: [article.cover_image_url || `${siteUrl}/og-image.png`],
    datePublished: article.published_at ?? undefined,
    dateModified: article.updated_at ?? article.published_at ?? undefined,
    inLanguage: 'es',
    mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    author: { '@type': 'Organization', name: 'lanedata', url: siteUrl },
    publisher: {
      '@type': 'Organization',
      name: 'lanedata',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/favicon-512.png` },
    },
    articleSection: article.category ?? undefined,
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: `${siteUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Archivo', item: `${siteUrl}/archivo/` },
      { '@type': 'ListItem', position: 3, name: article.title, item: articleUrl },
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <NavBar />

      <main>
        <header className="mx-auto max-w-wide px-4 pt-10 pb-8 sm:px-6 sm:pt-14">
          <nav aria-label="Ruta" className="mb-6 flex items-center gap-2 label-mono text-ink/35">
            <Link href="/" className="hover:text-ink/60 transition-colors">lanedata</Link>
            <span>·</span>
            <span className="text-ink/60 truncate max-w-xs">{article.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-3 mb-5">
            <CategoryBadge category={article.category} />
            <span className="label-mono text-ink/35">{minutes} min de lectura</span>
          </div>

          <h1 className="font-brand text-3xl font-extrabold tracking-[-0.045em] text-ink leading-[1.02] sm:text-4xl md:text-5xl">
            {article.title}
          </h1>

          {article.excerpt && (
            <p className="mt-4 max-w-2xl text-lg text-ink/65 leading-relaxed">
              {article.excerpt}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 border-t border-ink/[0.14] pt-5">
            {article.published_at && (
              <time dateTime={isoDate(article.published_at)} className="label-mono text-ink/45">
                {formatDateEs(article.published_at)}
              </time>
            )}
            <div className="ml-auto">
              <ShareButton title={article.title} url={articleUrl} />
            </div>
          </div>
        </header>

        {article.cover_image_url && (
          <div className="mx-auto max-w-6xl px-4 sm:px-6 mb-10">
            <div className="relative aspect-[21/9] w-full overflow-hidden bg-ink">
              <Image src={article.cover_image_url} alt={article.title} fill
                className="object-cover" priority unoptimized
                sizes="(max-width: 1200px) 100vw, 1200px" />
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="relative flex gap-16">
            <div className="min-w-0 flex-1">
              <ArticleContent html={article.html_content} />
            </div>
            <aside className="hidden w-56 shrink-0 xl:block">
              <TableOfContents html={article.html_content} />
            </aside>
          </div>
        </div>

        <div className="border-t border-ink/[0.14] bg-cream/40">
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 flex items-center justify-between">
            <Link href="/"
              className="inline-flex items-center gap-2 label-mono text-ink/50 hover:text-ink transition-colors">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M13 5H1M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Todos los análisis
            </Link>
            <ShareButton title={article.title} url={articleUrl} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
