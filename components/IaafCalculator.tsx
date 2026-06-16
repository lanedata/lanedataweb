'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import {
  SCORING_EVENTS,
  calculatePoints,
  parsePerformance,
  performanceForPoints,
  formatTime,
  genderHasEvent,
  type Gender,
  type ScoringEvent,
} from '@/lib/iaaf-scoring'

type Direction = 'toPoints' | 'toMark'

// Events whose performance is typically under a minute → plain seconds input.
const SPRINT_IDS = new Set(['60m', '100m', '200m', '400m', '60mH', 'highH', '400mH'])

// Each event belongs to one family; equivalences are drawn from the same family.
const FAMILY: Record<string, string> = {
  '60m': 'vel', '100m': 'vel', '200m': 'vel', '400m': 'vel',
  '60mH': 'vel', 'highH': 'vel', '400mH': 'vel',
  '800m': 'fondo', '1500m': 'fondo', 'mile': 'fondo', '3000m': 'fondo',
  '5000m': 'fondo', '10000m': 'fondo', '3000mSC': 'fondo',
  'road5k': 'fondo', 'road10k': 'fondo', 'roadHM': 'fondo', 'marathon': 'fondo',
  'HJ': 'saltos', 'PV': 'saltos', 'LJ': 'saltos', 'TJ': 'saltos',
  'SP': 'lanz', 'DT': 'lanz', 'HT': 'lanz', 'JT': 'lanz',
}

const MONO = 'font-mono text-[0.62rem] tracking-[0.18em] uppercase'

function placeholderFor(e: ScoringEvent, dir: Direction): string {
  if (dir === 'toMark') return 'p. ej. 1000'
  if (e.kind === 'field') return 'p. ej. 7.85'
  if (SPRINT_IDS.has(e.id)) return 'p. ej. 10.45'
  if (e.id === 'marathon') return 'p. ej. 2:08:30'
  if (e.id === 'roadHM') return 'p. ej. 1:02:30'
  return 'p. ej. 3:55.40'
}

function hintFor(e: ScoringEvent, dir: Direction): string {
  if (dir === 'toMark') return 'Puntos World Athletics'
  if (e.kind === 'field') return 'Distancia en metros'
  if (SPRINT_IDS.has(e.id)) return 'Tiempo en segundos'
  return 'Tiempo en minutos:segundos'
}

function formatMark(value: number, e: ScoringEvent): string {
  return e.kind === 'field' ? `${value.toFixed(2)} m` : formatTime(value)
}

export function IaafCalculator() {
  const [gender, setGender] = useState<Gender>('men')
  const [direction, setDirection] = useState<Direction>('toPoints')
  const [eventId, setEventId] = useState('100m')
  const [input, setInput] = useState('')

  const event = useMemo(
    () => SCORING_EVENTS.find(e => e.id === eventId) ?? SCORING_EVENTS[0],
    [eventId],
  )
  const coeffs = gender === 'men' ? event.men : event.women

  function switchGender(g: Gender) {
    setGender(g)
    if (!genderHasEvent(event, g)) {
      const first = SCORING_EVENTS.find(e => genderHasEvent(e, g))
      if (first) setEventId(first.id)
    }
  }

  const result = useMemo(() => {
    if (!coeffs) return null
    if (direction === 'toPoints') {
      const x = parsePerformance(input, event.kind)
      if (x === null) return null
      return { kind: 'points' as const, value: calculatePoints(coeffs, x, event.kind) }
    }
    const pts = Number(input.trim())
    if (!Number.isFinite(pts) || pts <= 0) return null
    const mark = performanceForPoints(coeffs, pts, event.kind)
    return mark === null ? null : { kind: 'mark' as const, value: mark }
  }, [coeffs, direction, input, event])

  // Equivalences: same points, expressed in up to 5 events of the SAME family.
  const equivalences = useMemo(() => {
    if (direction !== 'toPoints' || !result || result.kind !== 'points' || result.value <= 0) return []
    const fam = FAMILY[event.id]
    return SCORING_EVENTS
      .filter(e => e.id !== event.id && FAMILY[e.id] === fam && genderHasEvent(e, gender))
      .map(e => {
        const c = gender === 'men' ? e.men : e.women
        const mark = c ? performanceForPoints(c, result.value, e.kind) : null
        return mark === null ? null : { event: e, mark }
      })
      .filter((x): x is { event: ScoringEvent; mark: number } => x !== null)
      .slice(0, 5)
  }, [direction, result, event.id, gender])

  const events = SCORING_EVENTS.filter(e => genderHasEvent(e, gender))

  const hasEquiv = equivalences.length > 0

  return (
    <div className="rounded-2xl border border-ink/[0.1] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-5 rounded-t-2xl">

        {/* Gender + direction */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Segmented
            options={[{ v: 'men', l: 'Hombres' }, { v: 'women', l: 'Mujeres' }]}
            value={gender}
            onChange={v => switchGender(v as Gender)}
          />
          <Segmented
            options={[{ v: 'toPoints', l: 'Marca → Puntos' }, { v: 'toMark', l: 'Puntos → Marca' }]}
            value={direction}
            onChange={v => { setDirection(v as Direction); setInput('') }}
          />
        </div>

        {/* Event + input */}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-1.5">
            <span className={`${MONO} text-ink/40`}>Prueba</span>
            <EventSelect events={events} value={eventId} onChange={setEventId} />
          </div>

          <label className="flex flex-col gap-1.5">
            <span className={`${MONO} text-ink/40`}>{hintFor(event, direction)}</span>
            <input
              type="text"
              inputMode={direction === 'toMark' ? 'numeric' : 'decimal'}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholderFor(event, direction)}
              className="h-[46px] rounded-xl border border-ink/[0.15] bg-cream/60 px-4 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-ink/30 tabular-nums"
            />
          </label>
        </div>
      </div>

      {/* Result */}
      <div className={`border-t border-ink/[0.08] bg-ink px-5 sm:px-7 py-6 ${hasEquiv ? '' : 'rounded-b-2xl'}`}>
        {result ? (
          <div className="flex items-baseline gap-3">
            <span className="font-brand text-5xl sm:text-6xl font-extrabold tracking-brand text-mint leading-none tabular-nums">
              {result.kind === 'points' ? result.value : formatMark(result.value, event)}
            </span>
            <span className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-cream/50">
              {result.kind === 'points'
                ? <>puntos<br />World Athletics</>
                : <>marca para<br />{input || '—'} pts</>}
            </span>
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">
            {input ? 'Formato no válido. Revisa el dato introducido.' : 'Introduce una marca para calcular los puntos.'}
          </p>
        )}
      </div>

      {/* Equivalences */}
      {hasEquiv && (
        <div className="border-t border-ink/[0.08] px-5 sm:px-7 py-5 rounded-b-2xl">
          <p className={`${MONO} text-ink/40 mb-3`}>
            Marcas equivalentes · {result && result.kind === 'points' ? result.value : 0} pts
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {equivalences.map(({ event: e, mark }) => (
              <div key={e.id} className="rounded-xl border border-ink/[0.08] bg-cream/40 px-3 py-2.5">
                <p className="font-mono text-[0.56rem] tracking-wider text-ink/40 uppercase truncate">{e.label}</p>
                <p className="text-sm font-semibold text-ink tabular-nums mt-0.5">{formatMark(mark, e)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Segmented control ────────────────────────────────────────────────────────
function Segmented({
  options, value, onChange,
}: {
  options: { v: string; l: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex rounded-full border border-ink/[0.12] bg-cream/60 p-1 flex-1">
      {options.map(o => {
        const active = value === o.v
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-full px-3 py-1.5 font-mono text-[0.62rem] tracking-[0.14em] uppercase transition-colors duration-150 ${
              active
                ? 'bg-ink text-cream shadow-[0_1px_4px_rgba(13,42,20,0.18)]'
                : 'text-ink/55 hover:text-ink'
            }`}
          >
            {o.l}
          </button>
        )
      })}
    </div>
  )
}

// ─── Custom event dropdown ────────────────────────────────────────────────────
function EventSelect({
  events, value, onChange,
}: {
  events: ScoringEvent[]
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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

  const current = events.find(e => e.id === value)
  const track = events.filter(e => e.kind === 'track')
  const field = events.filter(e => e.kind === 'field')

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
        className={`flex h-[46px] w-full items-center justify-between rounded-xl border bg-cream/60 px-4 text-sm text-ink transition-colors ${
          open ? 'border-ink/30 ring-2 ring-mint/40' : 'border-ink/[0.15] hover:border-ink/25'
        }`}
      >
        <span className="font-medium truncate">{current?.label ?? 'Selecciona prueba'}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true"
          className={`shrink-0 text-ink/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <path d="M1 1.5l5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="dropdown-enter absolute z-40 mt-2 w-full max-h-72 overflow-auto rounded-xl border border-ink/[0.12] bg-paper p-1.5 shadow-[0_12px_32px_rgba(13,42,20,0.14)]"
        >
          <Group label="Pista y ruta" items={track} value={value} onPick={pick} />
          <Group label="Concursos" items={field} value={value} onPick={pick} />
        </div>
      )}
    </div>
  )
}

function Group({
  label, items, value, onPick,
}: {
  label: string
  items: ScoringEvent[]
  value: string
  onPick: (id: string) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-1 last:mb-0">
      <p className="px-3 pt-2 pb-1 font-mono text-[0.55rem] tracking-[0.2em] uppercase text-ink/35">{label}</p>
      {items.map(e => {
        const active = e.id === value
        return (
          <button
            key={e.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onPick(e.id)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
              active ? 'bg-mint/20 text-ink font-semibold' : 'text-ink/70 hover:bg-ink/[0.04] hover:text-ink'
            }`}
          >
            {e.label}
            {active && (
              <svg width="13" height="10" viewBox="0 0 13 10" fill="none" aria-hidden="true" className="text-ink">
                <path d="M1 5l3.5 3.5L12 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
