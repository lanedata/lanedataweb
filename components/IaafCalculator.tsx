'use client'

import { useMemo, useState } from 'react'
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

// Curated set shown in the equivalences panel.
const EQUIV_IDS = ['100m', '200m', '400m', '800m', '1500m', '5000m', 'LJ', 'HJ', 'SP', 'JT']

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

  // If the current event isn't contested for the chosen gender, jump to a valid one.
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
      const pts = calculatePoints(coeffs, x, event.kind)
      return { kind: 'points' as const, value: pts }
    } else {
      const pts = Number(input.trim())
      if (!Number.isFinite(pts) || pts <= 0) return null
      const mark = performanceForPoints(coeffs, pts, event.kind)
      if (mark === null) return null
      return { kind: 'mark' as const, value: mark }
    }
  }, [coeffs, direction, input, event])

  // Equivalences: same points expressed in other events (only in toPoints mode).
  const equivalences = useMemo(() => {
    if (direction !== 'toPoints' || !result || result.kind !== 'points' || result.value <= 0) return []
    return EQUIV_IDS
      .map(id => SCORING_EVENTS.find(e => e.id === id))
      .filter((e): e is ScoringEvent => !!e && e.id !== event.id)
      .map(e => {
        const c = gender === 'men' ? e.men : e.women
        if (!c) return null
        const mark = performanceForPoints(c, result.value, e.kind)
        return mark === null ? null : { event: e, mark }
      })
      .filter((x): x is { event: ScoringEvent; mark: number } => x !== null)
  }, [direction, result, event.id, gender])

  const trackEvents = SCORING_EVENTS.filter(e => e.kind === 'track' && genderHasEvent(e, gender))
  const fieldEvents = SCORING_EVENTS.filter(e => e.kind === 'field' && genderHasEvent(e, gender))

  return (
    <div className="rounded-2xl border border-ink/[0.1] bg-paper overflow-hidden">
      {/* Controls */}
      <div className="p-5 sm:p-7 flex flex-col gap-5">

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
          <label className="flex flex-col gap-1.5">
            <span className="label-mono text-ink/40">Prueba</span>
            <select
              value={eventId}
              onChange={e => setEventId(e.target.value)}
              className="rounded-xl border border-ink/[0.15] bg-cream/60 px-4 py-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-ink/30"
            >
              <optgroup label="Pista y ruta">
                {trackEvents.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </optgroup>
              <optgroup label="Concursos">
                {fieldEvents.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
              </optgroup>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label-mono text-ink/40">{hintFor(event, direction)}</span>
            <input
              type="text"
              inputMode={direction === 'toMark' ? 'numeric' : 'decimal'}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={placeholderFor(event, direction)}
              className="rounded-xl border border-ink/[0.15] bg-cream/60 px-4 py-3 text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-mint/40 focus:border-ink/30 tabular-nums"
            />
          </label>
        </div>
      </div>

      {/* Result */}
      <div className="border-t border-ink/[0.08] bg-ink px-5 sm:px-7 py-6">
        {result ? (
          result.kind === 'points' ? (
            <div className="flex items-baseline gap-3">
              <span className="font-brand text-5xl sm:text-6xl font-extrabold tracking-brand text-mint leading-none tabular-nums">
                {result.value}
              </span>
              <span className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-cream/50">
                puntos<br />World Athletics
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="font-brand text-5xl sm:text-6xl font-extrabold tracking-brand text-mint leading-none tabular-nums">
                {formatMark(result.value, event)}
              </span>
              <span className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-cream/50">
                marca para<br />{input || '—'} pts
              </span>
            </div>
          )
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">
            {input
              ? 'Formato no válido. Revisa el dato introducido.'
              : 'Introduce una marca para calcular los puntos.'}
          </p>
        )}
      </div>

      {/* Equivalences */}
      {equivalences.length > 0 && (
        <div className="border-t border-ink/[0.08] px-5 sm:px-7 py-5">
          <p className="label-mono text-ink/40 mb-3">
            Marcas equivalentes ({result && result.kind === 'points' ? result.value : 0} pts)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {equivalences.map(({ event: e, mark }) => (
              <div key={e.id} className="rounded-xl border border-ink/[0.08] bg-cream/40 px-3 py-2.5">
                <p className="font-mono text-[0.58rem] tracking-wider text-ink/40 uppercase truncate">{e.label}</p>
                <p className="text-sm font-semibold text-ink tabular-nums mt-0.5">{formatMark(mark, e)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Segmented({
  options, value, onChange,
}: {
  options: { v: string; l: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex rounded-full border border-ink/[0.12] bg-cream/50 p-1 flex-1">
      {options.map(o => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-full px-3 py-1.5 label-mono transition-colors duration-150 ${
            value === o.v ? 'bg-ink text-cream' : 'text-ink/50 hover:text-ink'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}
