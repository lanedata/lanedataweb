'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArticleCard } from './ArticleCard'
import { EVENTS, trackEvent } from '@/lib/telemetry/analytics'
import type { ArticlePreview } from '@/types'

export function ArchiveBrowser({ articles }: { articles: ArticlePreview[] }) {
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  // Se registra la búsqueda cuando la persona deja de teclear, no letra a
  // letra: si no, «katir» serían cinco búsquedas distintas en el panel.
  useEffect(() => {
    if (query.length < 3) return
    const id = window.setTimeout(() => trackEvent(EVENTS.search, query), 900)
    return () => window.clearTimeout(id)
  }, [query])

  const filtered = useMemo(() => {
    if (!query) return articles
    return articles.filter(a =>
      a.title.toLowerCase().includes(query) ||
      (a.excerpt?.toLowerCase().includes(query) ?? false) ||
      (a.category?.toLowerCase().includes(query) ?? false),
    )
  }, [articles, query])

  const byYear = useMemo(() => {
    const map: Record<string, ArticlePreview[]> = {}
    for (const a of filtered) {
      const y = a.published_at ? new Date(a.published_at).getFullYear().toString() : 'Sin fecha'
      ;(map[y] ??= []).push(a)
    }
    return map
  }, [filtered])

  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a))

  return (
    <>
      {/* Search */}
      <div className="relative mb-10">
        <svg
          width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35"
        >
          <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M9 9l3.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar por título, prueba o categoría…"
          aria-label="Buscar en el archivo"
          className="w-full border border-ink/[0.14] bg-cream/60 pl-11 pr-11 py-3 text-sm text-ink placeholder:text-ink/40 focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40 transition-colors"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center text-ink/40 hover:bg-ink/[0.06] hover:text-ink transition-colors"
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="font-brand text-xl font-bold text-ink/30">No encontramos nada</p>
          <p className="mt-2 text-sm text-ink/25">Prueba con otro término — atleta, campeonato o prueba.</p>
        </div>
      ) : query ? (
        /* ── Search results: flat grid ── */
        <>
          <div className="section-label mb-8">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} para &ldquo;{q.trim()}&rdquo;
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(a => <ArticleCard key={a.id} article={a} />)}
          </div>
        </>
      ) : (
        /* ── Full archive grouped by year ── */
        <div className="space-y-16">
          {years.map(year => (
            <section key={year}>
              <div className="flex items-baseline justify-between gap-4 mb-8 border-b border-ink/[0.14] pb-4">
                <span className="font-brand text-3xl font-extrabold tracking-brand text-ink select-none">
                  {year}
                </span>
                <span className="label-mono text-ink/40">
                  {byYear[year].length} análisis
                </span>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {byYear[year].map(a => <ArticleCard key={a.id} article={a} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
