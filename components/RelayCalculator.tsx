'use client'

import { useMemo, useState } from 'react'
import { parseClock, formatClock } from '@/lib/running'
import { Segmented, MONO } from './lab/ui'

// Por tipo de relevo: ahorro por posta lanzada (postas 2-4) según compenetración.
// [min (sin rodaje) , max (élite)] segundos por cambio.
const RELAYS = [
  { id: '4x100', label: '4 × 100 m', leg: '100 m', ph: '11.20', save: [0.20, 1.10] },
  { id: '4x200', label: '4 × 200 m', leg: '200 m', ph: '22.50', save: [0.20, 0.95] },
  { id: '4x400', label: '4 × 400 m', leg: '400 m', ph: '50.00', save: [0.15, 0.75] },
  { id: '4x400mix', label: '4 × 400 mixto', leg: '400 m', ph: '52.00', save: [0.15, 0.75] },
] as const

const fmt = (x: number) => (x < 60 ? x.toFixed(2) : formatClock(x))

function coordLabel(v: number) {
  if (v < 20) return 'Sin rodaje'
  if (v < 40) return 'Poco rodado'
  if (v < 60) return 'Normal'
  if (v < 80) return 'Bien rodado'
  return 'Élite'
}

export function RelayCalculator() {
  const [relayId, setRelayId] = useState<string>('4x100')
  const [coord, setCoord] = useState(50)
  const [legs, setLegs] = useState<string[]>(['', '', '', ''])

  const relay = RELAYS.find(r => r.id === relayId)!
  const savePerLeg = relay.save[0] + (coord / 100) * (relay.save[1] - relay.save[0])

  const calc = useMemo(() => {
    const secs = legs.map(l => parseClock(l))
    const present = secs.filter((s): s is number => s !== null)
    if (present.length === 0) return null

    const rawSum = present.reduce((a, b) => a + b, 0)
    const complete = present.length === 4

    // Estimación: posta 1 desde tacos; postas 2-4 con salida lanzada.
    let estimate: number | null = null
    const cumulative: (number | null)[] = []
    if (complete) {
      let run = 0
      estimate = 0
      secs.forEach((s, i) => {
        const eff = i === 0 ? (s as number) : Math.max((s as number) - savePerLeg, 0)
        estimate! += eff
        run += eff
        cumulative.push(run)
      })
    }

    const fastest = Math.min(...present)
    const slowest = Math.max(...present)
    return { secs, rawSum, complete, estimate, cumulative, fastest, slowest, saved: complete ? rawSum - (estimate as number) : 0 }
  }, [legs, savePerLeg])

  const setLeg = (i: number, v: string) => setLegs(prev => prev.map((x, j) => (j === i ? v : x)))

  return (
    <div className="border border-ink/[0.14] bg-paper">
      <div className="p-5 sm:p-7 flex flex-col gap-5">
        <Segmented options={RELAYS.map(r => ({ v: r.id, l: r.label }))} value={relayId} onChange={setRelayId} />

        {/* Coordination slider */}
        <div className="border border-ink/[0.14] bg-cream/30 px-4 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className={`${MONO} text-ink/45`}>Compenetración del relevo</span>
            <span className="font-mono text-[0.62rem] text-ink/70">
              <span className="text-ink font-semibold">{coordLabel(coord)}</span> · {coord}
            </span>
          </div>
          <input
            type="range" min={0} max={100} step={1} value={coord}
            onChange={e => setCoord(Number(e.target.value))}
            aria-label="Compenetración del relevo"
            className="w-full accent-mint cursor-pointer"
          />
          <p className="mt-1.5 font-mono text-[0.55rem] tracking-wider text-ink/30 uppercase">
            Si no lo sabes, déjalo en 50 · ahorro ≈ {savePerLeg.toFixed(2)} s por cambio
          </p>
        </div>

        {/* Individual marks */}
        <div className="grid gap-2 sm:grid-cols-2">
          {legs.map((v, i) => {
            const s = calc?.secs[i] ?? null
            const isFast = calc?.complete && s !== null && s === calc.fastest && calc.fastest !== calc.slowest
            const isSlow = calc?.complete && s !== null && s === calc.slowest && calc.fastest !== calc.slowest
            return (
              <div key={i} className="flex items-center gap-3 border border-ink/[0.14] bg-cream/30 px-3 py-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-ink text-cream font-mono text-[0.7rem]">{i + 1}ª</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8rem] font-semibold text-ink leading-tight">
                    Posta {i + 1}{i > 0 ? ' · lanzada' : ' · tacos'}
                  </p>
                  <p className="font-mono text-[0.55rem] tracking-wider text-ink/35 uppercase">marca individual {relay.leg}</p>
                </div>
                {(isFast || isSlow) && (
                  <span className={`font-mono text-[0.5rem] tracking-widest uppercase ${isFast ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {isFast ? 'mejor' : 'peor'}
                  </span>
                )}
                <input
                  value={v} onChange={e => setLeg(i, e.target.value)} placeholder={relay.ph} inputMode="decimal"
                  className="h-9 w-[5.5rem] shrink-0 border border-ink/[0.15] bg-paper px-2.5 text-sm text-ink text-right placeholder:text-ink/25 focus:outline-none focus:ring-2 focus:ring-mint/40 tabular-nums"
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Result */}
      <div className="border-t border-ink/[0.14] bg-ink px-5 sm:px-7 py-6">
        {calc?.complete && calc.estimate !== null ? (
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <div>
              <span className="font-brand text-5xl sm:text-6xl font-extrabold tracking-brand text-mint leading-none tabular-nums">
                {fmt(calc.estimate)}
              </span>
              <span className="ml-3 font-mono text-[0.58rem] tracking-[0.2em] uppercase text-cream/45">tiempo estimado</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="font-mono text-[0.6rem] tracking-wider uppercase text-cream/40">suma individual {fmt(calc.rawSum)}</span>
              <span className="font-mono text-[0.6rem] tracking-wider uppercase text-mint/70">cambios −{calc.saved.toFixed(2)} s</span>
            </div>
          </div>
        ) : (
          <p className="font-mono text-sm text-cream/35 py-3">
            {calc ? 'Introduce las 4 marcas para estimar el relevo.' : 'Introduce las marcas individuales de cada posta.'}
          </p>
        )}
      </div>

      {/* Cumulative */}
      {calc?.complete && (
        <div className="border-t border-ink/[0.14] px-5 sm:px-7 py-5">
          <p className={`${MONO} text-ink/40 mb-3`}>Acumulado estimado en cada cambio</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {calc.cumulative.map((c, i) => (
              <div key={i} className="border border-ink/[0.14] bg-cream/40 px-3 py-2.5">
                <p className="font-mono text-[0.56rem] tracking-wider text-ink/40 uppercase">tras {i + 1}ª posta</p>
                <p className="text-sm font-semibold text-ink tabular-nums mt-0.5">{c !== null ? fmt(c) : '—'}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.7rem] text-ink/40 leading-relaxed">
            Estimación: la 1ª posta sale de tacos (tu marca individual) y las postas 2-4 reciben el testigo lanzadas,
            por lo que corren más rápido. Cuánto ganan depende de la compenetración. Es una aproximación, no un cronometraje.
          </p>
        </div>
      )}
    </div>
  )
}
