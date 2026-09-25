import Link from 'next/link'
import type { ReactNode } from 'react'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { DOCUMENTOS, LEGAL } from '@/lib/legal'

/**
 * Marco común de los cuatro documentos legales: cabecera, cuerpo con la
 * tipografía de artículo (reutiliza `.article-body`, ya afinada para prosa
 * larga) y navegación entre documentos al pie.
 */
export function LegalPage({
  titulo,
  entradilla,
  children,
  activo,
}: {
  titulo: string
  entradilla: string
  children: ReactNode
  /** href del documento actual, para no enlazarlo consigo mismo. */
  activo: string
}) {
  const otros = DOCUMENTOS.filter((d) => d.href !== activo)

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-reading">
          <div className="section-label">lanedata · legal</div>
          <h1 className="section-title text-ink">{titulo}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/55">{entradilla}</p>
          <p className="mt-5 label-mono text-ink/35">
            Última actualización · {LEGAL.actualizado}
          </p>
        </header>

        <div className="article-body mt-12 max-w-reading">{children}</div>

        <nav
          aria-label="Otros documentos legales"
          className="mt-20 max-w-reading border-t border-ink/[0.14] pt-8"
        >
          <p className="label-mono mb-5 text-ink/40">Sigue leyendo</p>
          <ul className="grid gap-px bg-ink/[0.14] sm:grid-cols-3">
            {otros.map((d) => (
              <li key={d.href} className="bg-paper">
                <Link
                  href={d.href}
                  className="flex h-full flex-col p-4 transition-colors duration-150 hover:bg-cream"
                >
                  <span className="font-brand text-base font-extrabold tracking-tight leading-tight text-ink">
                    {d.titulo}
                  </span>
                  <span className="mt-1.5 text-xs leading-relaxed text-ink/50">{d.resumen}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </main>
      <Footer />
    </>
  )
}
