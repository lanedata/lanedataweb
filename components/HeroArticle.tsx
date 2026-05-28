import Image from 'next/image'
import Link from 'next/link'
import { CategoryBadge } from './CategoryBadge'
import { formatDateEs } from '@/lib/utils'
import type { ArticlePreview } from '@/types'

interface Props {
  article: ArticlePreview
}

export function HeroArticle({ article }: Props) {
  const href = `/articulo/${article.slug}`

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-ink">
      {/* Background image */}
      {article.cover_image_url ? (
        <div className="absolute inset-0">
          <Image
            src={article.cover_image_url}
            alt=""
            fill
            className="object-cover opacity-30 transition-opacity duration-500 group-hover:opacity-35"
            sizes="(max-width: 768px) 100vw, 1200px"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/30" />
        </div>
      ) : (
        <div className="absolute inset-0 opacity-[0.04]">
          {/* Abstract data grid pattern */}
          <DataGrid />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex min-h-[420px] flex-col justify-end p-8 sm:min-h-[520px] sm:p-12">
        {/* Top row */}
        <div className="mb-auto flex items-start justify-between">
          <CategoryBadge category={article.category} variant="mint" />
          <span className="label-mono text-cream/40">
            Último análisis
          </span>
        </div>

        {/* Title */}
        <Link href={href} className="mt-8 block">
          <h2 className="font-brand text-3xl font-extrabold tracking-brand text-cream sm:text-4xl md:text-5xl lg:text-[3.25rem] leading-[1.1]">
            {article.title}
          </h2>
        </Link>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="mt-4 max-w-2xl text-base text-cream/60 leading-relaxed sm:text-lg">
            {article.excerpt}
          </p>
        )}

        {/* Meta + CTA */}
        <div className="mt-6 flex flex-wrap items-center gap-6">
          {article.published_at && (
            <time
              dateTime={article.published_at}
              className="label-mono text-cream/40"
            >
              {formatDateEs(article.published_at)}
            </time>
          )}

          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-full bg-mint px-5 py-2.5 font-brand text-sm font-bold tracking-tight text-ink transition-transform hover:-translate-y-px"
          >
            Leer análisis
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
              <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </article>
  )
}

function DataGrid() {
  return (
    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  )
}
