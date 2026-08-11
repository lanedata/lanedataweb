import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { RfeaCalendar } from '@/components/RfeaCalendar'
import { loadCompeticiones } from '@/lib/competiciones-data'
import type { Metadata } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lanedata.es'

// OCULTO (ago 2026): el calendario deja de ser una sección pública de lanedata.
// La página y todo su código siguen aquí y funcionando —el scraper sigue generando
// competiciones.json a diario, que además alimenta La Previa—, pero no se enlaza
// desde la navegación, no entra en el sitemap y se marca noindex/nofollow. Mismo
// tratamiento que /calendarapp. Para volver a publicarlo: quitar `robots` de aquí,
// devolver el enlace a NAV_LINKS en NavBar.tsx y la entrada a app/sitemap.ts.
export const metadata: Metadata = {
  title: 'Calendario de competiciones',
  description: 'Calendario del atletismo español actualizado a diario desde la RFEA: próximas competiciones con sus pruebas, inscripción y reglamento.',
  robots: { index: false, follow: false },
  alternates: { canonical: `${siteUrl}/calendario/` },
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
              <div className="section-label">Actualizado a diario · RFEA + federaciones</div>
              <h1 className="section-title text-ink">
                Calendario
              </h1>
              <p className="mt-4 text-sm text-ink/55 max-w-lg leading-relaxed">
                Competiciones del atletismo español —pasadas y por venir— con sus pruebas, inscripción,
                reglamento y resultados. Se actualiza cada día desde la RFEA y las federaciones autonómicas.
                Usa <span className="font-semibold text-ink/70">«Encuentra tu competición»</span> para filtrar por prueba y cercanía.
              </p>
            </div>
          </div>
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
    <div className="flex min-h-[280px] flex-col items-center justify-center border border-ink/[0.14] bg-cream/40 text-center p-12">
      <p className="font-brand text-xl font-bold text-ink/40">Calendario no disponible</p>
      <p className="mt-2 text-sm text-ink/30">El próximo despliegue cargará las competiciones desde la RFEA.</p>
    </div>
  )
}
