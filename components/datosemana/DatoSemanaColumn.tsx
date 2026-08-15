'use client'

// Columna fija "El dato de la semana" para la web pública. Descarga el CSV de
// /public/dato-semana.csv, elige el dato de la semana en curso (visible toda la
// semana lun–dom) y lo pinta en la estética editorial de lanedata.
//
// Tratamiento deliberadamente ligero: es una columna recurrente, no un titular.
// Fondo crema con borde recto (reserva la tinta para el hero del artículo), el
// año como textura recortada y la menta sólo como acento en el dato destacado.
// Se adapta a cualquier tipo de dato: el valor grande sólo aparece si existe.

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
    return <div className="border border-ink/[0.14] bg-cream/50 h-[160px] animate-pulse" aria-hidden="true" />
  }
  if (state === 'empty' || !dato) return null

  return (
    <article className="relative overflow-hidden border border-ink/[0.14] bg-cream/50">
      <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:gap-10">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="label-mono text-ink/55">{dato.kicker}</span>
            {dato.categoria && (
              <span className="border border-ink/20 px-2 py-0.5 label-mono text-ink/55">{dato.categoria}</span>
            )}
          </div>

          <h3
            className="mt-3.5 font-brand font-extrabold leading-[1.08] tracking-brand text-ink"
            style={{ fontSize: 'clamp(20px, 2.6vw, 30px)' }}
          >
            {dato.titular}
          </h3>

          {dato.contexto && (
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/60">{dato.contexto}</p>
          )}

          {(dato.fechaHistorica || dato.fuente) && (
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
              {dato.fechaHistorica && <span className="label-mono text-ink/40">{dato.fechaHistorica}</span>}
              {dato.fuente && (
                <span className="inline-flex items-center gap-1.5 label-mono text-ink/40">
                  <TrackIcon size={12} />
                  vía {dato.fuente}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Dato destacado: único acento menta, compacto y sin desbordar */}
        {dato.destacado && (
          <div className="shrink-0 self-start bg-mint/25 px-5 py-4 md:self-auto md:text-right">
            <div
              className="font-brand font-extrabold leading-none tracking-brand text-ink whitespace-nowrap"
              style={{ fontSize: 'clamp(38px, 5vw, 58px)' }}
            >
              {dato.destacado}
            </div>
            {dato.destacadoLabel && (
              <div className="mt-2 label-mono text-ink/60">{dato.destacadoLabel}</div>
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
