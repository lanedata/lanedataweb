import { RfeaCalendar } from '@/components/RfeaCalendar'
import { loadCompeticiones } from '@/lib/competiciones-data'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendario de competiciones',
  description: 'Calendario de competiciones de atletismo (RFEA).',
  robots: { index: false, follow: false },
}

export default function CalendarAppPage() {
  const competiciones = loadCompeticiones()

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      <section className="mb-10">
        <div className="section-label">Actualizado a diario · RFEA</div>
        <h1 className="section-title text-ink">
          Calendario
        </h1>
        <p className="mt-4 text-sm text-ink/55 max-w-lg leading-relaxed">
          Próximas competiciones del atletismo español con sus pruebas, inscripción y lista de inscritos.
        </p>
      </section>

      {competiciones.length > 0 ? (
        <RfeaCalendar competiciones={competiciones} />
      ) : (
        <div className="flex min-h-[280px] items-center justify-center border border-ink/[0.14] bg-cream/40 text-center p-12">
          <p className="font-brand text-xl font-bold text-ink/40">Calendario no disponible</p>
        </div>
      )}
    </main>
  )
}
