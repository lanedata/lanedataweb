'use client'

import { useMemo, useState } from 'react'
import { parseClock } from '@/lib/running'
import { LabField, Metric, inputCls } from './lab/ui'

type Kind = 'track' | 'field'

interface WindEvent {
  id: string
  label: string
  kind: Kind
  mureika: boolean   // 100 m → modelo físico exacto; resto → estimación lineal
  b2: number         // efecto típico de un viento de +2.0 m/s (s ó m)
  ph: string
}

// Pruebas donde World Athletics mide el viento.
const EVENTS: WindEvent[] = [
  { id: '100m',  label: '100 m',             kind: 'track', mureika: true,  b2: 0.10, ph: '10.45' },
  { id: '200m',  label: '200 m',             kind: 'track', mureika: false, b2: 0.12, ph: '20.80' },
  { id: '110mH', label: '110 m vallas (H)',  kind: 'track', mureika: false, b2: 0.10, ph: '13.40' },
  { id: '100mH', label: '100 m vallas (M)',  kind: 'track', mureika: false, b2: 0.10, ph: '12.90' },
  { id: 'LJ',    label: 'Salto de longitud', kind: 'field', mureika: false, b2: 0.10, ph: '7.50' },
  { id: 'TJ',    label: 'Triple salto',      kind: 'field', mureika: false, b2: 0.21, ph: '15.50' },
]

// Mureika (2001) para el 100 m: t0 = t·[1.027 − 0.027·e^(−0.000125·H)·(1 − w·t/100)²]
function mureika(t: number, w: number, H: number) {
  return t * (1.027 - 0.027 * Math.exp(-0.000125 * H) * Math.pow(1 - (w * t) / 100, 2))
}

const f2 = (x: number) => x.toFixed(2)

export function WindCalculator() {
  const [eventId, setEventId] = useState('100m')
  const [mark, setMark] = useState('')
  const [wind, setWind] = useState('')
  const [alt, setAlt] = useState('')

  const ev = EVENTS.find(e => e.id === eventId)!

  const calc = useMemo(() => {
    const w = wind.trim() === '' ? 0 : Number(wind.replace(',', '.'))
    const H = alt.trim() === '' ? 0 : Number(alt.replace(',', '.'))
    if (!Number.isFinite(w) || !Number.isFinite(H) || H < 0) return null

    const m = ev.kind === 'track' ? parseClock(mark) : Number(mark.replace(',', '.'))
    if (m === null || !Number.isFinite(m) || m <= 0) return null

    let equiv: number
    if (ev.mureika) {
      equiv = mureika(m, w, H)
    } else if (ev.kind === 'track') {
      equiv = m + ev.b2 * (w / 2)          // sin viento serías más lento
    } else {
      equiv = m - ev.b2 * (w / 2)          // sin viento saltarías menos
    }

    // "ayuda" = cuánto mejoró tu marca por las condiciones (siempre positivo = ayudó)
    const help = ev.kind === 'track' ? equiv - m : m - equiv
    return { m, w, equiv, help, legal: w <= 2.0001 }
  }, [ev, mark, wind, alt])

  const unit = ev.kind === 'field' ? ' m' : ''

  return (
    <div className="border border-ink/[0.14] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-5">
        <div className={`grid gap-3 ${ev.mureika ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
          <LabField label="Prueba">
            <select value={eventId} onChange={e => setEventId(e.target.value)} className={inputCls}>
              {EVENTS.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </LabField>
          <LabField label={ev.kind === 'field' ? 'Marca (m)' : 'Marca (s)'}>
            <input className={inputCls} inputMode="decimal" value={mark} onChange={e => setMark(e.target.value)} placeholder={`p. ej. ${ev.ph}`} />
          </LabField>
          <LabField label="Viento (m/s)">
            <input className={inputCls} inputMode="decimal" value={wind} onChange={e => setWind(e.target.value)} placeholder="+1.8 ó -0.6" />
          </LabField>
          {ev.mureika && (
            <LabField label="Altitud (m)">
              <input className={inputCls} inputMode="decimal" value={alt} onChange={e => setAlt(e.target.value)} placeholder="0" />
            </LabField>
          )}
        </div>
      </div>

      {/* Result */}
      <div className="border-t border-ink/[0.14] bg-ink px-5 sm:px-7 py-6">
        {calc ? (
          <div className="flex flex-wrap gap-x-10 gap-y-5 items-center">
            <Metric primary value={`${f2(calc.equiv)}${unit}`} label={ev.mureika ? 'equivalente viento nulo · nivel del mar' : 'equivalente viento nulo'} />
            <Metric
              value={`${calc.help >= 0 ? '+' : '−'}${f2(Math.abs(calc.help))}${unit}`}
              label={calc.help >= 0 ? 'te ayudó el viento' : 'te perjudicó el viento'}
            />
            <span className={`px-3 py-1 font-mono text-[0.58rem] tracking-widest uppercase border ${
              calc.legal ? 'bg-mint/15 border-mint/30 text-mint' : 'bg-rose-400/20 border-rose-300/30 text-rose-200'
            }`}>
              {calc.legal ? 'Viento legal (≤ +2.0)' : 'Viento > +2.0 · no homologable'}
            </span>
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">Introduce la marca y el viento.</p>
        )}
      </div>

      {/* Model note */}
      <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-4">
        <p className="text-[0.7rem] text-ink/45 leading-relaxed">
          {ev.mureika ? (
            <>Modelo de <strong className="text-ink/65">Mureika (2001)</strong> para el 100 m (incluye altitud). </>
          ) : (
            <><strong className="text-ink/65">Estimación</strong> anclada al efecto típico del viento en {ev.label.toLowerCase()} (~{f2(ev.b2)}{unit} por cada +2,0 m/s). </>
          )}
          Es una <strong className="text-ink/65">aproximación física</strong>, no una corrección oficial: el efecto real
          del viento es estadístico. La altitud no afecta a la legalidad; el viento sí (límite +2,0 m/s).
        </p>
      </div>
    </div>
  )
}
