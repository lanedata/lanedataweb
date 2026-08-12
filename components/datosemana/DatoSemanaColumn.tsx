'use client'

// Columna fija "El dato de la semana" para la web pública. Descarga el CSV de
// /public/dato-semana.csv, elige el dato de la semana en curso (visible desde
// el miércoles) y lo pinta en la estética editorial de lanedata.
//
// El bloque se adapta a cualquier tipo de dato: si hay un valor destacado se
// muestra en grande; si hay foto, aparece a un lado; si no, el titular ocupa
// todo el ancho.

import { useEffect, useState } from 'react'
import { parseCsv, pickActive } from '@/lib/datosemana/csv'
import type { DatoSemana } from '@/lib/datosemana/types'

const CSV_URL = '/dato-semana.csv'

export function DatoSemanaColumn({ csvUrl = CSV_URL }: { csvUrl?: string }) {
  const [dato, setDato] = useState<DatoSemana | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'empty'>('loading')

  useEffect(() => {
    let alive = true
    fetch(csvUrl, { cache: 'no-store' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((text) => {
        if (!alive) return
        const active = pickActive(parseCsv(text))
        setDato(active)
        setState(active ? 'ready' : 'empty')
      })
      .catch(() => alive && setState('empty'))
    return () => { alive = false }
  }, [csvUrl])

  if (state === 'loading') {
    return (
      <div className="border border-ink/[0.14] bg-cream/40 p-8 min-h-[220px] animate-pulse" aria-hidden="true" />
    )
  }
  if (state === 'empty' || !dato) return null

  return (
    <article className="relative overflow-hidden border border-ink/[0.14] bg-ink text-cream">
      {/* Año como marca de agua tenue */}
      {dato.anio && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-4 -top-10 select-none font-brand font-extrabold leading-none text-mint/[0.07]"
          style={{ fontSize: '13rem', letterSpacing: '-0.05em' }}
        >
          {dato.anio}
        </span>
      )}

      <div className="relative grid gap-8 p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="label-mono text-mint">{dato.kicker}</span>
            {dato.categoria && (
              <span className="border border-cream/25 px-2.5 py-1 label-mono text-cream/70">
                {dato.categoria}
              </span>
            )}
          </div>

          <h3
            className="mt-5 font-brand font-extrabold leading-[1.05] tracking-brand text-cream"
            style={{ fontSize: 'clamp(24px, 3.4vw, 40px)' }}
          >
            {dato.titular}
          </h3>

          {dato.contexto && (
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream/65">{dato.contexto}</p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
            {dato.fechaHistorica && (
              <span className="label-mono text-cream/45">{dato.fechaHistorica}</span>
            )}
            <span className="inline-flex items-center gap-2 label-mono text-cream/45">
              <TrackIcon size={13} />
              vía {dato.fuente}
            </span>
          </div>
        </div>

        {/* Valor destacado, si lo hay */}
        {dato.destacado && (
          <div className="border-t border-cream/15 pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
            <div
              className="font-brand font-extrabold leading-none tracking-brand text-mint"
              style={{ fontSize: 'clamp(52px, 8vw, 92px)' }}
            >
              {dato.destacado}
            </div>
            {dato.destacadoLabel && (
              <div className="mt-3 label-mono text-cream/55">{dato.destacadoLabel}</div>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function TrackIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      <g fill="none" strokeLinejoin="round">
        <rect x="10" y="18" width="80" height="64" rx="32" stroke="currentColor" strokeWidth="4" />
        <rect x="20" y="28" width="60" height="44" rx="22" stroke="currentColor" strokeWidth="4" />
        <rect x="30" y="38" width="40" height="24" rx="12" stroke="currentColor" strokeWidth="4.4" />
      </g>
    </svg>
  )
}
