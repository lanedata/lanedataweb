import type { Metadata } from 'next'
import Link from 'next/link'
import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { CookiePrefsButton } from '@/components/legal/CookiePrefsButton'
import { DOCUMENTOS, LEGAL } from '@/lib/legal'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'Información legal',
  description:
    'Aviso legal, política de privacidad, política de cookies y condiciones de uso de lanedata.',
  alternates: { canonical: `${siteUrl}/legal/` },
  robots: { index: true, follow: true },
}

export default function LegalIndexPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <header className="max-w-reading">
          <div className="section-label">lanedata · legal</div>
          <h1 className="section-title text-ink">Información legal</h1>
          <p className="mt-4 text-sm leading-relaxed text-ink/55">
            Todo lo que hay que saber sobre quién publica {LEGAL.marca}, qué se hace con los
            datos y en qué condiciones se usa la web. Escrito para leerse, no para rebotar.
          </p>
          <p className="mt-5 label-mono text-ink/35">
            Última actualización · {LEGAL.actualizado}
          </p>
        </header>

        <div className="mt-12 grid gap-px bg-ink/[0.14] sm:grid-cols-2">
          {DOCUMENTOS.map((d, i) => (
            <Link
              key={d.href}
              href={d.href}
              className="group flex flex-col bg-paper p-7 transition-colors duration-150 hover:bg-cream"
            >
              <span className="label-mono text-ink/30">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="mt-5 font-brand text-2xl font-extrabold tracking-[-0.04em] leading-none text-ink">
                {d.titulo}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/55">{d.resumen}</p>
              <span className="mt-auto flex items-center justify-between gap-2 border-t border-ink/[0.14] pt-4 label-mono text-ink/45 transition-colors group-hover:text-ink">
                Leer
                <svg
                  width="14"
                  height="10"
                  viewBox="0 0 14 10"
                  fill="none"
                  aria-hidden="true"
                  className="text-ink/30 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink/60"
                >
                  <path
                    d="M1 5h12M9 1l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-12 max-w-reading border border-ink/[0.14] bg-cream/40 p-7">
          <h2 className="font-brand text-xl font-extrabold tracking-tight text-ink">
            Tus preferencias de cookies
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink/55">
            Puedes revisar o cambiar en cualquier momento qué se guarda en tu navegador.
            Rechazar no limita nada de la web.
          </p>
          <div className="mt-5">
            <CookiePrefsButton />
          </div>
        </section>

        <p className="mt-10 max-w-reading text-xs leading-relaxed text-ink/40">
          ¿Alguna duda sobre cualquiera de estos documentos? Escribe a{' '}
          <a href={`mailto:${LEGAL.email}`} className="underline underline-offset-2">
            {LEGAL.email}
          </a>
          .
        </p>
      </main>
      <Footer />
    </>
  )
}
