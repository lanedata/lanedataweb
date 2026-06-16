'use client'

import { useMemo, useState } from 'react'
import { parseClock, formatClock } from '@/lib/running'
import { LabField, Metric, inputCls, MONO } from './lab/ui'

const RIEGEL = 1.06

const DISTANCES = [
  { id: '800', label: '800 m', m: 800 },
  { id: '1500', label: '1500 m', m: 1500 },
  { id: '3000', label: '3000 m', m: 3000 },
  { id: '5k', label: '5 km', m: 5000 },
  { id: '10k', label: '10 km', m: 10000 },
  { id: '15k', label: '15 km', m: 15000 },
  { id: 'hm', label: 'Media maratón', m: 21097.5 },
  { id: 'm', label: 'Maratón', m: 42195 },
]

export function RacePredictor() {
  const [knownId, setKnownId] = useState('10k')
  const [knownTime, setKnownTime] = useState('')
  const [targetId, setTargetId] = useState('hm')

  const known = DISTANCES.find(d => d.id === knownId)!
  const target = DISTANCES.find(d => d.id === targetId)!

  const knownSec = useMemo(() => parseClock(knownTime), [knownTime])

  function predict(targetM: number): number | null {
    if (knownSec === null) return null
    return knownSec * Math.pow(targetM / known.m, RIEGEL)
  }

  const main = predict(target.m)
  const table = DISTANCES.filter(d => d.id !== knownId).map(d => ({ d, t: predict(d.m) }))

  return (
    <div className="rounded-2xl border border-ink/[0.1] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-5 rounded-t-2xl">
        <div className="grid gap-3 sm:grid-cols-3">
          <LabField label="Distancia conocida">
            <select value={knownId} onChange={e => setKnownId(e.target.value)} className={inputCls}>
              {DISTANCES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </LabField>
          <LabField label="Tu marca (h:mm:ss)">
            <input className={inputCls} value={knownTime} onChange={e => setKnownTime(e.target.value)} placeholder="p. ej. 38:20" />
          </LabField>
          <LabField label="Distancia objetivo">
            <select value={targetId} onChange={e => setTargetId(e.target.value)} className={inputCls}>
              {DISTANCES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </LabField>
        </div>
      </div>

      {/* Result */}
      <div className={`border-t border-ink/[0.08] bg-ink px-5 sm:px-7 py-6 ${main ? '' : 'rounded-b-2xl'}`}>
        {main ? (
          <div className="flex items-baseline gap-3">
            <Metric primary value={formatClock(main)} label={`predicción · ${target.label}`} />
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">Introduce una marca para estimar tus tiempos.</p>
        )}
      </div>

      {/* Table across distances */}
      {knownSec !== null && (
        <div className="border-t border-ink/[0.08] px-5 sm:px-7 py-5 rounded-b-2xl">
          <p className={`${MONO} text-ink/40 mb-3`}>Tiempos equivalentes</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {table.map(({ d, t }) => (
              <div key={d.id} className="rounded-xl border border-ink/[0.08] bg-cream/40 px-3 py-2.5">
                <p className="font-mono text-[0.56rem] tracking-wider text-ink/40 uppercase">{d.label}</p>
                <p className="text-sm font-semibold text-ink tabular-nums mt-0.5">{t ? formatClock(t) : '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
