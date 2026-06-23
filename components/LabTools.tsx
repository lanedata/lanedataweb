'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { IaafCalculator } from './IaafCalculator'
import { PaceCalculator } from './PaceCalculator'
import { CombinedEventsCalculator } from './CombinedEventsCalculator'
import { WindCalculator } from './WindCalculator'
import { RelayCalculator } from './RelayCalculator'

// ── Icons ──
const IconPoints = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 8H5a1 1 0 0 0-1 1v9M7 8l4-4M7 8v10M17 16h2a1 1 0 0 0 1-1V6M17 16l-4 4M17 16V6" />
  </svg>
)
const IconPace = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="13" r="8" /><path d="M12 13V9M9 2h6" />
  </svg>
)
const IconCombined = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const IconWind = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h9" />
  </svg>
)
const IconRelay = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 19L19 5" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="5" r="2.4" />
  </svg>
)

interface Tool {
  id: string
  name: string
  short: string
  long: string
  badge?: string
  icon: ReactNode
  render: () => ReactNode
}

const TOOLS: Tool[] = [
  {
    id: 'puntos-iaaf',
    name: 'Puntos IAAF',
    short: 'Marca ⇄ puntos World Athletics',
    long: 'Convierte cualquier marca a puntos World Athletics y al revés, con marcas equivalentes en pruebas de la misma familia.',
    badge: 'Tablas 2025',
    icon: IconPoints,
    render: () => <IaafCalculator />,
  },
  {
    id: 'ritmo',
    name: 'Ritmo',
    short: 'Pace, velocidad y parciales',
    long: 'Calcula tu ritmo por kilómetro y milla, la velocidad y los parciales acumulados a partir de tu tiempo objetivo (o al revés).',
    icon: IconPace,
    render: () => <PaceCalculator />,
  },
  {
    id: 'combinadas',
    name: 'Combinadas',
    short: 'Decatlón y heptatlón',
    long: 'Suma la puntuación del decatlón (hombres) y el heptatlón (mujeres) con las fórmulas oficiales de World Athletics.',
    icon: IconCombined,
    render: () => <CombinedEventsCalculator />,
  },
  {
    id: 'viento',
    name: 'Viento',
    short: 'Marca ajustada por viento',
    long: 'Ajusta tu marca a viento nulo en las pruebas donde se mide el viento: 100, 200, vallas, longitud y triple. El 100 m usa el modelo de Mureika (2001); el resto, una estimación. No es una corrección oficial.',
    badge: 'Mureika',
    icon: IconWind,
    render: () => <WindCalculator />,
  },
  {
    id: 'relevos',
    name: 'Relevos',
    short: 'Estima tu relevo 4 × N',
    long: 'Estima el tiempo de un relevo (4×100, 4×200, 4×400 o mixto) a partir de las marcas individuales y la compenetración del equipo, teniendo en cuenta las salidas lanzadas en los cambios.',
    icon: IconRelay,
    render: () => <RelayCalculator />,
  },
]

export function LabTools() {
  const [active, setActive] = useState('puntos-iaaf')

  return (
    <div>
      {/* Tool chooser */}
      <div role="tablist" aria-label="Herramientas" className="grid gap-2.5 grid-cols-2 lg:grid-cols-5 mb-9">
        {TOOLS.map(t => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setActive(t.id)}
              className={`group text-left rounded-2xl border p-4 transition-[transform,box-shadow,background-color,border-color] duration-200 ${
                on
                  ? 'border-ink bg-ink shadow-[0_8px_24px_rgba(13,42,20,0.18)]'
                  : 'border-ink/[0.1] bg-paper hover:-translate-y-0.5 hover:border-ink/25 hover:shadow-[0_4px_16px_rgba(13,42,20,0.07)]'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                  on ? 'bg-mint text-ink' : 'bg-mint/20 text-ink/70 group-hover:bg-mint/30'
                }`}>
                  {t.icon}
                </span>
                {t.badge && (
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[0.5rem] tracking-widest uppercase ${
                    on ? 'bg-cream/15 text-mint' : 'bg-ink/[0.05] text-ink/45'
                  }`}>
                    {t.badge}
                  </span>
                )}
              </div>
              <p className={`font-brand text-base font-extrabold tracking-tight ${on ? 'text-cream' : 'text-ink'}`}>
                {t.name}
              </p>
              <p className={`mt-0.5 font-mono text-[0.58rem] tracking-wider uppercase leading-relaxed ${on ? 'text-cream/55' : 'text-ink/40'}`}>
                {t.short}
              </p>
            </button>
          )
        })}
      </div>

      {/* Active tool — all rendered for SEO, inactive hidden */}
      {TOOLS.map(t => (
        <section
          key={t.id}
          id={t.id}
          aria-labelledby={`${t.id}-h`}
          className={t.id === active ? 'scroll-mt-20' : 'hidden'}
        >
          <h2 id={`${t.id}-h`} className="sr-only">{t.name}</h2>
          <p className="text-sm text-ink/55 mb-4 max-w-2xl leading-relaxed">{t.long}</p>
          {t.render()}
        </section>
      ))}
    </div>
  )
}
