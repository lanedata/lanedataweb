'use client'

import { useMemo, useState } from 'react'
import { parseClock, formatClock, formatPace, METRES_PER_MILE } from '@/lib/running'
import { Segmented, LabField, Metric, inputCls, MONO } from './lab/ui'

const DISTANCES = [
  { id: '1500', label: '1500 m', m: 1500 },
  { id: '3000', label: '3000 m', m: 3000 },
  { id: '5k', label: '5 km', m: 5000 },
  { id: '10k', label: '10 km', m: 10000 },
  { id: '15k', label: '15 km', m: 15000 },
  { id: 'hm', label: 'Media maratón', m: 21097.5 },
  { id: 'm', label: 'Maratón', m: 42195 },
  { id: 'custom', label: 'Personalizada', m: 0 },
]

// Split checkpoints (km) shown when ≤ total distance.
const CHECKPOINTS = [1, 2, 3, 5, 10, 15, 20, 21.0975, 25, 30, 35, 40, 42.195]

export function PaceCalculator() {
  const [distId, setDistId] = useState('10k')
  const [customKm, setCustomKm] = useState('')
  const [mode, setMode] = useState<'time' | 'pace'>('time')
  const [timeInput, setTimeInput] = useState('')
  const [paceInput, setPaceInput] = useState('')

  const distance = useMemo(() => {
    if (distId === 'custom') {
      const km = Number(customKm.replace(',', '.'))
      return Number.isFinite(km) && km > 0 ? km * 1000 : 0
    }
    return DISTANCES.find(d => d.id === distId)?.m ?? 0
  }, [distId, customKm])

  const calc = useMemo(() => {
    if (distance <= 0) return null
    const km = distance / 1000

    let totalSec: number | null = null
    if (mode === 'time') {
      totalSec = parseClock(timeInput)
    } else {
      const pace = parseClock(paceInput) // sec per km
      if (pace !== null) totalSec = pace * km
    }
    if (totalSec === null || totalSec <= 0) return null

    const secPerKm = totalSec / km
    const secPerMile = totalSec / (distance / METRES_PER_MILE)
    const kmh = km / (totalSec / 3600)

    const splits = CHECKPOINTS.filter(c => c <= km + 1e-6).map(c => ({
      km: c,
      t: formatClock(secPerKm * c),
    }))

    return { totalSec, secPerKm, secPerMile, kmh, splits }
  }, [distance, mode, timeInput, paceInput])

  return (
    <div className="border border-ink/[0.14] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-5">
        <Segmented
          options={[{ v: 'time', l: 'Tengo el tiempo' }, { v: 'pace', l: 'Tengo el ritmo' }]}
          value={mode}
          onChange={v => setMode(v as 'time' | 'pace')}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <LabField label="Distancia">
            <select value={distId} onChange={e => setDistId(e.target.value)} className={inputCls}>
              {DISTANCES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </LabField>

          {distId === 'custom' ? (
            <LabField label="Kilómetros">
              <input className={inputCls} inputMode="decimal" value={customKm}
                onChange={e => setCustomKm(e.target.value)} placeholder="p. ej. 8.5" />
            </LabField>
          ) : mode === 'time' ? (
            <LabField label="Tiempo objetivo (h:mm:ss)">
              <input className={inputCls} value={timeInput} onChange={e => setTimeInput(e.target.value)} placeholder="p. ej. 42:30" />
            </LabField>
          ) : (
            <LabField label="Ritmo /km (m:ss)">
              <input className={inputCls} value={paceInput} onChange={e => setPaceInput(e.target.value)} placeholder="p. ej. 4:15" />
            </LabField>
          )}
        </div>

        {/* When custom distance, the input above is km, so show the time/pace field below */}
        {distId === 'custom' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {mode === 'time' ? (
              <LabField label="Tiempo objetivo (h:mm:ss)">
                <input className={inputCls} value={timeInput} onChange={e => setTimeInput(e.target.value)} placeholder="p. ej. 42:30" />
              </LabField>
            ) : (
              <LabField label="Ritmo /km (m:ss)">
                <input className={inputCls} value={paceInput} onChange={e => setPaceInput(e.target.value)} placeholder="p. ej. 4:15" />
              </LabField>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      <div className="border-t border-ink/[0.14] bg-ink px-5 sm:px-7 py-6">
        {calc ? (
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            <Metric primary value={formatPace(calc.secPerKm)} label="min / km" />
            <Metric value={mode === 'time' ? formatClock(calc.totalSec) : formatPace(calc.secPerKm)} label={mode === 'time' ? 'tiempo' : 'ritmo'} />
            {mode === 'pace' && <Metric value={formatClock(calc.totalSec)} label="tiempo total" />}
            <Metric value={formatPace(calc.secPerMile)} label="min / milla" />
            <Metric value={`${calc.kmh.toFixed(1)}`} label="km / h" />
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">Introduce la distancia y el {mode === 'time' ? 'tiempo' : 'ritmo'}.</p>
        )}
      </div>

      {/* Splits */}
      {calc && calc.splits.length > 1 && (
        <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-5">
          <p className={`${MONO} text-ink/40 mb-3`}>Parciales acumulados</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {calc.splits.map(s => (
              <div key={s.km} className="border border-ink/[0.14] bg-cream/40 px-3 py-2">
                <p className="font-mono text-[0.56rem] tracking-wider text-ink/40 uppercase">{s.km % 1 === 0 ? `${s.km} km` : `${s.km.toFixed(1)} km`}</p>
                <p className="text-sm font-semibold text-ink tabular-nums mt-0.5">{s.t}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
