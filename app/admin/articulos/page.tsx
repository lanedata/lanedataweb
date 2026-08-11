'use client'

import { createClient } from '@/lib/supabase/client'
import { formatDateEs, categoryLabel } from '@/lib/utils'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { DeleteButton } from '@/components/admin/DeleteButton'

interface ArticleRow {
  id: string
  title: string
  slug: string
  category: string | null
  status: string
  published_at: string | null
  created_at: string
}

type Filter = 'todos' | 'published' | 'draft'

export default function ArticulosPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('todos')
  const [q, setQ] = useState('')

  const load = useCallback(() => {
    createClient()
      .from('articles')
      .select('id, title, slug, category, status, published_at, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setArticles(data ?? [])
        setLoading(false)
      })
  }, [])

  useEffect(() => { load() }, [load])

  const published = articles.filter((a) => a.status === 'published').length
  const drafts = articles.filter((a) => a.status === 'draft').length

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return articles.filter((a) => {
      if (filter !== 'todos' && a.status !== filter) return false
      if (!term) return true
      return a.title.toLowerCase().includes(term) || a.slug.toLowerCase().includes(term)
    })
  }, [articles, filter, q])

  const FILTERS: { v: Filter; l: string; n: number }[] = [
    { v: 'todos', l: 'Todos', n: articles.length },
    { v: 'published', l: 'Publicados', n: published },
    { v: 'draft', l: 'Borradores', n: drafts },
  ]

  return (
    <div>
      <div className="section-label">01 · contenido</div>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-brand text-4xl font-extrabold tracking-[-0.04em] leading-none text-ink">
            Artículos
          </h1>
          <p className="mt-3 label-mono text-ink/45">
            {loading ? 'Cargando…' : `${published} publicado${published !== 1 ? 's' : ''} · ${drafts} borrador${drafts !== 1 ? 'es' : ''}`}
          </p>
        </div>
        <Link
          href="/admin/nuevo"
          className="inline-flex items-center gap-2 bg-ink px-6 py-3 label-mono text-mint transition-colors hover:bg-mint hover:text-ink"
        >
          + Nuevo artículo
        </Link>
      </div>

      {/* Filtros */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-ink/[0.14] pb-4">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={`px-3 py-1.5 label-mono transition-colors ${
              filter === f.v
                ? 'bg-ink text-mint'
                : 'border border-ink/[0.14] text-ink/50 hover:border-ink/30 hover:text-ink'
            }`}
          >
            {f.l} · {f.n}
          </button>
        ))}
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar por título o slug…"
          aria-label="Filtrar artículos"
          className="ml-auto w-full sm:w-64 border border-ink/[0.14] bg-cream/60 px-3.5 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40"
        />
      </div>

      {loading && (
        <p className="py-16 text-center label-mono text-ink/30">Cargando…</p>
      )}

      {!loading && shown.length === 0 && (
        <div className="flex flex-col items-center justify-center border border-ink/[0.14] bg-cream/40 py-20 text-center">
          <p className="font-brand text-xl font-bold text-ink/35">
            {articles.length === 0 ? 'Sin artículos todavía' : 'Nada con ese filtro'}
          </p>
          {articles.length === 0 && (
            <p className="mt-2 text-sm text-ink/30">Pulsa «Nuevo artículo» para empezar.</p>
          )}
        </div>
      )}

      {!loading && shown.length > 0 && (
        <div className="border border-ink/[0.14]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink/[0.14] bg-cream/50">
                <th className="px-5 py-3 text-left label-mono text-ink/45">Título</th>
                <th className="hidden px-5 py-3 text-left label-mono text-ink/45 sm:table-cell">Categoría</th>
                <th className="hidden px-5 py-3 text-left label-mono text-ink/45 md:table-cell">Fecha</th>
                <th className="px-5 py-3 text-left label-mono text-ink/45">Estado</th>
                <th className="px-5 py-3 text-right label-mono text-ink/45">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((article, i) => (
                <tr
                  key={article.id}
                  className={`transition-colors hover:bg-cream ${
                    i === shown.length - 1 ? '' : 'border-b border-ink/[0.14]'
                  }`}
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/editar?id=${article.id}`}
                      className="font-medium text-ink hover:text-ink/70 transition-colors line-clamp-2"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-0.5 label-mono text-ink/30">/{article.slug}</p>
                  </td>
                  <td className="hidden px-5 py-4 sm:table-cell">
                    <span className="label-mono text-ink/45">
                      {article.category ? categoryLabel(article.category) : '—'}
                    </span>
                  </td>
                  <td className="hidden px-5 py-4 md:table-cell">
                    <span className="label-mono text-ink/45">
                      {article.published_at ? formatDateEs(article.published_at) : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/articulo/${article.slug}`}
                        target="_blank"
                        className="label-mono text-ink/35 hover:text-ink transition-colors"
                      >
                        Ver
                      </Link>
                      <Link
                        href={`/admin/editar?id=${article.id}`}
                        className="label-mono text-ink/35 hover:text-ink transition-colors"
                      >
                        Editar
                      </Link>
                      <DeleteButton id={article.id} title={article.title} onDeleted={load} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const published = status === 'published'
  return (
    <span
      className={`inline-block px-2.5 py-1 label-mono text-[0.6rem] ${
        published ? 'bg-mint text-ink' : 'border border-ink/[0.2] text-ink/50'
      }`}
    >
      {published ? 'Publicado' : 'Borrador'}
    </span>
  )
}
