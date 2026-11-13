'use client'

// Subpágina /test — un duplicado de la web para experimentar sin tocar la home
// pública. Incluye la columna "El dato de la semana" y el mercado de fichajes.
//
// Se entra con Google y solo si el correo está en la lista blanca (`admins` o
// `acceso_test`, ver supabase/roles-schema.sql); lo decide Postgres con
// `puede_ver_test()`. Sin contraseñas. Al ser el sitio estático, esto decide a
// quién se le enseña la página: lo que pinta son datos que ya son públicos.

import { useEffect, useState } from 'react'
import { BotonGoogle } from '@/components/fichajes/PanelColaborador'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { HeroArticle } from '@/components/HeroArticle'
import { ArticleCard } from '@/components/ArticleCard'
import { DatoSemanaColumn } from '@/components/datosemana/DatoSemanaColumn'
import { FichajesEnVivo } from '@/components/fichajes/FichajesEnVivo'
import { Tablon } from '@/components/fichajes/Tablon'
import { createClient } from '@/lib/supabase/client'
import type { ArticlePreview } from '@/types'

type Acceso = 'cargando' | 'fuera' | 'denegado' | 'dentro'

export default function TestPage() {
  const [acceso, setAcceso] = useState<Acceso>('cargando')
  const [correo, setCorreo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [abriendo, setAbriendo] = useState(false)

  useEffect(() => {
    // Si Google falla (o el correo no está en ninguna lista), Supabase vuelve con el error en la URL.
    const p = new URLSearchParams(window.location.hash.slice(1) || window.location.search)
    const fallo = p.get('error_description') ?? p.get('error')
    if (fallo) {
      setError(fallo.replace(/\+/g, ' '))
      history.replaceState(null, '', window.location.pathname)
    }

    const supabase = createClient()
    let vivo = true
    async function comprobar(hay: boolean, email: string | null) {
      if (!vivo) return
      setCorreo(email)
      if (!hay) { setAcceso('fuera'); return }
      const { data, error: err } = await supabase.rpc('puede_ver_test')
      if (vivo) setAcceso(!err && data === true ? 'dentro' : 'denegado')
    }
    supabase.auth.getSession().then(({ data: { session } }) => comprobar(!!session, session?.user.email ?? null))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evento, session) => {
      // Fuera del callback: supabase-js no deja llamar a la API desde dentro.
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') {
        setTimeout(() => comprobar(!!session, session?.user.email ?? null), 0)
      }
    })
    return () => { vivo = false; subscription.unsubscribe() }
  }, [])

  async function conGoogle() {
    setError(null); setAbriendo(true)
    const { error: err } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/test/`, queryParams: { prompt: 'select_account' } },
    })
    if (err) { setError(err.message); setAbriendo(false) }
  }

  if (acceso === 'cargando') return <div className="min-h-dvh bg-paper" />
  if (acceso === 'dentro') return <Sandbox />

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <p className="font-brand text-3xl font-extrabold tracking-brand text-ink">lanedata</p>
          <p className="mt-1 label-mono text-ink/40">Sandbox · /test</p>
        </div>
        {acceso === 'denegado' ? (
          <div className="mt-7 text-center">
            <p className="border border-ink/[0.14] bg-cream/60 px-4 py-3 text-sm leading-relaxed text-ink/75">
              <strong className="font-semibold text-ink">{correo ?? 'Esta cuenta'}</strong> no tiene acceso a la zona de pruebas.
            </p>
            <button type="button" onClick={() => createClient().auth.signOut()}
              className="mt-4 border border-ink/25 px-4 py-2 label-mono text-ink/65 transition-colors hover:border-ink hover:text-ink">
              entrar con otra cuenta
            </button>
          </div>
        ) : (
          <>
            <BotonGoogle onClick={conGoogle} ocupado={abriendo} />
            <p className="mt-5 text-center text-[0.78rem] leading-relaxed text-ink/45">
              Solo entran los correos con acceso a la zona de pruebas.
            </p>
          </>
        )}
        {error && (
          <p className="mt-4 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
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

        {/* ── TEMPORAL: mercado de fichajes en vivo ──
            Sección de temporada: cuando el mercado se cierre, se borra este
            bloque (y el SQL de supabase/fichajes-schema.sql limpia los datos). */}
        <section className="mt-20">
          <div className="section-label">03 · mercado · en vivo</div>
          <h2 className="section-title mb-3">Últimos fichajes</h2>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/55">
            Todos los fichajes anunciados, con la hora a la que se informó, el club que
            deja el atleta y el que lo ficha. Cuando se sabe que se va pero no a dónde,
            el destino queda como una incógnita.
          </p>
          <FichajesEnVivo />
        </section>

        <section id="tablon" className="mt-20">
          <div className="section-label">04 · mercado · tablón</div>
          <h2 className="section-title mb-8">Atletas que buscan club, clubes que buscan atletas</h2>
          <Tablon />
        </section>

        {/* LaneGames (test y wordle semanales) ocultos por ahora. El código sigue en
            components/lanegames: para recuperarlos, vuelve a poner aquí <LaneGames navegable />. */}

        {/* ── More articles ── */}
        {rest.length > 0 && (
          <section className="mt-20">
            <div className="section-label">05 · más análisis</div>
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
