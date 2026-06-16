'use client'

import { useMemo, useState } from 'react'
import { parseClock, formatRaceTime } from '@/lib/running'
import { LabField, Metric, inputCls, MONO } from './lab/ui'

const RIEGEL = 1.06

// Full range — sprints to marathon. Riegel is most accurate between similar
// distances (and especially 1500 m → maratón); los sprints son orientativos.
const DISTANCES = [
  { id: '60', label: '60 m', m: 60 },
  { id: '100', label: '100 m', m: 100 },
  { id: '200', label: '200 m', m: 200 },
  { id: '300', label: '300 m', m: 300 },
  { id: '400', label: '400 m', m: 400 },
  { id: '600', label: '600 m', m: 600 },
  { id: '800', label: '800 m', m: 800 },
  { id: '1000', label: '1000 m', m: 1000 },
  { id: '1500', label: '1500 m', m: 1500 },
  { id: 'mile', label: 'Milla', m: 1609.344 },
  { id: '3000', label: '3000 m', m: 3000 },
  { id: '5k', label: '5 km', m: 5000 },
  { id: '10k', label: '10 km', m: 10000 },
  { id: '15k', label: '15 km', m: 15000 },
  { id: 'hm', label: 'Media maratón', m: 21097.5 },
  { id: 'm', label: 'Maratón', m: 42195 },
]

export function RacePredictor() {
  const [knownId, setKnownId] = useState('5k')
  const [knownTime, setKnownTime] = useState('')
  const [targetId, setTargetId] = useState('10k')

  const known = DISTANCES.find(d => d.id === knownId)!
  const target = DISTANCES.find(d => d.id === targetId)!
  const knownSec = useMemo(() => parseClock(knownTime), [knownTime])

  const predict = (m: number) => (knownSec === null ? null : knownSec * Math.pow(m / known.m, RIEGEL))

  const main = predict(target.m)
  const table = DISTANCES.filter(d => d.id !== knownId).map(d => ({ d, t: predict(d.m) }))

  return (
    <div className="rounded-2xl border border-ink/[0.1] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-5 rounded-t-2xl">
        <div className="grid gap-3 sm:grid-cols-3">
          <LabField label="Prueba conocida">
            <select value={knownId} onChange={e => setKnownId(e.target.value)} className={inputCls}>
              {DISTANCES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </LabField>
          <LabField label="Tu marca">
            <input className={inputCls} value={knownTime} onChange={e => setKnownTime(e.target.value)} placeholder="p. ej. 18:30 · 49.5" />
          </LabField>
          <LabField label="Prueba objetivo">
            <select value={targetId} onChange={e => setTargetId(e.target.value)} className={inputCls}>
              {DISTANCES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </LabField>
        </div>
      </div>

      {/* Result */}
      <div className={`border-t border-ink/[0.08] bg-ink px-5 sm:px-7 py-6 ${main ? '' : 'rounded-b-2xl'}`}>
        {main ? (
          <Metric primary value={formatRaceTime(main)} label={`predicción · ${target.label}`} />
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
                <p className="text-sm font-semibold text-ink tabular-nums mt-0.5">{t ? formatRaceTime(t) : '—'}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.7rem] text-ink/35 leading-relaxed">
            Fórmula de Riegel (exponente 1,06). Es más fiable entre distancias cercanas y de fondo;
            en velocidad pura tómalo como una referencia aproximada.
          </p>
        </div>
      )}
    </div>
  )
}
