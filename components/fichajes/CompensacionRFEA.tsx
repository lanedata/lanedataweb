'use client'

// Etiqueta «compensación X €» si el atleta figura en la circular de la RFEA.
// Si no figura, no pinta nada.

import { useEffect, useState } from 'react'
import { compensacionDe, euros, type Compensacion } from '@/lib/fichajes/compensaciones'

export function CompensacionRFEA({ nombre, detalle = false }: { nombre: string; detalle?: boolean }) {
  const [c, setC] = useState<Compensacion | null>(null)

  useEffect(() => {
    let vivo = true
    compensacionDe(nombre).then((r) => { if (vivo) setC(r) })
    return () => { vivo = false }
  }, [nombre])

  if (!c) return null
  const titulo = `Compensación RFEA si cambia de club en 2027: ${euros(c.euros)} para ${c.club} · ${c.tipo}${c.temporada ? ` (${c.temporada})` : ''} · circular ${c.circular}`

  if (detalle) {
    return (
      <p className="mt-2 border-l-2 border-ink/40 pl-2 text-[0.78rem] text-ink/60">
        <span className="font-mono font-semibold tabular-nums text-ink">{euros(c.euros)}</span> de compensación para {c.club}
        <span className="text-ink/40"> · {c.tipo} · circular RFEA {c.circular}</span>
      </p>
    )
  }
  return (
    <span title={titulo} className="border border-ink/25 bg-ink/[0.04] px-1.5 py-0.5 label-mono text-[0.55rem] text-ink/70">
      compensación {euros(c.euros)}
    </span>
  )
}
