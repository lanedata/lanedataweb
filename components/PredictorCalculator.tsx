'use client'

import { useMemo, useState } from 'react'
import { parseClock, formatClock, formatPace } from '@/lib/running'
import {
  PREDICTOR_DISTANCES,
  PREDICTOR_TO_SCORING,
  TRAINING_ZONES,
  riegel,
  vdot,
  timeForVdot,
  paceAtIntensity,
} from '@/lib/predictor'
import {
  SCORING_EVENTS,
  calculatePoints,
  coeffsFor,
  type Gender,
} from '@/lib/iaaf-scoring'
import { Segmented, LabField, Metric, inputCls, MONO } from './lab/ui'

export function PredictorCalculator() {
  const [gender, setGender] = useState<Gender>('men')
  const [distId, setDistId] = useState('5000')
  const [timeInput, setTimeInput] = useState('')

  const from = PREDICTOR_DISTANCES.find(d => d.id === distId)!

  const calc = useMemo(() => {
    const t = parseClock(timeInput)
    if (t === null || t <= 0) return null

    const v = vdot(from.m, t)
    if (!Number.isFinite(v) || v <= 0) return null

    const rows = PREDICTOR_DISTANCES.map(d => {
      const daniels = d.id === from.id ? t : timeForVdot(d.m, v)
      const rgl = d.id === from.id ? t : riegel(from.m, t, d.m)

      // Puntos WA de la predicción Daniels, cuando hay prueba equivalente.
      const scoringId = PREDICTOR_TO_SCORING[d.id]
      const ev = SCORING_EVENTS.find(e => e.id === scoringId)
      const c = ev ? coeffsFor(ev, gender, 'outdoor') : null
      const points = c && daniels ? calculatePoints(c, daniels, 'track') : null

      return { d, daniels, riegel: rgl, points, isSource: d.id === from.id }
    })

    const zones = TRAINING_ZONES.map(z => ({
      z,
      pace: paceAtIntensity(v, z.pct),
      paceTo: z.pctTo ? paceAtIntensity(v, z.pctTo) : null,
    }))

    return { t, vdot: v, secPerKm: t / (from.m / 1000), kmh: from.m / 1000 / (t / 3600), rows, zones }
  }, [from, timeInput, gender])

  return (
    <div className="border border-ink/[0.14] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <LabField label="Distancia de referencia">
            <select value={distId} onChange={e => setDistId(e.target.value)} className={inputCls}>
              {PREDICTOR_DISTANCES.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </LabField>
          <LabField label="Tu marca (h:mm:ss)">
            <input
              className={inputCls}
              value={timeInput}
              onChange={e => setTimeInput(e.target.value)}
              placeholder={from.m <= 3000 ? 'p. ej. 9:20' : 'p. ej. 38:40'}
            />
          </LabField>
          <div className="flex flex-col gap-1.5">
            <span className={`${MONO} text-ink/40`}>Puntos WA</span>
            <div className="h-[46px] flex items-center">
              <Segmented
                options={[{ v: 'men', l: 'Hombres' }, { v: 'women', l: 'Mujeres' }]}
                value={gender}
                onChange={v => setGender(v as Gender)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="border-t border-ink/[0.14] bg-ink px-5 sm:px-7 py-6">
        {calc ? (
          <div className="flex flex-wrap gap-x-10 gap-y-5">
            <Metric primary value={calc.vdot.toFixed(1)} label="VDOT · VO₂máx estimado" />
            <Metric value={formatPace(calc.secPerKm)} label="ritmo de referencia /km" />
            <Metric value={calc.kmh.toFixed(1)} label="km / h" />
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">
            Introduce una marca reciente para predecir el resto de distancias.
          </p>
        )}
      </div>

      {calc && (
        <>
          {/* Predicciones */}
          <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-5">
            <p className={`${MONO} text-ink/40 mb-3`}>Marcas equivalentes previstas</p>
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[26rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-ink/[0.14]">
                    <th className={`${MONO} text-ink/40 py-2 px-1 text-left font-normal`}>Distancia</th>
                    <th className={`${MONO} text-ink/40 py-2 px-1 text-right font-normal`}>Daniels</th>
                    <th className={`${MONO} text-ink/40 py-2 px-1 text-right font-normal`}>Riegel</th>
                    <th className={`${MONO} text-ink/40 py-2 px-1 text-right font-normal`}>Ritmo /km</th>
                    <th className={`${MONO} text-ink/40 py-2 px-1 text-right font-normal`}>Pts WA</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.rows.map(r => (
                    <tr
                      key={r.d.id}
                      className={`border-b border-ink/[0.06] last:border-0 ${r.isSource ? 'bg-mint/[0.14]' : ''}`}
                    >
                      <td className="py-2 px-1 text-ink/75">
                        {r.d.label}
                        {r.isSource && (
                          <span className="ml-2 font-mono text-[0.5rem] tracking-widest uppercase text-ink/40">tu marca</span>
                        )}
                      </td>
                      <td className="py-2 px-1 text-right font-semibold text-ink tabular-nums">
                        {r.daniels ? formatClock(r.daniels) : '—'}
                      </td>
                      <td className="py-2 px-1 text-right text-ink/50 tabular-nums">{formatClock(r.riegel)}</td>
                      <td className="py-2 px-1 text-right text-ink/50 tabular-nums">
                        {r.daniels ? formatPace(r.daniels / (r.d.m / 1000)) : '—'}
                      </td>
                      <td className="py-2 px-1 text-right text-ink/50 tabular-nums">{r.points || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ritmos de entrenamiento */}
          <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-5">
            <p className={`${MONO} text-ink/40 mb-3`}>Ritmos de entrenamiento · VDOT {calc.vdot.toFixed(1)}</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {calc.zones.map(({ z, pace, paceTo }) => (
                <div key={z.id} className="border border-ink/[0.14] bg-cream/40 px-3.5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[0.82rem] font-semibold text-ink">{z.label}</p>
                    <p className="font-brand text-base font-extrabold text-ink tabular-nums shrink-0">
                      {paceTo ? `${formatPace(paceTo)}–${formatPace(pace)}` : formatPace(pace)}
                    </p>
                  </div>
                  <p className="mt-1 text-[0.68rem] text-ink/45 leading-snug">{z.note}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-4">
            <p className="text-[0.7rem] text-ink/45 leading-relaxed">
              <strong className="text-ink/65">Daniels</strong> traduce tu marca a un VO₂máx equivalente (VDOT) y busca
              qué tiempo daría ese mismo VDOT en cada distancia; <strong className="text-ink/65">Riegel</strong> escala
              el tiempo con el exponente 1,06. Ambos asumen que estás igual de entrenado para todas las distancias, así
              que cuanto más te alejes de tu marca de referencia —sobre todo hacia el maratón— más optimista será la
              predicción. Los puntos WA se calculan con la tabla de aire libre.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
