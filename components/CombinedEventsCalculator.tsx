'use client'

import { useMemo, useState } from 'react'
import { DECATHLON, HEPTATHLON, scoreSubEvent, type SubEvent } from '@/lib/combined-events'
import { parseClock } from '@/lib/running'
import { Segmented, MONO } from './lab/ui'

type Discipline = 'decathlon' | 'heptathlon'

function parseValue(ev: SubEvent, raw: string): number | null {
  if (!raw.trim()) return null
  if (ev.kind === 'track') return parseClock(raw)
  const v = Number(raw.replace(',', '.'))
  return Number.isFinite(v) && v > 0 ? v : null
}

export function CombinedEventsCalculator() {
  const [discipline, setDiscipline] = useState<Discipline>('decathlon')
  const [marks, setMarks] = useState<Record<string, string>>({})

  const events = discipline === 'decathlon' ? DECATHLON : HEPTATHLON

  const rows = useMemo(() =>
    events.map(ev => {
      const val = parseValue(ev, marks[ev.id] ?? '')
      const pts = val === null ? null : scoreSubEvent(ev, val)
      return { ev, pts }
    }),
    [events, marks],
  )

  const total = rows.reduce((sum, r) => sum + (r.pts ?? 0), 0)

  function set(id: string, v: string) {
    setMarks(prev => ({ ...prev, [id]: v }))
  }

  function switchDiscipline(d: Discipline) {
    setDiscipline(d)
    setMarks({})
  }

  return (
    <div className="rounded-2xl border border-ink/[0.1] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-5 rounded-t-2xl">
        <Segmented
          options={[{ v: 'decathlon', l: 'Decatlón (H)' }, { v: 'heptathlon', l: 'Heptatlón (M)' }]}
          value={discipline}
          onChange={v => switchDiscipline(v as Discipline)}
        />

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
                onChange={e => set(ev.id, e.target.value)}
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
      <div className="border-t border-ink/[0.08] bg-ink px-5 sm:px-7 py-6 rounded-b-2xl flex items-baseline justify-between">
        <span className={`${MONO} text-cream/45`}>Puntuación total</span>
        <span className="font-brand text-5xl sm:text-6xl font-extrabold tracking-brand text-mint leading-none tabular-nums">
          {total}
        </span>
      </div>
    </div>
  )
}
