import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { RfeaCalendar } from '@/components/RfeaCalendar'
import { loadCompeticiones } from '@/lib/competiciones-data'
import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

export const metadata: Metadata = {
  title: 'Calendario de competiciones',
  description: 'Calendario del atletismo español actualizado a diario desde la RFEA: próximas competiciones con sus pruebas, inscripción e inscritos.',
  keywords: ['calendario atletismo', 'competiciones atletismo España', 'calendario RFEA', 'inscripciones atletismo', 'próximas competiciones atletismo'],
  alternates: { canonical: `${siteUrl}/calendario/` },
  openGraph: {
    title: 'Calendario de competiciones · lanedata',
    description: 'Próximas competiciones del atletismo español, actualizadas a diario desde la RFEA.',
    url: `${siteUrl}/calendario/`,
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function CalendarioPage() {
  const competiciones = loadCompeticiones()

  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">

        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="label-mono text-ink/40 mb-2">Actualizado a diario · RFEA + federaciones</p>
              <h1 className="font-brand text-4xl sm:text-5xl font-extrabold tracking-brand text-ink leading-none">
                Calendario
              </h1>
              <p className="mt-3 text-sm text-ink/55 max-w-lg leading-relaxed">
                Competiciones del atletismo español —pasadas y por venir— con sus pruebas, inscripción,
                reglamento y resultados. Se actualiza cada día desde la RFEA y las federaciones autonómicas.
                Usa <span className="font-semibold text-ink/70">«Encuentra tu competición»</span> para filtrar por prueba y cercanía.
              </p>
            </div>
          </div>
          <div className="mt-8 h-px bg-ink/[0.1]" />
        </section>

        {competiciones.length > 0 ? (
          <RfeaCalendar competiciones={competiciones} />
        ) : (
          <EmptyState />
        )}

      </main>
      <Footer />
    </>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-ink/[0.1] bg-cream/40 text-center p-12">
      <p className="font-brand text-xl font-bold text-ink/40">Calendario no disponible</p>
      <p className="mt-2 text-sm text-ink/30">El próximo despliegue cargará las competiciones desde la RFEA.</p>
    </div>
  )
}
