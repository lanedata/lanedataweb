'use client'

import { useMemo, useState } from 'react'
import { DISCIPLINES, scoreSubEvent, type SubEvent, type CombinedEnv } from '@/lib/combined-events'
import { parseClock } from '@/lib/running'
import {
  SCORING_EVENTS,
  calculatePoints,
  coeffsFor,
  type Gender,
} from '@/lib/iaaf-scoring'
import { Segmented, MONO } from './lab/ui'

function parseValue(ev: SubEvent, raw: string): number | null {
  if (!raw.trim()) return null
  if (ev.kind === 'track') return parseClock(raw)
  const v = Number(raw.replace(',', '.'))
  return Number.isFinite(v) && v > 0 ? v : null
}

export function CombinedEventsCalculator() {
  const [gender, setGender] = useState<Gender>('men')
  const [env, setEnv] = useState<CombinedEnv>('outdoor')
  const [marks, setMarks] = useState<Record<string, string>>({})

  const discipline = DISCIPLINES[env][gender]

  const rows = useMemo(() =>
    discipline.events.map(ev => {
      const val = parseValue(ev, marks[ev.id] ?? '')
      const pts = val === null ? null : scoreSubEvent(ev, val)
      return { ev, pts }
    }),
    [discipline, marks],
  )

  const total = rows.reduce((sum, r) => sum + (r.pts ?? 0), 0)
  const done = rows.filter(r => r.pts !== null).length

  // Los puntos de la combinada se convierten a su vez a puntos World Athletics.
  const waPoints = useMemo(() => {
    if (total <= 0) return null
    const ev = SCORING_EVENTS.find(e => e.id === discipline.scoringId)
    const c = ev ? coeffsFor(ev, gender, env) : null
    if (!c) return null
    const p = calculatePoints(c, total, 'score')
    return p > 0 ? p : null
  }, [total, discipline, gender, env])

  // Al cambiar de prueba las marcas anteriores ya no valen.
  function reset(next: () => void) {
    next()
    setMarks({})
  }

  return (
    <div className="rounded-2xl border border-ink/[0.1] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Segmented
            options={[{ v: 'men', l: 'Hombres' }, { v: 'women', l: 'Mujeres' }]}
            value={gender}
            onChange={v => reset(() => setGender(v as Gender))}
          />
          <Segmented
            options={[{ v: 'outdoor', l: 'Aire libre' }, { v: 'indoor', l: 'Pista cubierta' }]}
            value={env}
            onChange={v => reset(() => setEnv(v as CombinedEnv))}
          />
        </div>

        <div className="flex items-baseline gap-2.5">
          <h3 className="font-brand text-lg font-extrabold tracking-tight text-ink">{discipline.label}</h3>
          <span className="font-mono text-[0.55rem] tracking-[0.18em] uppercase text-ink/35">
            {discipline.events.length} pruebas · {done}/{discipline.events.length} rellenadas
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {rows.map(({ ev, pts }, i) => (
            <div key={ev.id} className="flex items-center gap-3 rounded-xl border border-ink/[0.08] bg-cream/30 px-3 py-2">
              <span className="font-mono text-[0.6rem] text-ink/30 tabular-nums w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8rem] font-semibold text-ink leading-tight truncate">{ev.label}</p>
                <p className="font-mono text-[0.55rem] tracking-wider text-ink/35 uppercase">{ev.unit === 'tiempo' ? 'segundos / m:ss' : 'metros'}</p>
              </div>
              <input
                value={marks[ev.id] ?? ''}
                onChange={e => setMarks(prev => ({ ...prev, [ev.id]: e.target.value }))}
                placeholder={ev.ph}
                inputMode="decimal"
                className="h-9 w-[5.5rem] shrink-0 rounded-lg border border-ink/[0.15] bg-paper px-2.5 text-sm text-ink text-right placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-mint/40 tabular-nums"
              />
              <span className="w-12 shrink-0 text-right font-brand text-base font-bold text-ink tabular-nums">
                {pts ?? '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className={`border-t border-ink/[0.08] bg-ink px-5 sm:px-7 py-6 flex items-baseline justify-between gap-4 ${waPoints ? '' : 'rounded-b-2xl'}`}>
        <span className={`${MONO} text-cream/45`}>Puntuación total</span>
        <span className="font-brand text-5xl sm:text-6xl font-extrabold tracking-brand text-mint leading-none tabular-nums">
          {total}
        </span>
      </div>

      {waPoints && (
        <div className="border-t border-ink/[0.08] bg-mint/[0.09] px-5 sm:px-7 py-4 rounded-b-2xl">
          <p className="text-sm text-ink/70">
            Esos {total} puntos de {discipline.label.toLowerCase()} equivalen a{' '}
            <strong className="font-semibold text-ink tabular-nums">{waPoints} puntos World Athletics</strong>,
            que es la escala con la que se compara con el resto de pruebas.
          </p>
        </div>
      )}
    </div>
  )
}
