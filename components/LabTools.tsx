'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IaafCalculator } from './IaafCalculator'
import { PaceCalculator } from './PaceCalculator'
import { PredictorCalculator } from './PredictorCalculator'
import { CombinedEventsCalculator } from './CombinedEventsCalculator'
import { WindCalculator } from './WindCalculator'
import { RelayCalculator } from './RelayCalculator'
import { CategoryCalculator } from './CategoryCalculator'

// ── Icons ──
const svg = (children: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const IconPoints = svg(<path d="M7 8H5a1 1 0 0 0-1 1v9M7 8l4-4M7 8v10M17 16h2a1 1 0 0 0 1-1V6M17 16l-4 4M17 16V6" />)
const IconPace = svg(<><circle cx="12" cy="13" r="8" /><path d="M12 13V9M9 2h6" /></>)
const IconPredictor = svg(<><path d="M3 17l5-5 3.5 3.5L21 6" /><path d="M15 6h6v6" /></>)
const IconCombined = svg(<>
  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
  <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
</>)
const IconWind = svg(<path d="M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h9" />)
const IconRelay = svg(<><path d="M5 19L19 5" /><circle cx="5" cy="19" r="2.4" /><circle cx="19" cy="5" r="2.4" /></>)
const IconCategory = svg(<>
  <rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M3 10h18M8 3v4M16 3v4" />
</>)

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
    long: 'Convierte cualquier marca a puntos World Athletics y al revés, con la tabla que toca en cada caso: aire libre y pista cubierta puntúan distinto. Incluye la equivalencia AL ⇄ PC y marcas equivalentes en pruebas de la misma familia.',
    badge: 'AL · PC 2025',
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
    id: 'predictor',
    name: 'Predictor',
    short: 'Marcas equivalentes y VDOT',
    long: 'A partir de una marca reciente estima tus tiempos en el resto de distancias con los modelos de Riegel y Daniels (VDOT), y te da los ritmos de entrenamiento correspondientes.',
    badge: 'VDOT',
    icon: IconPredictor,
    render: () => <PredictorCalculator />,
  },
  {
    id: 'combinadas',
    name: 'Combinadas',
    short: 'Decatlón, heptatlón y PC',
    long: 'Suma la puntuación de las cuatro combinadas con las fórmulas oficiales de World Athletics: decatlón y heptatlón al aire libre, heptatlón y pentatlón en pista cubierta. Además traduce el total a puntos World Athletics.',
    badge: 'AL · PC',
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
  {
    id: 'categorias',
    name: 'Categorías',
    short: 'Tu categoría RFEA por edad',
    long: 'Dice en qué categoría RFEA compites cada temporada según tu año de nacimiento (Sub-8 a absoluta) y en qué grupo máster entras, que ese sí depende del día exacto de tu cumpleaños.',
    badge: 'RFEA',
    icon: IconCategory,
    render: () => <CategoryCalculator />,
  },
]

const DEFAULT_TOOL = TOOLS[0].id

export function LabTools() {
  const [active, setActive] = useState(DEFAULT_TOOL)
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])

  // Cada herramienta es enlazable: /lanelab#predictor
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace('#', '')
      if (TOOLS.some(t => t.id === id)) setActive(id)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  const select = useCallback((id: string) => {
    setActive(id)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', id === DEFAULT_TOOL ? window.location.pathname : `#${id}`)
    }
  }, [])

  // Flechas para moverse entre pestañas, como manda el patrón ARIA.
  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const keys: Record<string, number> = {
      ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1,
    }
    let next: number | null = null
    if (e.key in keys) next = (index + keys[e.key] + TOOLS.length) % TOOLS.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TOOLS.length - 1
    if (next === null) return
    e.preventDefault()
    select(TOOLS[next].id)
    tabsRef.current[next]?.focus()
  }

  return (
    <div className="lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-8 lg:items-start">

      {/* Selector — carrusel en móvil, lista lateral fija en escritorio */}
      <div
        role="tablist"
        aria-label="Herramientas de LaneLab"
        className="
          -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 mb-6 lg:mb-0
          flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-none
          lg:flex-col lg:gap-1.5 lg:overflow-visible lg:sticky lg:top-24
        "
      >
        {TOOLS.map((t, i) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              ref={el => { tabsRef.current[i] = el }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={t.id}
              tabIndex={on ? 0 : -1}
              onClick={() => select(t.id)}
              onKeyDown={e => onKeyDown(e, i)}
              className={`
                group shrink-0 snap-start text-left rounded-2xl border
                px-3.5 py-3 lg:w-full lg:px-3.5 lg:py-2.5
                transition-[background-color,border-color,box-shadow,transform] duration-200
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint/60
                ${on
                  ? 'border-ink bg-ink shadow-[0_6px_20px_rgba(13,42,20,0.16)]'
                  : 'border-ink/[0.1] bg-paper hover:border-ink/25 hover:bg-cream/50 lg:hover:translate-x-0.5'}
              `}
            >
              <span className="flex items-center gap-2.5">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  on ? 'bg-mint text-ink' : 'bg-mint/20 text-ink/70 group-hover:bg-mint/35'
                }`}>
                  {t.icon}
                </span>
                <span className="min-w-0">
                  <span className={`block font-brand text-[0.92rem] font-extrabold tracking-tight leading-tight ${on ? 'text-cream' : 'text-ink'}`}>
                    {t.name}
                  </span>
                  <span className={`hidden lg:block font-mono text-[0.52rem] tracking-wider uppercase leading-tight mt-0.5 truncate ${on ? 'text-cream/50' : 'text-ink/35'}`}>
                    {t.short}
                  </span>
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {/* Panel — todas montadas por SEO, sólo se muestra la activa */}
      <div className="min-w-0">
        {TOOLS.map(t => {
          const on = t.id === active
          return (
            <section
              key={t.id}
              id={t.id}
              role="tabpanel"
              aria-labelledby={`tab-${t.id}`}
              tabIndex={0}
              className={on ? 'panel-enter scroll-mt-24 focus-visible:outline-none' : 'hidden'}
            >
              <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="font-brand text-2xl sm:text-[1.75rem] font-extrabold tracking-brand text-ink leading-none">
                  {t.name}
                </h2>
                {t.badge && (
                  <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 font-mono text-[0.52rem] tracking-[0.18em] uppercase text-ink/50">
                    {t.badge}
                  </span>
                )}
                <a
                  href={`#${t.id}`}
                  onClick={() => select(t.id)}
                  className="ml-auto font-mono text-[0.55rem] tracking-[0.18em] uppercase text-ink/30 hover:text-ink/60 transition-colors"
                >
                  enlace directo
                </a>
              </header>
              <p className="text-sm text-ink/55 mb-5 max-w-2xl leading-relaxed">{t.long}</p>
              {t.render()}
            </section>
          )
        })}
      </div>
    </div>
  )
}
