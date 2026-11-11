'use client'

// Ficha compacta de un atleta con sus mejores marcas (Mundo Atletismo) y, a
// petición, la ficha completa incrustada con la skin «lane». Se usa al pulsar
// un fichaje del directo (discreta) y en las tarjetas del tablón.

import { useEffect, useState } from 'react'
import { cargarFicha, ENTORNO, type Ficha } from '@/lib/fichajes/ficha'
import { perfilLane, perfilMA } from '@/lib/fichajes/types'

export function FichaAtleta({
  nombre, club, perfilUrl, discreta = false,
}: { nombre: string; club?: string | null; perfilUrl?: string | null; discreta?: boolean }) {
  const [ficha, setFicha] = useState<Ficha | null | undefined>(undefined)
  const [completa, setCompleta] = useState(false)

  useEffect(() => {
    let vivo = true
    cargarFicha(nombre, club).then((f) => { if (vivo) setFicha(f) })
    return () => { vivo = false }
  }, [nombre, club])

  const embed = perfilLane(ficha?.urlEmbed) ?? perfilLane(perfilUrl) ?? perfilMA(nombre, club)
  const mejores = ficha?.mejores ?? []
  const sinDatos = ficha === null || ficha?.encontrado === false

  return (
    <div className={discreta ? 'mt-3 border-t border-dashed border-ink/15 pt-3' : ''}>
      {ficha === undefined && (
        <div className="space-y-1.5" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-4 w-2/3 animate-pulse bg-ink/[0.06]" />)}
        </div>
      )}

      {ficha?.encontrado && (
        <>
          <p className="label-mono text-[0.55rem] text-ink/40">
            mejores marcas · mundo atletismo{ficha.categoria ? ` · ${ficha.categoria.toLowerCase()}` : ''}
            {ficha.totalMarcas ? ` · ${ficha.totalMarcas} marcas` : ''}
          </p>
          {ficha.menor ? (
            <p className="mt-1 text-[0.8rem] text-ink/50">Atleta menor de edad: sus marcas solo se ven en su ficha.</p>
          ) : mejores.length > 0 ? (
            <ul className={`mt-1.5 grid gap-x-4 gap-y-0.5 ${discreta ? 'sm:grid-cols-2' : ''}`}>
              {mejores.slice(0, discreta ? 6 : 8).map((m) => (
                <li key={`${m.prueba}|${m.pista}`} className="flex items-baseline gap-2 text-[0.8rem]">
                  <span className="min-w-0 flex-1 truncate text-ink/60">
                    {m.prueba} <span className="text-ink/30">· {ENTORNO[m.pista] ?? m.pista}</span>
                  </span>
                  <span className="font-mono tabular-nums font-semibold text-ink">{m.marca}</span>
                  <span className="w-9 text-right font-mono text-[0.68rem] tabular-nums text-ink/35">{m.fecha?.slice(0, 4)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {sinDatos && !discreta && (
        <p className="text-[0.8rem] text-ink/45">Sin marcas disponibles ahora mismo.</p>
      )}

      {embed && (
        <button type="button" onClick={() => setCompleta((v) => !v)}
          className="mt-2 label-mono text-[0.55rem] text-ink/45 underline decoration-ink/20 underline-offset-2 hover:text-ink">
          {completa ? 'ocultar ficha' : 'ficha completa ↓'}
        </button>
      )}
      {completa && embed && (
        <div className="mt-2 border border-ink/[0.12]">
          <iframe src={embed} title={`Ficha de ${nombre} en Mundo Atletismo`} loading="lazy" className="block h-[480px] w-full" />
          <a href={embed.replace('/embed/', '/')} target="_blank" rel="noopener noreferrer"
            className="block px-3 py-1.5 text-right label-mono text-[0.52rem] text-ink/40 underline">
            abrir en mundoatletismo.es ↗
          </a>
        </div>
      )}
    </div>
  )
}
