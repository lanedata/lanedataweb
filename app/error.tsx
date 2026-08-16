'use client'

// Red de seguridad de React: si un componente revienta al pintar, en vez de
// una pantalla en blanco el visitante ve esto y el fallo queda registrado.

import Link from 'next/link'
import { useEffect } from 'react'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { logError } from '@/lib/telemetry/errors'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError({
      error,
      source: 'react',
      action: 'pintando la página',
      context: error.digest ? { digest: error.digest } : undefined,
    })
  }, [error])

  return (
    <>
      <NavBar />
      <main className="mx-auto flex max-w-6xl flex-col items-center justify-center px-4 py-32 text-center sm:px-6">
        <p className="font-brand text-8xl font-extrabold tracking-brand text-ink/10 leading-none select-none">
          !
        </p>
        <h1 className="mt-4 font-brand text-2xl font-bold tracking-tight text-ink">
          Algo se ha roto por aquí
        </h1>
        <p className="mt-2 max-w-sm text-sm text-ink/45">
          El fallo ya nos ha llegado y lo estamos mirando. Prueba a recargar; si
          sigue igual, vuelve a la portada.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-ink px-6 py-3 font-brand text-sm font-bold tracking-tight text-cream transition-colors duration-150 hover:bg-mint hover:text-ink"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-ink/20 px-6 py-3 font-brand text-sm font-bold tracking-tight text-ink transition-colors duration-150 hover:border-ink hover:bg-cream"
          >
            Volver al inicio
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 font-mono text-[0.625rem] tracking-[0.18em] uppercase text-ink/25">
            ref {error.digest}
          </p>
        )}
      </main>
      <Footer />
    </>
  )
}
