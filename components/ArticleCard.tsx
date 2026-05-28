import Image from 'next/image'
import Link from 'next/link'
import { CategoryBadge } from './CategoryBadge'
import { formatDateEs, truncate } from '@/lib/utils'
import type { ArticlePreview } from '@/types'

interface Props {
  article: ArticlePreview
}

export function ArticleCard({ article }: Props) {
  const href = `/articulo/${article.slug}`

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-ink/[0.1] bg-paper transition-shadow hover:shadow-md">
      {/* Cover image */}
      <Link href={href} className="block overflow-hidden" tabIndex={-1} aria-hidden="true">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-cream">
          {article.cover_image_url ? (
            <Image
              src={article.cover_image_url}
              alt=""
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
            />
          ) : (
            <PlaceholderCover />
          )}
        </div>
      </Link>

      {/* Text */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge category={article.category} />
          {article.published_at && (
            <time dateTime={article.published_at} className="label-mono text-ink/40 shrink-0">
              {formatDateEs(article.published_at)}
            </time>
          )}
        </div>

        <Link href={href} className="mt-3 block">
          <h3 className="font-brand text-lg font-bold tracking-tight text-ink leading-snug group-hover:text-ink/80 transition-colors line-clamp-3">
            {article.title}
          </h3>
        </Link>

        {article.excerpt && (
          <p className="mt-2 text-sm text-ink/55 leading-relaxed line-clamp-3">
            {truncate(article.excerpt, 160)}
          </p>
        )}

        <Link
          href={href}
          className="mt-auto pt-4 inline-flex items-center gap-1.5 label-mono text-ink/50 hover:text-ink transition-colors"
          aria-label={`Leer: ${article.title}`}
        >
          Leer
          <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden="true">
            <path d="M1 4.5h10M7.5 1l3.5 3.5L7.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Link>
      </div>
    </article>
  )
}

function PlaceholderCover() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-cream">
      <span className="font-brand text-4xl font-extrabold tracking-brand text-ink/10 select-none">
        ld
      </span>
    </div>
  )
}
