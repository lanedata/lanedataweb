'use client'

// Subpágina /test — un duplicado de la web protegido por contraseña para
// experimentar sin tocar la home pública. Incluye la columna "El dato de la
// semana" y LaneGames (el test y el wordle semanales), que aún no salen en la
// web pública. Al ser el sitio estático (GitHub Pages)
// la contraseña se comprueba en cliente: es una barrera para un sandbox, no un
// control de seguridad real. Cambia TEST_PASSWORD para actualizarla.

import { useEffect, useState } from 'react'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { HeroArticle } from '@/components/HeroArticle'
import { ArticleCard } from '@/components/ArticleCard'
import { DatoSemanaColumn } from '@/components/datosemana/DatoSemanaColumn'
import { LaneGames } from '@/components/lanegames/LaneGames'
import { createClient } from '@/lib/supabase/client'
import type { ArticlePreview } from '@/types'

const TEST_PASSWORD = 'lanetest'
const STORAGE_KEY = 'lanedata-test-unlocked'

export default function TestPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(STORAGE_KEY) === '1')
    setChecked(true)
  }, [])

  if (!checked) return <div className="min-h-dvh bg-paper" />
  if (!unlocked) return <Gate onUnlock={() => setUnlocked(true)} />
  return <Sandbox />
}

function Gate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (value === TEST_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, '1')
      onUnlock()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-brand text-3xl font-extrabold tracking-brand text-ink">lanedata</p>
          <p className="mt-1 label-mono text-ink/40">Sandbox · /test</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="pw" className="mb-1.5 block label-mono text-ink/60">Contraseña</label>
            <input
              id="pw"
              type="password"
              autoFocus
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(false) }}
              className="w-full rounded-xl border border-ink/[0.15] bg-cream/60 px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:border-ink/30 focus:bg-cream focus:outline-none focus:ring-2 focus:ring-mint/40 transition-colors"
              placeholder="••••••••"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              Contraseña incorrecta.
            </p>
          )}
          <button type="submit" className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-cream transition-opacity hover:opacity-90">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}

function Sandbox() {
  const [articles, setArticles] = useState<ArticlePreview[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('articles')
      .select('id, title, slug, excerpt, cover_image_url, category, published_at')
      .eq('status', 'published')
      .lte('published_at', new Date().toISOString())
      .order('published_at', { ascending: false })
      .limit(4)
      .then(({ data }) => setArticles((data as ArticlePreview[]) ?? []))
  }, [])

  const featured = articles[0] ?? null
  const rest = articles.slice(1)

  return (
    <>
      <NavBar />

      {/* Aviso de sandbox */}
      <div className="border-b border-ink/[0.14] bg-mint/20">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-ink" aria-hidden="true" />
          <p className="label-mono text-ink/70">Sandbox /test · zona de pruebas, no es la web pública</p>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Featured article (mantiene el protagonismo) ── */}
        <section>
          <div className="section-label">01 · último análisis</div>
          <div className="mt-6">
            {featured ? <HeroArticle article={featured} /> : <EmptyState />}
          </div>
        </section>

        {/* ── El dato de la semana (columna recurrente, secundaria) ── */}
        <section className="mt-20">
          <div className="section-label">02 · el dato de la semana</div>
          <div className="mt-6">
            <DatoSemanaColumn />
          </div>
        </section>

        {/* ── LaneGames: test y wordle semanales (todavía sólo en /test) ── */}
        <section className="mt-20">
          <div className="section-label">03 · lanegames</div>
          <h2 className="section-title mb-8">Los juegos de la semana</h2>
          <LaneGames navegable />
        </section>

        {/* ── More articles ── */}
        {rest.length > 0 && (
          <section className="mt-20">
            <div className="section-label">04 · más análisis</div>
            <h2 className="section-title mb-8">El resto del archivo reciente</h2>
            <div className="article-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
    <div className="flex min-h-[240px] flex-col items-center justify-center border border-ink/[0.14] bg-cream/40 text-center p-12">
      <p className="label-mono text-ink/40">Sin artículos publicados todavía</p>
    </div>
  )
}
