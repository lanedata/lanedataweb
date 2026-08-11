'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import {
  SCORING_EVENTS,
  GROUP_LABEL,
  ENV_LABEL,
  ENV_SHORT,
  calculatePoints,
  parsePerformance,
  performanceForPoints,
  coeffsFor,
  eventLabel,
  eventsFor,
  environmentsFor,
  envChangesScore,
  formatMark,
  type Gender,
  type Environment,
  type ScoringEvent,
  type EventGroup,
} from '@/lib/iaaf-scoring'
import { Segmented, MONO } from './lab/ui'

type Direction = 'toPoints' | 'toMark'

// Pruebas que se cronometran en segundos sueltos (sin minutos).
const SECONDS_ONLY = new Set([
  '50m', '55m', '60m', '100m', '200m', '300m', '400m', '500m',
  '50mH', '55mH', '60mH', 'highH', '400mH',
])

// Al cambiar de entorno o de género, salto natural cuando la prueba no existe.
const SWITCH: Record<string, string> = {
  '100m': '60m', '60m': '100m', '50m': '100m', '55m': '100m',
  'highH': '60mH', '60mH': 'highH', '50mH': 'highH', '55mH': 'highH',
  '400mH': '400m', '10000m': '5000m', '3000mSC': '3000m', '2000mSC': '2000m',
  '500m': '400m', 'DT': 'SP', 'HT': 'SP', 'JT': 'SP',
  'marathon': '5000m', 'roadHM': '5000m',
}

const byId = (id: string) => SCORING_EVENTS.find(e => e.id === id)

/** Devuelve un eventId válido para ese género y entorno, lo más parecido al actual. */
function resolveEvent(id: string, gender: Gender, env: Environment): string {
  const available = eventsFor(gender, env)
  const cur = byId(id)
  if (cur && coeffsFor(cur, gender, env)) return id

  const mapped = cur && SWITCH[cur.id]
  if (mapped && available.some(e => e.id === mapped)) return mapped

  const sameGroup = cur && available.find(e => e.group === cur.group)
  return sameGroup?.id ?? available[0].id
}

export function IaafCalculator() {
  const [gender, setGender] = useState<Gender>('men')
  const [env, setEnv] = useState<Environment>('outdoor')
  const [direction, setDirection] = useState<Direction>('toPoints')
  const [eventId, setEventId] = useState('100m')
  const [input, setInput] = useState('')

  const event = byId(eventId) ?? SCORING_EVENTS[0]
  const coeffs = coeffsFor(event, gender, env)
  const otherEnv: Environment = env === 'outdoor' ? 'indoor' : 'outdoor'
  const otherCoeffs = coeffsFor(event, gender, otherEnv)

  function switchGender(g: Gender) {
    setGender(g)
    setEventId(resolveEvent(eventId, g, env))
  }

  function switchEnv(e: Environment) {
    setEnv(e)
    setEventId(resolveEvent(eventId, gender, e))
  }

  // Marca de referencia (1000 pts) como placeholder: siempre realista.
  const placeholder = useMemo(() => {
    if (direction === 'toMark') return 'p. ej. 1000'
    if (!coeffs) return ''
    const ref = performanceForPoints(coeffs, 1000, event.kind)
    return ref === null ? '' : `p. ej. ${formatMark(ref, event).replace(' m', '').replace(' pts', '')}`
  }, [coeffs, direction, event])

  const hint = useMemo(() => {
    if (direction === 'toMark') return 'Puntos World Athletics'
    if (event.kind === 'field') return 'Distancia en metros'
    if (event.kind === 'score') return 'Puntos de la tabla de combinadas'
    if (SECONDS_ONLY.has(event.id)) return 'Tiempo en segundos'
    return 'Tiempo en minutos:segundos'
  }, [direction, event])

  const result = useMemo(() => {
    if (!coeffs) return null
    if (direction === 'toPoints') {
      const x = parsePerformance(input, event.kind)
      if (x === null) return null
      return {
        kind: 'points' as const,
        raw: x,
        value: calculatePoints(coeffs, x, event.kind),
      }
    }
    const pts = Number(input.trim())
    if (!Number.isFinite(pts) || pts <= 0) return null
    const mark = performanceForPoints(coeffs, pts, event.kind)
    return mark === null ? null : { kind: 'mark' as const, raw: pts, value: mark }
  }, [coeffs, direction, input, event])

  /**
   * El punto clave: una misma marca NO vale lo mismo en aire libre que en pista
   * cubierta. Cuando la prueba existe en los dos entornos con tablas distintas,
   * mostramos qué puntúa esa marca en el otro y su marca equivalente.
   */
  const crossEnv = useMemo(() => {
    if (!result || !coeffs || !otherCoeffs) return null
    if (!envChangesScore(event, gender)) return null

    if (result.kind === 'points') {
      if (result.value <= 0) return null
      const pts = calculatePoints(otherCoeffs, result.raw, event.kind)
      const equiv = performanceForPoints(otherCoeffs, result.value, event.kind)
      if (pts <= 0) return null
      return { points: pts, delta: pts - result.value, equiv }
    }
    // Puntos → marca: la marca que vale esos mismos puntos en el otro entorno.
    const equiv = performanceForPoints(otherCoeffs, result.raw, event.kind)
    return equiv === null ? null : { points: null, delta: null, equiv }
  }, [result, coeffs, otherCoeffs, event, gender])

  // Marcas equivalentes: mismos puntos en otras pruebas del mismo grupo.
  const equivalences = useMemo(() => {
    if (direction !== 'toPoints' || !result || result.kind !== 'points' || result.value <= 0) return []
    return eventsFor(gender, env)
      .filter(e => e.id !== event.id && e.group === event.group)
      .map(e => {
        const c = coeffsFor(e, gender, env)!
        const mark = performanceForPoints(c, result.value, e.kind)
        return mark === null ? null : { event: e, mark }
      })
      .filter((x): x is { event: ScoringEvent; mark: number } => x !== null)
      .slice(0, 5)
  }, [direction, result, event, gender, env])

  const availableEnvs = environmentsFor(event, gender)
  const events = eventsFor(gender, env)
  const hasEquiv = equivalences.length > 0

  return (
    <div className="border border-ink/[0.14] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-4">

        {/* Género · entorno */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Segmented
            options={[{ v: 'men', l: 'Hombres' }, { v: 'women', l: 'Mujeres' }]}
            value={gender}
            onChange={v => switchGender(v as Gender)}
          />
          <Segmented
            options={[
              { v: 'outdoor', l: 'Aire libre' },
              { v: 'indoor', l: 'Pista cubierta' },
            ]}
            value={env}
            onChange={v => switchEnv(v as Environment)}
          />
        </div>

        <Segmented
          options={[{ v: 'toPoints', l: 'Marca → Puntos' }, { v: 'toMark', l: 'Puntos → Marca' }]}
          value={direction}
          onChange={v => { setDirection(v as Direction); setInput('') }}
        />

        {/* Prueba · dato */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <span className={`${MONO} text-ink/40`}>Prueba</span>
            <EventSelect events={events} value={eventId} gender={gender} onChange={setEventId} />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={`${MONO} text-ink/40`}>{hint}</span>
            <input
              type="text"
              inputMode={direction === 'toMark' ? 'numeric' : 'decimal'}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholder}
              className="h-[46px] border border-ink/[0.15] bg-cream/60 px-4 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-ink/30 tabular-nums"
            />
          </label>
        </div>

        {/* Aviso: esta prueba solo se disputa en un entorno */}
        {availableEnvs.length === 1 && (
          <p className="font-mono text-[0.58rem] tracking-wider uppercase text-ink/35">
            {eventLabel(event, gender)} solo tiene tabla de {ENV_LABEL[availableEnvs[0]].toLowerCase()}
          </p>
        )}
      </div>

      {/* Resultado */}
      <div className="border-t border-ink/[0.14] bg-ink px-5 sm:px-7 py-6">
        {result ? (
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-brand text-5xl sm:text-6xl font-extrabold tracking-brand text-mint leading-none tabular-nums">
              {result.kind === 'points' ? result.value : formatMark(result.value, event)}
            </span>
            <span className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-cream/50">
              {result.kind === 'points'
                ? <>puntos<br />World Athletics</>
                : <>marca para<br />{input || '—'} pts</>}
            </span>
            <span className="ml-auto border border-cream/15 bg-cream/[0.06] px-3 py-1 font-mono text-[0.55rem] tracking-widest uppercase text-cream/55">
              {eventLabel(event, gender)} · {ENV_SHORT[env]}
            </span>
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">
            {input
              ? 'Formato no válido. Revisa el dato introducido.'
              : direction === 'toPoints'
                ? 'Introduce una marca para calcular los puntos.'
                : 'Introduce los puntos para calcular la marca.'}
          </p>
        )}
      </div>

      {/* AL ⇄ PC — el mismo tiempo no vale lo mismo bajo techo */}
      {crossEnv && (
        <div className="border-t border-ink/[0.14] bg-mint/[0.09] px-5 sm:px-7 py-4">
          <p className={`${MONO} text-ink/45 mb-2.5`}>
            Equivalencia {ENV_SHORT[env]} → {ENV_SHORT[otherEnv]}
          </p>
          <div className="flex flex-wrap items-center gap-x-7 gap-y-2.5">
            {crossEnv.points !== null && (
              <span className="text-sm text-ink/70">
                La misma marca en {ENV_LABEL[otherEnv].toLowerCase()} vale{' '}
                <strong className="font-semibold text-ink tabular-nums">{crossEnv.points} pts</strong>{' '}
                <span className={`font-mono text-[0.68rem] ${crossEnv.delta! >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  ({crossEnv.delta! >= 0 ? '+' : '−'}{Math.abs(crossEnv.delta!)})
                </span>
              </span>
            )}
            {crossEnv.equiv !== null && (
              <span className="text-sm text-ink/70">
                Marca equivalente en {ENV_SHORT[otherEnv]}:{' '}
                <strong className="font-semibold text-ink tabular-nums">{formatMark(crossEnv.equiv, event)}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Marcas equivalentes */}
      {hasEquiv && (
        <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-5">
          <p className={`${MONO} text-ink/40 mb-3`}>
            Marcas equivalentes · {result && result.kind === 'points' ? result.value : 0} pts · {ENV_SHORT[env]}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {equivalences.map(({ event: e, mark }) => (
              <div key={e.id} className="border border-ink/[0.14] bg-cream/40 px-3 py-2.5">
                <p className="font-mono text-[0.56rem] tracking-wider text-ink/40 uppercase truncate">{eventLabel(e, gender)}</p>
                <p className="text-sm font-semibold text-ink tabular-nums mt-0.5">{formatMark(mark, e)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Selector de prueba con buscador ─────────────────────────────────────────
function EventSelect({
  events, value, gender, onChange,
}: {
  events: ScoringEvent[]
  value: string
  gender: Gender
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  useEffect(() => {
    if (open) searchRef.current?.focus()
    else setQuery('')
  }, [open])

  const current = events.find(e => e.id === value)

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const matched = q
      ? events.filter(e => eventLabel(e, gender).toLowerCase().includes(q))
      : events
    const map = new Map<EventGroup, ScoringEvent[]>()
    for (const e of matched) {
      const list = map.get(e.group)
      if (list) list.push(e)
      else map.set(e.group, [e])
    }
    return [...map.entries()]
  }, [events, gender, query])

  function pick(id: string) {
    onChange(id)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-[46px] w-full items-center justify-between border bg-cream/60 px-4 text-sm text-ink transition-colors ${
          open ? 'border-ink/30 ring-2 ring-mint/40' : 'border-ink/[0.15] hover:border-ink/25'
        }`}
      >
        <span className="font-medium truncate">
          {current ? eventLabel(current, gender) : 'Selecciona prueba'}
        </span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true"
          className={`shrink-0 text-ink/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="dropdown-enter absolute z-40 mt-2 w-full border border-ink/[0.14] bg-paper"
        >
          <div className="border-b border-ink/[0.14] p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar prueba…"
              className="h-9 w-full border border-ink/[0.14] bg-cream/50 px-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40"
            />
          </div>
          <div className="max-h-64 overflow-auto p-1.5">
            {groups.length === 0 ? (
              <p className="px-3 py-4 text-sm text-ink/40">Sin resultados</p>
            ) : (
              groups.map(([g, items]) => (
                <div key={g} className="mb-1 last:mb-0">
                  <p className="px-3 pt-2 pb-1 font-mono text-[0.55rem] tracking-[0.2em] uppercase text-ink/35">
                    {GROUP_LABEL[g]}
                  </p>
                  {items.map(e => {
                    const active = e.id === value
                    return (
                      <button
                        key={e.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => pick(e.id)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                          active ? 'bg-mint/20 text-ink font-semibold' : 'text-ink/70 hover:bg-ink/[0.04] hover:text-ink'
                        }`}
                      >
                        {eventLabel(e, gender)}
                        {active && (
                          <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true" className="text-ink">
                            <path d="M1 5l3.5 3.5L12 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
