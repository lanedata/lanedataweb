import type { Metadata } from 'next'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { FichajesEnVivo } from '@/components/fichajes/FichajesEnVivo'
import { Tablon } from '@/components/fichajes/Tablon'

// TEMPORAL — Página completa del mercado: el directo y el tablón de atletas y
// clubes. noindex mientras el mercado esté en pruebas; al lanzarlo, quita
// `robots` de aquí y '/mercado' del disallow de app/robots.ts.
export const metadata: Metadata = {
  title: 'Mercado de fichajes',
  description: 'Todos los fichajes del atletismo español en directo, y el tablón donde atletas y clubes se encuentran.',
  robots: { index: false, follow: false },
}

export default function MercadoPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section>
          <div className="section-label">mercado · en vivo</div>
          <h1 className="section-title mb-3">Mercado de fichajes</h1>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/55">
            Todos los movimientos anunciados, con la hora a la que se supo, el club que deja el atleta
            y el que lo ficha. Los marcados como bomba son los que mueven el mercado.
          </p>
          <FichajesEnVivo />
        </section>

        <section id="tablon" className="mt-20 scroll-mt-20">
          <div className="section-label">mercado · tablón</div>
          <h2 className="section-title mb-3">Atletas que buscan club, clubes que buscan atletas</h2>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-ink/55">
            Anúnciate y te encontrarán. Revisamos cada anuncio antes de publicarlo y nunca enseñamos tu
            contacto: si alguien se interesa, os ponemos en contacto nosotros.
          </p>
          <Tablon />
        </section>
      </main>
      <Footer />
    </>
  )
}
