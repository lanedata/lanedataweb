import { NavBar } from '@/components/NavBar'
import { Footer } from '@/components/Footer'
import { CalendarView } from '@/components/CalendarView'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Calendario 2026',
  description: 'Todas las competiciones de atletismo español 2026. Fuente: RFEA.',
}

export default function CalendarioPage() {
  return (
    <>
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">

        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="label-mono text-ink/40 mb-2">Temporada</p>
              <h1 className="font-brand text-4xl sm:text-5xl font-extrabold tracking-brand text-ink leading-none">
                Calendario 2026
              </h1>
              <p className="mt-3 text-sm text-ink/55 max-w-lg leading-relaxed">
                441 competiciones del atletismo español e internacional.
                Las marcadas con{' '}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-0.5 font-brand text-[0.68rem] font-bold text-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-ink/40 inline-block" />
                  Análisis lanedata
                </span>{' '}
                tienen cobertura propia con datos.
              </p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Legend color="bg-[#9FE88D]/30 text-[#0D2A14] font-semibold" label="WA" title="World Athletics" />
              <Legend color="bg-sky-100 text-sky-800 font-semibold" label="EA" title="European Athletics" />
              <Legend color="bg-ink/[0.07] text-ink/50" label="RFEA" title="Real Federación Española" />
            </div>
          </div>
          <div className="mt-8 h-px bg-ink/[0.1]" />
        </section>

        <CalendarView />

      </main>
      <Footer />
    </>
  )
}

function Legend({ color, label, title }: { color: string; label: string; title: string }) {
  return (
    <div className="flex items-center gap-1.5" title={title}>
      <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-mono font-semibold tracking-wider uppercase ${color}`}>
        {label}
      </span>
      <span className="font-mono text-[0.6rem] text-ink/40 hidden sm:block">{title}</span>
    </div>
  )
}
